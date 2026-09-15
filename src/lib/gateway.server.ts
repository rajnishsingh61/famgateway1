import { decryptSecret } from "./crypto.server";
import { fetchRecentMessages, markSeen, parsePaymentEmail } from "./imap.server";

export function buildOrderId(): string {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `ZG${Date.now().toString(36).toUpperCase()}${rand}`;
}

export function buildUpiUri(upiId: string, name: string, amount: number, note: string): string {
  const params = new URLSearchParams({ pa: upiId, pn: name || "Nano Pay Merchant", am: amount.toFixed(2), cu: "INR", tn: note });
  return `upi://pay?${params.toString()}`;
}

type AdminClient = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];

export async function deliverWebhook(admin: AdminClient, params: { userId: string; orderId: string; url: string | null | undefined; payload: Record<string, unknown> }) {
  if (!params.url) return;
  let statusCode: number | null = null;
  let ok = false;
  let snippet = "";
  let errorMessage: string | null = null;
  const startedAt = Date.now();
  try {
    const res = await fetch(params.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-NanoPay-Event": "payment.success" },
      body: JSON.stringify(params.payload),
    });
    statusCode = res.status;
    ok = res.ok;
    snippet = (await res.text()).slice(0, 300);
    if (!ok) errorMessage = `Endpoint responded with HTTP ${res.status}`;
  } catch (err) {
    errorMessage = err instanceof Error ? err.message : "Delivery failed";
    snippet = errorMessage;
  }
  await admin.from("webhook_logs").insert({
    user_id: params.userId,
    order_id: params.orderId,
    url: params.url,
    status_code: statusCode,
    ok,
    response_snippet: snippet,
    event: typeof params.payload.event === "string" ? params.payload.event : "payment.success",
    payload: params.payload as never,
    error_message: errorMessage,
    duration_ms: Date.now() - startedAt,
    amount: typeof params.payload.amount === "number" ? params.payload.amount : null,
  });
}

export type VerifyResult = { merchantsScanned: number; emailsScanned: number; ordersMarkedPaid: number; errors: string[] };

export async function runVerifier(userId?: string): Promise<VerifyResult> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const result: VerifyResult = { merchantsScanned: 0, emailsScanned: 0, ordersMarkedPaid: 0, errors: [] };
  const now = new Date().toISOString();

  let query = supabaseAdmin.from("merchant_settings").select("user_id, fampay_email, app_password_enc, webhook_url").eq("connected", true);
  if (userId) query = query.eq("user_id", userId);
  const { data: merchants, error } = await query;
  if (error) throw new Error(error.message);

  await supabaseAdmin.from("orders").update({ status: "FAILED" }).eq("status", "PENDING").lt("expires_at", now);

  for (const merchant of merchants ?? []) {
    if (!merchant.fampay_email || !merchant.app_password_enc) continue;
    result.merchantsScanned += 1;
    try {
      const password = decryptSecret(merchant.app_password_enc);
      const messages = await fetchRecentMessages(merchant.fampay_email, password, 25);
      result.emailsScanned += messages.length;

      const { data: pending } = await supabaseAdmin
        .from("orders")
        .select("id, order_id, amount, user_id, customer_email, expires_at")
        .eq("user_id", merchant.user_id)
        .eq("status", "PENDING")
        .gte("expires_at", now)
        .order("created_at", { ascending: true });

      const consumed: number[] = [];
      for (const msg of messages) {
        if (consumed.includes(msg.seq)) continue;
        const parsed = parsePaymentEmail(msg.body);
        if (!parsed.utr || parsed.amount === null || !parsed.purpose) continue;

        // The UPI note/purpose is the generated order ID. Amount alone is never enough.
        const match = (pending ?? []).find(
          (order) => order.order_id === parsed.purpose && Math.abs(Number(order.amount) - parsed.amount!) < 0.01,
        );
        if (!match) continue;

        // Idempotency: never reuse a UTR that already settled another order.
        const { data: existingUtr } = await supabaseAdmin.from("orders").select("id").eq("utr", parsed.utr).neq("id", match.id).maybeSingle();
        if (existingUtr) continue;

        const { data: updated, error: updateError } = await supabaseAdmin
          .from("orders")
          .update({ status: "SUCCESS", utr: parsed.utr, paid_at: new Date().toISOString() })
          .eq("id", match.id)
          .eq("status", "PENDING")
          .select("id")
          .maybeSingle();
        if (updateError) {
          result.errors.push(updateError.message);
          continue;
        }
        if (!updated) continue;

        consumed.push(msg.seq);
        result.ordersMarkedPaid += 1;
        const idx = pending?.findIndex((order) => order.id === match.id) ?? -1;
        if (idx >= 0) pending!.splice(idx, 1);

        const origin = process.env.APP_BASE_URL?.replace(/\/$/, "") || "";
        if (match.customer_email) {
          const { sendBrevoEmail, paymentSuccessEmail } = await import("./brevo.server");
          const mail = paymentSuccessEmail(match.order_id, Number(match.amount), parsed.utr, `${origin}/pay/${match.order_id}`);
          const mailResult = await sendBrevoEmail({ to: match.customer_email, subject: mail.subject, html: mail.html, text: mail.text, tags: ["payment-success"] });
          if (!mailResult.sent && mailResult.error !== "Brevo is not configured") result.errors.push(`Brevo: ${mailResult.error}`);
        }

        await deliverWebhook(supabaseAdmin, {
          userId: merchant.user_id,
          orderId: match.order_id,
          url: merchant.webhook_url,
          payload: { event: "payment.success", order_id: match.order_id, amount: Number(match.amount), utr: parsed.utr, status: "SUCCESS", timestamp: new Date().toISOString() },
        });
      }
      if (consumed.length) await markSeen(merchant.fampay_email, password, consumed);
      await supabaseAdmin.from("merchant_settings").update({ last_verified_at: new Date().toISOString(), last_error: null }).eq("user_id", merchant.user_id);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown verifier error";
      result.errors.push(message);
      await supabaseAdmin.from("merchant_settings").update({ last_error: message, last_verified_at: new Date().toISOString() }).eq("user_id", merchant.user_id);
    }
  }
  return result;
}
