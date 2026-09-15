import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-KEY",
  "Content-Type": "application/json",
};

const bodySchema = z.object({
  amount: z.coerce.number().positive("amount must be greater than 0").max(200000),
  customer_email: z.string().trim().email().max(255).optional().nullable(),
  note: z.string().trim().max(120).optional().nullable(),
  expires_in_minutes: z.coerce.number().int().min(1).max(60).optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export const Route = createFileRoute("/api/public/v1/create-order")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      POST: async ({ request }) => {
        const apiKey = request.headers.get("x-api-key");
        if (!apiKey) return json({ error: "Missing X-API-KEY header" }, 401);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { buildOrderId, buildUpiUri } = await import("@/lib/gateway.server");

        const { data: key } = await supabaseAdmin
          .from("api_keys")
          .select("user_id, revoked")
          .eq("secret_key", apiKey)
          .maybeSingle();
        if (!key || key.revoked) return json({ error: "Invalid or revoked API key" }, 401);

        let parsed;
        try {
          parsed = bodySchema.parse(await request.json());
        } catch (err) {
          const message = err instanceof z.ZodError ? err.issues[0]?.message : "Invalid JSON body";
          return json({ error: message ?? "Invalid request body" }, 400);
        }

        const [{ data: settings }, { data: profile }] = await Promise.all([
          supabaseAdmin.from("merchant_settings").select("upi_id").eq("user_id", key.user_id).maybeSingle(),
          supabaseAdmin.from("profiles").select("business_name").eq("id", key.user_id).maybeSingle(),
        ]);
        if (!settings?.upi_id) return json({ error: "Merchant has not configured a UPI ID yet" }, 409);

        const orderId = buildOrderId();
        const expiresAt = new Date(Date.now() + (parsed.expires_in_minutes ?? 5) * 60_000).toISOString();

        const { error } = await supabaseAdmin.from("orders").insert({
          order_id: orderId,
          user_id: key.user_id,
          amount: parsed.amount,
          customer_email: parsed.customer_email ?? null,
          note: parsed.note ?? null,
          expires_at: expiresAt,
        });
        if (error) return json({ error: error.message }, 500);

        const origin = new URL(request.url).origin;
        if (parsed.customer_email) {
          const { sendBrevoEmail, orderCreatedEmail } = await import("@/lib/brevo.server");
          const mail = orderCreatedEmail(orderId, parsed.amount, `${origin}/pay/${orderId}`, expiresAt);
          const mailResult = await sendBrevoEmail({ to: parsed.customer_email, subject: mail.subject, html: mail.html, text: mail.text, tags: ["order-created"] });
          if (!mailResult.sent && mailResult.error !== "Brevo is not configured") {
            console.error("Brevo order email failed", mailResult.error);
          }
        }
        return json({
          order_id: orderId,
          amount: parsed.amount,
          currency: "INR",
          status: "PENDING",
          payment_url: `${origin}/api/payment/${orderId}`,
          checkout_url: `${origin}/pay/${orderId}`,
          verify_url: `${origin}/api/payment/${orderId}?format=json`,
          upi_uri: buildUpiUri(
            settings.upi_id,
            profile?.business_name || "ZapGateway Merchant",
            parsed.amount,
            orderId,
          ),
          qr_code: `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
            buildUpiUri(
              settings.upi_id,
              profile?.business_name || "ZapGateway Merchant",
              parsed.amount,
              orderId,
            ),
          )}`,
          expires_at: expiresAt,
        });
      },
    },
  },
});
