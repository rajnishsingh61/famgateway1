import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { ArrowLeft, Eye, EyeOff, Fingerprint, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

import { finishPasskeyLogin, startPasskeyLogin } from "@/lib/passkeys.functions";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const title = "Sign in — ZapGateway Merchant Console";
const description = "Log in or create a ZapGateway merchant account to start accepting automated UPI payments.";

export const Route = createFileRoute("/auth")({
  validateSearch: z.object({ mode: z.enum(["login", "register"]).catch("login") }),
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

const registerSchema = z.object({
  businessName: z.string().trim().min(2, "Business name is too short").max(80),
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

function strengthOf(password: string) {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  const labels = ["Very weak", "Weak", "Fair", "Good", "Strong", "Excellent"];
  return { score, label: labels[score] ?? "Very weak" };
}

function AuthPage() {
  const { mode } = Route.useSearch();
  const navigate = useNavigate();
  const { session, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [show, setShow] = useState(false);
  const [businessName, setBusinessName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pendingConfirm, setPendingConfirm] = useState(false);
  const [mfa, setMfa] = useState<{ factorId: string; challengeId: string } | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const beginPasskey = useServerFn(startPasskeyLogin);
  const completePasskey = useServerFn(finishPasskeyLogin);

  /** If the account has a verified authenticator app, ask for the 6-digit code. */
  async function maybeRequireMfa() {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (!aal || aal.nextLevel !== "aal2" || aal.nextLevel === aal.currentLevel) return false;
    const { data: factors } = await supabase.auth.mfa.listFactors();
    const factor = factors?.totp?.find((f) => f.status === "verified");
    if (!factor) return false;
    const { data: challenge, error } = await supabase.auth.mfa.challenge({ factorId: factor.id });
    if (error || !challenge) throw error ?? new Error("Could not start two-factor check");
    setMfa({ factorId: factor.id, challengeId: challenge.id });
    return true;
  }

  async function onVerifyMfa(e: React.FormEvent) {
    e.preventDefault();
    if (!mfa) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.mfa.verify({
        factorId: mfa.factorId,
        challengeId: mfa.challengeId,
        code: mfaCode.trim(),
      });
      if (error) throw error;
      setMfa(null);
      setMfaCode("");
      toast.success("Signed in");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  async function onPasskeySignIn() {
    const target = email.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) {
      toast.error("Enter your account email first, then use your passkey.");
      return;
    }
    setBusy(true);
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser");
      const { optionsJson } = await beginPasskey({
        data: { origin: window.location.origin, email: target },
      });
      const response = await startAuthentication({ optionsJSON: JSON.parse(optionsJson) });
      const { tokenHash } = await completePasskey({
        data: { origin: window.location.origin, email: target, response },
      });
      const { error } = await supabase.auth.verifyOtp({ type: "magiclink", token_hash: tokenHash });
      if (error) throw error;
      toast.success("Signed in with your passkey");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Passkey sign-in failed");
    } finally {
      setBusy(false);
    }
  }


  const isRegister = mode === "register";
  const strength = strengthOf(password);

  useEffect(() => {
    if (!loading && session && !mfa) navigate({ to: "/dashboard", replace: true });
  }, [loading, session, navigate]);

  async function onForgotPassword() {
    const target = email.trim();
    if (!target || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(target)) {
      toast.error("Enter your account email first, then tap Forgot password.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(target, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Reset link sent — check your inbox.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send reset link");
    } finally {
      setBusy(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isRegister) {
        const parsed = registerSchema.safeParse({ businessName, email, password });
        if (!parsed.success) {
          toast.error(parsed.error.issues[0]?.message ?? "Please check your details");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { business_name: parsed.data.businessName },
          },
        });
        if (error) throw error;
        if (!data.session) {
          setPendingConfirm(true);
          toast.success("Account created — check your inbox to confirm your email.");
          return;
        }
        toast.success("Welcome to ZapGateway!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) throw error;
        if (await maybeRequireMfa()) return;
        toast.success("Signed in");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-12">
      <div className="grid-bg absolute inset-0 opacity-40" aria-hidden />
      <div className="absolute inset-x-0 top-0 h-96" style={{ background: "var(--gradient-glow)" }} aria-hidden />

      <div className="relative w-full max-w-md">
        <Link
          to="/"
          className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Back to home
        </Link>

        <div className="panel p-7">
          <Logo />
          <h1 className="mt-6 text-2xl font-bold">
            {isRegister ? "Create your merchant account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {isRegister
              ? "Start accepting automated UPI payments in minutes."
              : "Sign in to your ZapGateway console."}
          </p>

          <Tabs
            value={mode}
            onValueChange={(v) => navigate({ to: "/auth", search: { mode: v as "login" | "register" } })}
            className="mt-6"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Sign in</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
          </Tabs>

          {mfa ? (
            <form onSubmit={onVerifyMfa} className="mt-6 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="mfaCode">Two-factor code</Label>
                <Input
                  id="mfaCode"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="123456"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  className="text-center font-mono text-lg tracking-[0.4em]"
                />
                <p className="text-xs text-muted-foreground">
                  Open your authenticator app and enter the current 6-digit code.
                </p>
              </div>
              <Button type="submit" className="w-full" disabled={busy || mfaCode.length !== 6}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                Verify and continue
              </Button>
              <button
                type="button"
                className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-foreground"
                onClick={async () => {
                  setMfa(null);
                  setMfaCode("");
                  await supabase.auth.signOut();
                }}
              >
                Cancel
              </button>
            </form>
          ) : pendingConfirm ? (
            <div className="mt-6 rounded-lg border border-success/30 bg-success/10 p-4 text-sm">
              <p className="font-medium text-foreground">Confirm your email</p>
              <p className="mt-1 text-muted-foreground">
                We sent a confirmation link to <span className="font-mono">{email}</span>. Click it, then sign
                in.
              </p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="mt-6 space-y-4">
              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="businessName">Business name</Label>
                  <Input
                    id="businessName"
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Nova Digital Store"
                    maxLength={80}
                    autoComplete="organization"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  maxLength={255}
                  autoComplete="email"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={show ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    maxLength={72}
                    autoComplete={isRegister ? "new-password" : "current-password"}
                    required
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShow((s) => !s)}
                    aria-label={show ? "Hide password" : "Show password"}
                    className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {isRegister && password.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex gap-1">
                      {[0, 1, 2, 3, 4].map((i) => (
                        <span
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i < strength.score
                              ? strength.score <= 2
                                ? "bg-destructive"
                                : strength.score <= 3
                                  ? "bg-warning"
                                  : "bg-success"
                              : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">Strength: {strength.label}</p>
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full" disabled={busy}>
                {busy && <Loader2 className="size-4 animate-spin" />}
                {isRegister ? "Create account" : "Sign in"}
              </Button>

              {!isRegister && (
                <button
                  type="button"
                  onClick={onForgotPassword}
                  disabled={busy}
                  className="w-full text-center text-sm text-muted-foreground transition-colors hover:text-primary"
                >
                  Forgot password?
                </button>
              )}

              {!isRegister && (
                <>
                  <div className="flex items-center gap-3 pt-1">
                    <span className="h-px flex-1 bg-border" />
                    <span className="text-xs text-muted-foreground">or</span>
                    <span className="h-px flex-1 bg-border" />
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={busy}
                    onClick={onPasskeySignIn}
                  >
                    <Fingerprint className="size-4" /> Sign in with passkey
                  </Button>
                </>
              )}
            </form>
          )}

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree that ZapGateway may read payment notification emails from the mailbox you
            connect.
          </p>
        </div>
      </div>
    </div>
  );
}
