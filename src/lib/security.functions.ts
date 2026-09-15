import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Recovery email used as a backup channel for account recovery. */
export const getRecoveryEmail = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase
      .from("merchant_settings")
      .select("recovery_email")
      .eq("user_id", context.userId)
      .maybeSingle();
    return { recoveryEmail: data?.recovery_email ?? "" };
  });

export const saveRecoveryEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        recoveryEmail: z
          .string()
          .trim()
          .max(255)
          .refine((v) => v === "" || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v), "Enter a valid email"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("merchant_settings").upsert(
      { user_id: context.userId, recovery_email: data.recoveryEmail || null },
      { onConflict: "user_id" },
    );
    if (error) throw new Error(error.message);
    return { ok: true };
  });
