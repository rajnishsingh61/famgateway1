import { createFileRoute } from "@tanstack/react-router";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-API-KEY",
  "Content-Type": "application/json",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: CORS });
}

export const Route = createFileRoute("/api/public/v1/check-status/$orderId")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async ({ request, params }) => {
        const apiKey = request.headers.get("x-api-key");
        if (!apiKey) return json({ error: "Missing X-API-KEY header" }, 401);
        if (!/^[\w-]{3,64}$/.test(params.orderId)) return json({ error: "Invalid order id" }, 400);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: key } = await supabaseAdmin
          .from("api_keys")
          .select("user_id, revoked")
          .eq("secret_key", apiKey)
          .maybeSingle();
        if (!key || key.revoked) return json({ error: "Invalid or revoked API key" }, 401);

        const { data: order } = await supabaseAdmin
          .from("orders")
          .select("order_id, amount, status, utr, expires_at, paid_at, user_id")
          .eq("order_id", params.orderId)
          .eq("user_id", key.user_id)
          .maybeSingle();
        if (!order) return json({ error: "Order not found" }, 404);

        let status = order.status;
        if (status === "PENDING" && new Date(order.expires_at).getTime() >= Date.now()) {
          // Telegram bots commonly poll this endpoint. Throttle mailbox scans to one per 10s/user.
          const { data: settings } = await supabaseAdmin
            .from("merchant_settings")
            .select("last_verified_at")
            .eq("user_id", order.user_id)
            .maybeSingle();
          const last = settings?.last_verified_at ? new Date(settings.last_verified_at).getTime() : 0;
          if (Date.now() - last >= 10_000) {
            const { runVerifier } = await import("@/lib/gateway.server");
            await runVerifier(order.user_id);
          }
          const { data: refreshed } = await supabaseAdmin
            .from("orders")
            .select("status, utr, paid_at")
            .eq("order_id", params.orderId)
            .maybeSingle();
          if (refreshed) {
            status = refreshed.status;
            order.utr = refreshed.utr;
            order.paid_at = refreshed.paid_at;
          }
        }
        if (status === "PENDING" && new Date(order.expires_at).getTime() < Date.now()) {
          status = "FAILED";
          await supabaseAdmin.from("orders").update({ status }).eq("order_id", order.order_id);
        }

        return json({
          order_id: order.order_id,
          amount: Number(order.amount),
          status,
          utr: order.utr,
          paid_at: order.paid_at,
          expires_at: order.expires_at,
        });
      },
    },
  },
});
