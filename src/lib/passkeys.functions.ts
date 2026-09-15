import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function rpIdFromOrigin(origin: string) {
  try {
    return new URL(origin).hostname;
  } catch {
    return "localhost";
  }
}

const originSchema = z.object({ origin: z.string().url() });

/** Begin registering a new passkey for the signed-in merchant. */
export const startPasskeyRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => originSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { generateRegistrationOptions } = await import("@simplewebauthn/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rpID = rpIdFromOrigin(data.origin);
    const email = (context.claims as { email?: string })?.email ?? "merchant";

    const { data: existing } = await supabaseAdmin
      .from("passkey_credentials")
      .select("credential_id, transports")
      .eq("user_id", context.userId);

    const options = await generateRegistrationOptions({
      rpName: "ZapGateway",
      rpID,
      userName: email,
      userDisplayName: email,
      attestationType: "none",
      excludeCredentials: (existing ?? []).map((c) =>
        c.transports ? { id: c.credential_id, transports: c.transports } : { id: c.credential_id },
      ),
      authenticatorSelection: { residentKey: "preferred", userVerification: "preferred" },
    });

    await supabaseAdmin.from("webauthn_challenges").insert({
      challenge: options.challenge,
      user_id: context.userId,
      kind: "register",
    });

    return { optionsJson: JSON.stringify(options) };
  });

const finishRegSchema = z.object({
  origin: z.string().url(),
  label: z.string().trim().max(60).optional(),
  response: z.any(),
});

/** Verify and persist a newly created passkey. */
export const finishPasskeyRegistration = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => finishRegSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { verifyRegistrationResponse } = await import("@simplewebauthn/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rpID = rpIdFromOrigin(data.origin);
    const { data: row } = await supabaseAdmin
      .from("webauthn_challenges")
      .select("id, challenge")
      .eq("user_id", context.userId)
      .eq("kind", "register")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) throw new Error("Registration expired — please try again");

    const verification = await verifyRegistrationResponse({
      response: data.response,
      expectedChallenge: row.challenge,
      expectedOrigin: data.origin,
      expectedRPID: rpID,
    });
    await supabaseAdmin.from("webauthn_challenges").delete().eq("id", row.id);

    if (!verification.verified || !verification.registrationInfo) {
      throw new Error("Passkey could not be verified");
    }

    const cred = verification.registrationInfo.credential;
    const publicKey = Buffer.from(cred.publicKey).toString("base64");

    const { error } = await supabaseAdmin.from("passkey_credentials").insert({
      user_id: context.userId,
      credential_id: cred.id,
      public_key: publicKey,
      counter: cred.counter,
      transports: cred.transports ?? null,
      device_label: data.label || "Passkey",
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** List the signed-in merchant's registered passkeys. */
export const listPasskeys = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("passkey_credentials")
      .select("id, device_label, created_at, last_used_at")
      .eq("user_id", context.userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** Remove a passkey from the signed-in merchant's account. */
export const deletePasskey = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("passkey_credentials")
      .delete()
      .eq("id", data.id)
      .eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const loginStartSchema = z.object({ origin: z.string().url(), email: z.string().trim().email() });

/** Begin passkey sign-in for an email address. */
export const startPasskeyLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginStartSchema.parse(data))
  .handler(async ({ data }) => {
    const { generateAuthenticationOptions } = await import("@simplewebauthn/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const rpID = rpIdFromOrigin(data.origin);
    const options = await generateAuthenticationOptions({ rpID, userVerification: "preferred" });

    await supabaseAdmin.from("webauthn_challenges").insert({
      challenge: options.challenge,
      email: data.email.toLowerCase(),
      kind: "login",
    });

    return { optionsJson: JSON.stringify(options) };
  });

const loginFinishSchema = z.object({
  origin: z.string().url(),
  email: z.string().trim().email(),
  response: z.any(),
});

/**
 * Verify a passkey assertion and return a one-time email link token the
 * browser exchanges for a real session.
 */
export const finishPasskeyLogin = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => loginFinishSchema.parse(data))
  .handler(async ({ data }) => {
    const { verifyAuthenticationResponse } = await import("@simplewebauthn/server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();
    const rpID = rpIdFromOrigin(data.origin);

    const { data: row } = await supabaseAdmin
      .from("webauthn_challenges")
      .select("id, challenge")
      .eq("email", email)
      .eq("kind", "login")
      .gte("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!row) throw new Error("Sign-in request expired — please try again");

    const credentialId = String((data.response as { id?: string })?.id ?? "");
    const { data: cred } = await supabaseAdmin
      .from("passkey_credentials")
      .select("id, user_id, credential_id, public_key, counter, transports")
      .eq("credential_id", credentialId)
      .maybeSingle();
    if (!cred) throw new Error("This passkey is not registered");

    const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(cred.user_id);
    if (!userRes?.user || userRes.user.email?.toLowerCase() !== email) {
      throw new Error("This passkey does not belong to that email");
    }

    const verification = await verifyAuthenticationResponse({
      response: data.response,
      expectedChallenge: row.challenge,
      expectedOrigin: data.origin,
      expectedRPID: rpID,
      credential: {
        id: cred.credential_id,
        publicKey: new Uint8Array(Buffer.from(cred.public_key, "base64")),
        counter: Number(cred.counter),
        transports: (cred.transports ?? undefined) as never,
      },
    });
    await supabaseAdmin.from("webauthn_challenges").delete().eq("id", row.id);
    if (!verification.verified) throw new Error("Passkey verification failed");

    await supabaseAdmin
      .from("passkey_credentials")
      .update({
        counter: verification.authenticationInfo.newCounter,
        last_used_at: new Date().toISOString(),
      })
      .eq("id", cred.id);

    const { data: link, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
      type: "magiclink",
      email,
    });
    if (linkErr || !link?.properties?.hashed_token) {
      throw new Error(linkErr?.message ?? "Could not start the session");
    }

    return { tokenHash: link.properties.hashed_token, email };
  });
