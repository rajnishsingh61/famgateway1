import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const orderIdSchema = z.object({ orderId: z.string().trim().min(3).max(64) });

export type PublicOrder = {
  orderId: string;
  amount: number;
  status: "PENDING" | "SUCCESS" | "FAILED";
  utr: string | null;
  note: string | null;
  expiresAt: string;
  merchantName: string;
  upiId: string | null;
  upiUri: string | null;
};

export const getPublicOrder = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => orderIdSchema.parse(data))
  .handler(async ({ data }): Promise<PublicOrder | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { buildUpiUri } = await import("@/lib/gateway.server");

    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("order_id, amount, status, utr, note, expires_at, user_id")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (!order) return null;

    const [{ data: settings }, { data: profile }] = await Promise.all([
      supabaseAdmin.from("merchant_settings").select("upi_id").eq("user_id", order.user_id).maybeSingle(),
      supabaseAdmin.from("profiles").select("business_name").eq("id", order.user_id).maybeSingle(),
    ]);

    const merchantName = profile?.business_name || "Nano Pay Merchant";
    const amount = Number(order.amount);

    return {
      orderId: order.order_id,
      amount,
      status: order.status as PublicOrder["status"],
      utr: order.utr,
      note: order.note,
      expiresAt: order.expires_at,
      merchantName,
      upiId: settings?.upi_id ?? null,
      upiUri: settings?.upi_id ? buildUpiUri(settings.upi_id, merchantName, amount, order.order_id) : null,
    };
  });

export const getOrderStatus = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => orderIdSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: order } = await supabaseAdmin
      .from("orders")
      .select("order_id, status, utr, expires_at")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (!order) return { status: "NOT_FOUND" as const, utr: null };

    if (order.status === "PENDING" && new Date(order.expires_at).getTime() < Date.now()) {
      await supabaseAdmin.from("orders").update({ status: "FAILED" }).eq("order_id", order.order_id);
      return { status: "FAILED" as const, utr: null };
    }
    return { status: order.status as "PENDING" | "SUCCESS" | "FAILED", utr: order.utr };
  });

/** Customer-submitted UTR — recorded for the merchant to reconcile. */
export const submitUtr = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        orderId: z.string().trim().min(3).max(64),
        utr: z.string().trim().regex(/^\d{12}$/, "UTR must be exactly 12 digits"),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("orders")
      .update({ payer_upi: data.utr })
      .eq("order_id", data.orderId)
      .eq("status", "PENDING");
    if (error) throw new Error(error.message);
    return { ok: true };
  });
