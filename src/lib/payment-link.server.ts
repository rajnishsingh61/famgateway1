/** Shared handler for the external payment/verification link: /api/payment/:orderId */

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Content-Type": "application/json",
};

export function corsPreflight() {
  return new Response(null, { status: 204, headers: CORS });
}

/**
 * Browsers (Accept: text/html) get redirected to the hosted checkout page.
 * Bots / apps (Accept: application/json or ?format=json) get the live status JSON.
 * No API key required — the order id itself is the opaque reference.
 */
export async function handlePaymentLink(request: Request, orderId: string) {
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: CORS });

  if (!/^[\w-]{3,64}$/.test(orderId)) return json({ error: "Invalid order id" }, 400);

  const url = new URL(request.url);
  const wantsJson =
    url.searchParams.get("format") === "json" ||
    (request.headers.get("accept") ?? "").includes("application/json");

  if (!wantsJson) {
    return new Response(null, { status: 302, headers: { Location: `/pay/${orderId}` } });
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: order } = await supabaseAdmin
    .from("orders")
    .select("order_id, amount, status, utr, expires_at, paid_at")
    .eq("order_id", orderId)
    .maybeSingle();
  if (!order) return json({ error: "Order not found" }, 404);

  let status = order.status;
  if (status === "PENDING" && new Date(order.expires_at).getTime() < Date.now()) {
    status = "FAILED";
    await supabaseAdmin.from("orders").update({ status }).eq("order_id", order.order_id);
  }

  return json({
    order_id: order.order_id,
    amount: Number(order.amount),
    currency: "INR",
    status,
    utr: order.utr,
    paid_at: order.paid_at,
    expires_at: order.expires_at,
    payment_url: `${url.origin}/pay/${order.order_id}`,
  });
}
