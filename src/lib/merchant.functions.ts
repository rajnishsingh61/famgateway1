import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const credentialsSchema = z.object({
  projectName: z.string().trim().min(1, "Project name is required").max(80),
  fampayEmail: z.string().trim().email("Enter a valid Gmail address").max(255),
  appPassword: z
    .string()
    .trim()
    .transform((v) => v.replace(/\s+/g, ""))
    .refine((v) => v === "" || v.length === 16, "App Password must be 16 characters"),
  upiId: z
    .string()
    .trim()
    .max(120)
    .regex(/^[\w.\-]{2,}@[a-zA-Z]{2,}$/, "Enter a valid UPI ID like name@fam"),
  webhookUrl: z
    .string()
    .trim()
    .max(500)
    .refine((v) => v === "" || /^https?:\/\/.+/.test(v), "Webhook URL must start with http(s)://"),
});

export const savePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => credentialsSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { encryptSecret } = await import("@/lib/crypto.server");
    const { testImapLogin } = await import("@/lib/imap.server");

    const { data: existing } = await context.supabase
      .from("merchant_settings")
      .select("app_password_enc")
      .eq("user_id", context.userId)
      .maybeSingle();

    let enc = existing?.app_password_enc ?? null;
    let connected = false;
    let lastError: string | null = null;

    if (data.appPassword) enc = encryptSecret(data.appPassword);

    if (enc) {
      const { decryptSecret } = await import("@/lib/crypto.server");
      try {
        await testImapLogin(data.fampayEmail, decryptSecret(enc));
        connected = true;
      } catch (err) {
        lastError = err instanceof Error ? err.message : "IMAP verification failed";
      }
    } else {
      lastError = "No App Password saved yet";
    }

    const { error } = await context.supabase.from("merchant_settings").upsert(
      {
        user_id: context.userId,
        project_name: data.projectName,
        fampay_email: data.fampayEmail,
        app_password_enc: enc,
        upi_id: data.upiId,
        webhook_url: data.webhookUrl || null,
        connected,
        last_error: lastError,
        last_verified_at: connected ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
    if (error) {
      if (error.code === "23505" || /merchant_settings_upi_id_unique/.test(error.message)) {
        throw new Error("That Fam UPI ID is already connected to another Nano Pay account.");
      }
      throw new Error(error.message);
    }

    return { connected, error: lastError };
  });

export const testImapConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { decryptSecret } = await import("@/lib/crypto.server");
    const { testImapLogin } = await import("@/lib/imap.server");

    const { data: settings } = await context.supabase
      .from("merchant_settings")
      .select("fampay_email, app_password_enc")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!settings?.fampay_email || !settings.app_password_enc) {
      return { connected: false, error: "Save your Gmail address and App Password first." };
    }

    try {
      await testImapLogin(settings.fampay_email, decryptSecret(settings.app_password_enc));
      await context.supabase
        .from("merchant_settings")
        .update({ connected: true, last_error: null, last_verified_at: new Date().toISOString() })
        .eq("user_id", context.userId);
      return { connected: true, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "IMAP verification failed";
      await context.supabase
        .from("merchant_settings")
        .update({ connected: false, last_error: message })
        .eq("user_id", context.userId);
      return { connected: false, error: message };
    }
  });

export const scanInboxNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { runVerifier } = await import("@/lib/gateway.server");
    return runVerifier(context.userId);
  });

/** Single API key — format: PAYFLUX_XXXXXXX_RAJNISH_XXXXXXXXXX */
export const createApiKeyPair = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ label: z.string().trim().min(1).max(60) }).parse(data))
  .handler(async ({ data, context }) => {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const rand = (n: number) =>
      Array.from(crypto.getRandomValues(new Uint8Array(n)))
        .map((b) => alphabet[b % alphabet.length])
        .join("");

    const apiKey = `PAYFLUX_${rand(7)}_RAJNISH_${rand(10)}`;

    const { data: row, error } = await context.supabase
      .from("api_keys")
      .insert({
        user_id: context.userId,
        label: data.label,
        public_key: apiKey,
        secret_key: apiKey,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const resendWebhook = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ orderId: z.string().trim().min(3).max(64) }).parse(data))
  .handler(async ({ data, context }) => {
    const { deliverWebhook } = await import("@/lib/gateway.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: order } = await context.supabase
      .from("orders")
      .select("order_id, amount, utr, status")
      .eq("order_id", data.orderId)
      .maybeSingle();
    if (!order) throw new Error("Order not found");

    const { data: settings } = await context.supabase
      .from("merchant_settings")
      .select("webhook_url")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!settings?.webhook_url) throw new Error("No webhook URL configured");

    await deliverWebhook(supabaseAdmin, {
      userId: context.userId,
      orderId: order.order_id,
      url: settings.webhook_url,
      payload: {
        event: "payment.success",
        order_id: order.order_id,
        amount: Number(order.amount),
        utr: order.utr,
        status: order.status,
        timestamp: new Date().toISOString(),
        replay: true,
      },
    });
    return { ok: true };
  });

/** Merchant: disconnect the mailbox + Fam UPI ID from this account so it can be reused elsewhere. */
export const disconnectUpi = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { error } = await context.supabase
      .from("merchant_settings")
      .update({
        upi_id: null,
        app_password_enc: null,
        connected: false,
        last_error: "Disconnected by merchant",
        last_verified_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
