import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { startRegistration } from "@simplewebauthn/browser";
import { useEffect, useState } from "react";
import { Fingerprint, KeyRound, Loader2, Mail, ShieldCheck, Trash2 } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import {
  deletePasskey,
  finishPasskeyRegistration,
  listPasskeys,
  startPasskeyRegistration,
} from "@/lib/passkeys.functions";
import { getRecoveryEmail, saveRecoveryEmail } from "@/lib/security.functions";

export const Route = createFileRoute("/_authenticated/dashboard/security")({
  component: SecurityPage,
});

type Factor = { id: string; friendly_name?: string | undefined; status: string };

function SecurityPage() {
  const qc = useQueryClient();
  const fetchPasskeys = useServerFn(listPasskeys);
  const beginPasskey = useServerFn(startPasskeyRegistration);
  const completePasskey = useServerFn(finishPasskeyRegistration);
  const removePasskey = useServerFn(deletePasskey);
  const fetchRecovery = useServerFn(getRecoveryEmail);
  const storeRecovery = useServerFn(saveRecoveryEmail);

  const [factors, setFactors] = useState<Factor[]>([]);
  const [enrolling, setEnrolling] = useState<{ id: string; qr: string; secret: string } | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [recovery, setRecovery] = useState("");
  const [label, setLabel] = useState("");

  const { data: recoveryData } = useQuery({
    queryKey: ["recovery-email"],
    queryFn: () => fetchRecovery({ data: undefined }),
  });
  useEffect(() => {
    if (recoveryData) setRecovery(recoveryData.recoveryEmail);
  }, [recoveryData]);

  const { data: passkeys } = useQuery({
    queryKey: ["passkeys"],
    queryFn: () => fetchPasskeys({ data: undefined }),
  });

  async function refreshFactors() {
    const { data } = await supabase.auth.mfa.listFactors();
    setFactors((data?.totp ?? []) as Factor[]);
  }
  useEffect(() => {
    void refreshFactors();
  }, []);

  const verified = factors.filter((f) => f.status === "verified");

  async function onEnroll() {
    setBusy(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: `Authenticator ${Date.now().toString().slice(-4)}`,
      });
      if (error) throw error;
      const uri = data.totp.uri;
      const qr = await QRCode.toDataURL(uri, { width: 320, margin: 1 });
      setEnrolling({ id: data.id, qr, secret: data.totp.secret });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start enrollment");
    } finally {
      setBusy(false);
    }
  }

  async function onVerify() {
    if (!enrolling) return;
    setBusy(true);
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId: enrolling.id });
      if (chErr) throw chErr;
      const { error } = await supabase.auth.mfa.verify({
        factorId: enrolling.id,
        challengeId: ch.id,
        code: code.trim(),
      });
      if (error) throw error;
      toast.success("Two-step verification enabled");
      setEnrolling(null);
      setCode("");
      await refreshFactors();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid code");
    } finally {
      setBusy(false);
    }
  }

  async function onUnenroll(factorId: string) {
    if (!confirm("Turn off two-step verification for this authenticator?")) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId });
    if (error) toast.error(error.message);
    else {
      toast.success("Authenticator removed");
      await refreshFactors();
    }
  }

  const addPasskey = useMutation({
    mutationFn: async () => {
      const origin = window.location.origin;
      const { optionsJson } = await beginPasskey({ data: { origin } });
      const attestation = await startRegistration({ optionsJSON: JSON.parse(optionsJson) });
      await completePasskey({
        data: { origin, response: attestation, label: label.trim() || "Passkey" },
      });
    },
    onSuccess: () => {
      toast.success("Passkey added");
      setLabel("");
      qc.invalidateQueries({ queryKey: ["passkeys"] });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not add passkey"),
  });

  const saveRecovery = useMutation({
    mutationFn: () => storeRecovery({ data: { recoveryEmail: recovery.trim() } }),
    onSuccess: () => toast.success("Recovery email saved"),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not save"),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Security</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Protect your merchant console with two-step verification, a recovery email and passkeys.
        </p>
      </div>

      <section className="panel space-y-5 p-6">
        <div className="flex items-center gap-3">
          <ShieldCheck className="size-5 text-primary" />
          <div>
            <h2 className="font-semibold">Authenticator app (2FA)</h2>
            <p className="text-xs text-muted-foreground">
              Use Google Authenticator, Authy or 1Password to generate 6-digit codes.
            </p>
          </div>
          <Badge variant="outline" className="ml-auto">
            {verified.length ? "Enabled" : "Off"}
          </Badge>
        </div>

        {verified.map((f) => (
          <div key={f.id} className="flex items-center justify-between rounded-lg bg-surface-2 p-3 text-sm">
            <span>{f.friendly_name ?? "Authenticator"}</span>
            <Button variant="outline" size="sm" onClick={() => onUnenroll(f.id)}>
              Remove
            </Button>
          </div>
        ))}

        {enrolling ? (
          <div className="space-y-4 rounded-lg border border-border p-4">
            <img src={enrolling.qr} alt="Two-factor authentication QR code" className="size-44 rounded-lg bg-white p-2" />
            <p className="font-mono text-xs break-all text-muted-foreground">{enrolling.secret}</p>
            <div className="flex flex-wrap gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                inputMode="numeric"
                maxLength={6}
                className="w-32 font-mono"
              />
              <Button onClick={onVerify} disabled={busy || code.length < 6}>
                {busy && <Loader2 className="size-4 animate-spin" />} Verify & enable
              </Button>
              <Button variant="ghost" onClick={() => setEnrolling(null)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={onEnroll} disabled={busy} variant={verified.length ? "outline" : "default"}>
            {busy && <Loader2 className="size-4 animate-spin" />} <KeyRound className="size-4" />
            {verified.length ? "Add another authenticator" : "Enable two-step verification"}
          </Button>
        )}
      </section>

      <section className="panel space-y-4 p-6">
        <div className="flex items-center gap-3">
          <Mail className="size-5 text-primary" />
          <div>
            <h2 className="font-semibold">Recovery email</h2>
            <p className="text-xs text-muted-foreground">
              A backup address our support team uses to verify you if you lose your authenticator.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-56 flex-1 space-y-2">
            <Label htmlFor="recovery">Email address</Label>
            <Input
              id="recovery"
              type="email"
              value={recovery}
              onChange={(e) => setRecovery(e.target.value)}
              placeholder="backup@example.com"
            />
          </div>
          <Button onClick={() => saveRecovery.mutate()} disabled={saveRecovery.isPending}>
            {saveRecovery.isPending && <Loader2 className="size-4 animate-spin" />} Save
          </Button>
        </div>
      </section>

      <section className="panel space-y-4 p-6">
        <div className="flex items-center gap-3">
          <Fingerprint className="size-5 text-primary" />
          <div>
            <h2 className="font-semibold">Passkeys</h2>
            <p className="text-xs text-muted-foreground">
              Sign in with Face ID, Touch ID, Windows Hello or your phone — no password needed.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {(passkeys ?? []).length === 0 && (
            <p className="text-sm text-muted-foreground">No passkeys registered yet.</p>
          )}
          {(passkeys ?? []).map((p) => (
            <div key={p.id} className="flex items-center justify-between rounded-lg bg-surface-2 p-3 text-sm">
              <div>
                <p className="font-medium">{p.device_label ?? "Passkey"}</p>
                <p className="text-xs text-muted-foreground">
                  Added {new Date(p.created_at).toLocaleDateString()}
                  {p.last_used_at ? ` · last used ${new Date(p.last_used_at).toLocaleDateString()}` : ""}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  if (!confirm("Remove this passkey?")) return;
                  await removePasskey({ data: { id: p.id } });
                  toast.success("Passkey removed");
                  qc.invalidateQueries({ queryKey: ["passkeys"] });
                }}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-48 flex-1 space-y-2">
            <Label htmlFor="pk-label">Device name</Label>
            <Input
              id="pk-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="iPhone 15"
              maxLength={60}
            />
          </div>
          <Button onClick={() => addPasskey.mutate()} disabled={addPasskey.isPending}>
            {addPasskey.isPending && <Loader2 className="size-4 animate-spin" />} Add passkey
          </Button>
        </div>
      </section>
    </div>
  );
}
