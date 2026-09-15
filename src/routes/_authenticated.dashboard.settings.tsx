import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CheckCircle2, Info, Loader2, PlugZap, RefreshCw, ShieldCheck, Unplug, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { disconnectUpi, savePaymentSettings, scanInboxNow, testImapConnection } from "@/lib/merchant.functions";

const title = "Payment Settings — ZapGateway";
const description = "Connect your Gmail App Password and FamPay UPI ID so ZapGateway can auto-verify payments.";

export const Route = createFileRoute("/_authenticated/dashboard/settings")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const save = useServerFn(savePaymentSettings);
  const test = useServerFn(testImapConnection);
  const scan = useServerFn(scanInboxNow);
  const disconnect = useServerFn(disconnectUpi);

  const [projectName, setProjectName] = useState("");
  const [fampayEmail, setFampayEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const [upiId, setUpiId] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchant_settings")
        .select("project_name, fampay_email, upi_id, webhook_url, connected, last_error, last_verified_at, app_password_enc")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (!settings) return;
    setProjectName(settings.project_name ?? "");
    setFampayEmail(settings.fampay_email ?? "");
    setUpiId(settings.upi_id ?? "");
    setWebhookUrl(settings.webhook_url ?? "");
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () => save({ data: { projectName, fampayEmail, appPassword, upiId, webhookUrl } }),
    onSuccess: (res) => {
      setAppPassword("");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      if (res.connected) toast.success("Saved — Gmail connection verified.");
      else toast.warning(res.error ?? "Saved, but the mailbox could not be verified.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testMutation = useMutation({
    mutationFn: () => test({ data: undefined }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      if (res.connected) toast.success("IMAP connection is healthy.");
      else toast.error(res.error ?? "Connection failed");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const scanMutation = useMutation({
    mutationFn: () => scan({ data: undefined }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(
        `Scanned ${res.emailsScanned} unread email(s) — ${res.ordersMarkedPaid} order(s) settled.` +
          (res.errors.length ? ` (${res.errors[0]})` : ""),
      );
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => disconnect({ data: undefined }),
    onSuccess: () => {
      setUpiId("");
      setAppPassword("");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("UPI disconnected — this Fam UPI ID is free to connect again.");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const connected = !!settings?.connected;
  const hasStoredPassword = !!settings?.app_password_enc;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Payment settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The verifier engine reads UPI credit alerts from this mailbox to settle orders.
          </p>
        </div>
        <Badge
          variant="outline"
          className={
            connected
              ? "gap-1.5 border-success/40 bg-success/10 px-3 py-1.5 text-success"
              : "gap-1.5 border-destructive/40 bg-destructive/10 px-3 py-1.5 text-destructive"
          }
        >
          {connected ? <CheckCircle2 className="size-3.5" /> : <XCircle className="size-3.5" />}
          {connected ? "CONNECTED" : "DISCONNECTED"}
        </Badge>
      </div>

      <form
        className="panel space-y-5 p-6"
        onSubmit={(e) => {
          e.preventDefault();
          saveMutation.mutate();
        }}
      >
        <div className="flex items-start gap-3 rounded-lg bg-surface-2 p-4 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Create an App Password at{" "}
            <span className="font-mono text-foreground">myaccount.google.com/apppasswords</span> and enable IMAP
            in Gmail settings. Your password is encrypted with AES-256-GCM before it is stored.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="projectName">Project / website name</Label>
            <Input
              id="projectName"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="My Store"
              maxLength={80}
              required
            />
            <p className="text-xs text-muted-foreground">Shown to customers on your hosted checkout page.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="fampayEmail">Fam registered email</Label>
            <Input
              id="fampayEmail"
              type="email"
              value={fampayEmail}
              onChange={(e) => setFampayEmail(e.target.value)}
              placeholder="merchant@gmail.com"
              maxLength={255}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="appPassword">Secure mailbox authorization (16-character app password)</Label>
            <Input
              id="appPassword"
              type="password"
              value={appPassword}
              onChange={(e) => setAppPassword(e.target.value)}
              placeholder={hasStoredPassword ? "•••••••••••••••• (saved)" : "abcd efgh ijkl mnop"}
              maxLength={40}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              {hasStoredPassword ? "Leave blank to keep the saved password." : "Spaces are removed automatically."}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="upiId">Fam UPI ID (one per account)</Label>
            <Input
              id="upiId"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="yourname@fam"
              maxLength={120}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="webhookUrl">Webhook URL (optional)</Label>
            <Input
              id="webhookUrl"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://yoursite.com/zapgateway/webhook"
              maxLength={500}
            />
          </div>
        </div>

        {settings?.last_error && !connected && (
          <p className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {settings.last_error}
          </p>
        )}
        {connected && settings?.last_verified_at && (
          <p className="text-xs text-muted-foreground">
            Last verified {new Date(settings.last_verified_at).toLocaleString("en-IN")}
          </p>
        )}

        <div className="flex flex-wrap gap-3 pt-1">
          <Button type="submit" disabled={saveMutation.isPending || isLoading}>
            {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
            Save & verify
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={testMutation.isPending || !hasStoredPassword}
            onClick={() => testMutation.mutate()}
          >
            {testMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}
            Test IMAP connection
          </Button>
          <Button
            type="button"
            variant="ghost"
            disabled={scanMutation.isPending || !connected}
            onClick={() => scanMutation.mutate()}
          >
            {scanMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
            Run verifier now
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:text-destructive"
            disabled={disconnectMutation.isPending || (!settings?.upi_id && !hasStoredPassword)}
            onClick={() => {
              if (!window.confirm("Disconnect this Fam UPI ID and mailbox authorization?")) return;
              disconnectMutation.mutate();
            }}
          >
            {disconnectMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Unplug className="size-4" />}
            Disconnect UPI
          </Button>
        </div>
      </form>

      <div className="panel p-6">
        <h2 className="text-base font-semibold">How verification works</h2>
        <ol className="mt-4 space-y-3 text-sm text-muted-foreground">
          <li>
            <span className="font-mono text-xs text-primary">1.</span> The engine decrypts your App Password in
            memory and opens an IMAP session with <span className="font-mono">imap.gmail.com:993</span>.
          </li>
          <li>
            <span className="font-mono text-xs text-primary">2.</span> Unseen messages are parsed with regex for a
            12-digit UTR and an INR amount.
          </li>
          <li>
            <span className="font-mono text-xs text-primary">3.</span> Matching pending orders are marked{" "}
            <span className="text-success">SUCCESS</span>, the UTR is stored and the mail is flagged as read.
          </li>
          <li>
            <span className="font-mono text-xs text-primary">4.</span> Your webhook URL receives the{" "}
            <span className="font-mono">payment.success</span> payload.
          </li>
        </ol>
      </div>
    </div>
  );
}
