import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { PLANS, buildPlatformUpiUri } from "@/lib/plans";

const planSchema = z.object({ plan: z.enum(["premium", "pro"]) });

/** Current merchant's subscription + their subscription payment history. */
export const getMyBilling = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const [{ data: subscription }, { data: payments }] = await Promise.all([
      context.supabase.from("subscriptions").select("*").eq("user_id", context.userId).maybeSingle(),
      context.supabase
        .from("subscription_payments")
        .select("*")
        .eq("user_id", context.userId)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    return { subscription, payments: payments ?? [] };
  });

/** Creates a PENDING subscription payment with a real-amount UPI intent. */
export const startSubscriptionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => planSchema.parse(data))
  .handler(async ({ data, context }) => {
    const plan = PLANS[data.plan];
    const reference = `ZGSUB${Date.now().toString(36).toUpperCase()}`;
    const upiUri = buildPlatformUpiUri(plan.price, reference);

    const { data: row, error } = await context.supabase
      .from("subscription_payments")
      .insert({
        user_id: context.userId,
        plan: plan.id,
        amount: plan.price,
        reference,
        upi_uri: upiUri,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const submitSubscriptionUtr = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        utr: z
          .string()
          .trim()
          .regex(/^\d{10,14}$/, "UTR must be the 10-14 digit reference from your UPI app"),
        payerNote: z.string().trim().max(160).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("subscription_payments")
      .update({ utr: data.utr, payer_note: data.payerNote ?? null, status: "SUBMITTED" })
      .eq("id", data.paymentId)
      .eq("user_id", context.userId)
      .eq("status", "PENDING");
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const amIAdmin = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    return { isAdmin: !!data };
  });

/** Admin: platform-wide stats, merchants and subscription payment queue. */
export const adminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: payments }, { data: profiles }, { data: subs }, { data: settings }, { data: orders }] =
      await Promise.all([
        supabaseAdmin.from("subscription_payments").select("*").order("created_at", { ascending: false }).limit(200),
        supabaseAdmin.from("profiles").select("id, email, business_name, created_at"),
        supabaseAdmin.from("subscriptions").select("*"),
        supabaseAdmin.from("merchant_settings").select("user_id, upi_id, project_name, connected"),
        supabaseAdmin.from("orders").select("amount, status, created_at").order("created_at", { ascending: false }).limit(1000),
      ]);

    const subByUser = new Map((subs ?? []).map((s) => [s.user_id, s]));
    const setByUser = new Map((settings ?? []).map((s) => [s.user_id, s]));
    const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));

    const merchants = (profiles ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      businessName: p.business_name,
      createdAt: p.created_at,
      subscription: subByUser.get(p.id) ?? null,
      upiId: setByUser.get(p.id)?.upi_id ?? null,
      projectName: setByUser.get(p.id)?.project_name ?? null,
      connected: !!setByUser.get(p.id)?.connected,
    }));

    const queue = (payments ?? []).map((p) => ({
      ...p,
      email: profileById.get(p.user_id)?.email ?? null,
      businessName: profileById.get(p.user_id)?.business_name ?? null,
    }));

    const paidOrders = (orders ?? []).filter((o) => o.status === "SUCCESS");
    const mrr = merchants.reduce((sum, m) => {
      const s = m.subscription;
      if (s?.status !== "active") return sum;
      return sum + (s.plan === "pro" ? 199 : s.plan === "premium" ? 99 : 0);
    }, 0);

    return {
      stats: {
        merchants: merchants.length,
        activeSubs: merchants.filter((m) => m.subscription?.status === "active").length,
        trialing: merchants.filter((m) => m.subscription?.status === "trialing").length,
        pendingApprovals: queue.filter((p) => p.status !== "APPROVED" && p.status !== "REJECTED").length,
        mrr,
        gmv: paidOrders.reduce((s, o) => s + Number(o.amount), 0),
        orders: orders?.length ?? 0,
      },
      merchants,
      queue,
    };
  });

/** Admin: approve or reject a subscription payment. Approving activates the plan for 30 days. */
export const reviewSubscriptionPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        paymentId: z.string().uuid(),
        action: z.enum(["approve", "reject"]),
        note: z.string().trim().max(200).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: payment, error: readErr } = await supabaseAdmin
      .from("subscription_payments")
      .select("*")
      .eq("id", data.paymentId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!payment) throw new Error("Payment not found");

    const status = data.action === "approve" ? "APPROVED" : "REJECTED";
    const { error } = await supabaseAdmin
      .from("subscription_payments")
      .update({
        status,
        admin_note: data.note ?? null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: context.userId,
      })
      .eq("id", data.paymentId);
    if (error) throw new Error(error.message);

    if (data.action === "approve") {
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("current_period_end")
        .eq("user_id", payment.user_id)
        .maybeSingle();
      const base =
        sub?.current_period_end && new Date(sub.current_period_end) > new Date()
          ? new Date(sub.current_period_end)
          : new Date();
      base.setDate(base.getDate() + 30);

      const { error: subErr } = await supabaseAdmin.from("subscriptions").upsert(
        {
          user_id: payment.user_id,
          plan: payment.plan,
          status: "active",
          current_period_end: base.toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      if (subErr) throw new Error(subErr.message);
    }

    return { ok: true, status };
  });

/** Admin: manually settle a merchant order (marks it SUCCESS and fires the webhook). */
export const adminApproveOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z.object({ orderId: z.string().trim().min(3).max(64), utr: z.string().trim().max(20).optional() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { deliverWebhook } = await import("@/lib/gateway.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");

    await supabaseAdmin
      .from("orders")
      .update({ status: "SUCCESS", utr: data.utr || order.utr, paid_at: new Date().toISOString() })
      .eq("order_id", data.orderId);

    const { data: settings } = await supabaseAdmin
      .from("merchant_settings")
      .select("webhook_url")
      .eq("user_id", order.user_id)
      .maybeSingle();

    await deliverWebhook(supabaseAdmin, {
      userId: order.user_id,
      orderId: order.order_id,
      url: settings?.webhook_url,
      payload: {
        event: "payment.success",
        order_id: order.order_id,
        amount: Number(order.amount),
        utr: data.utr || order.utr,
        status: "SUCCESS",
        approved_by: "admin",
        timestamp: new Date().toISOString(),
      },
    });

    return { ok: true };
  });

/** Admin: release a merchant's Fam UPI ID + mailbox authorization (frees the UPI for another account). */
export const adminDisconnectUpi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { assertAdmin } = await import("@/lib/admin.server");
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin
      .from("merchant_settings")
      .update({
        upi_id: null,
        app_password_enc: null,
        connected: false,
        last_error: "Disconnected by ZapGateway admin",
        last_verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
