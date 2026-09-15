import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Check, Copy, Eye, EyeOff, KeyRound, Loader2, Plus, Trash2, Webhook } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { createApiKeyPair } from "@/lib/merchant.functions";

const title = "API Keys & Webhooks — ZapGateway";
const description = "Generate and revoke API keys, configure your webhook endpoint and inspect delivery logs.";

export const Route = createFileRoute("/_authenticated/dashboard/api-keys")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ApiKeysPage,
});

function CopyField({ label, value, secret }: { label: string; value: string; secret?: boolean }) {
  const [revealed, setRevealed] = useState(!secret);
  const [copied, setCopied] = useState(false);

  return (
    <div className="space-y-1.5">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <div className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
        <code className="flex-1 truncate font-mono text-xs">
          {revealed ? value : "•".repeat(Math.min(value.length, 40))}
        </code>
        {secret && (
          <button
            type="button"
            onClick={() => setRevealed((r) => !r)}
            aria-label={revealed ? "Hide secret key" : "Reveal secret key"}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {revealed ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        )}
        <button
          type="button"
          aria-label={`Copy ${label}`}
          className="text-muted-foreground transition-colors hover:text-foreground"
          onClick={() => {
            navigator.clipboard.writeText(value);
            setCopied(true);
            toast.success(`${label} copied`);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
        </button>
      </div>
    </div>
  );
}

function ApiKeysPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const generate = useServerFn(createApiKeyPair);
  const [label, setLabel] = useState("Production key");
  const [webhookUrl, setWebhookUrl] = useState("");

  const { data: keys = [] } = useQuery({
    queryKey: ["api-keys", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("api_keys")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("merchant_settings").select("webhook_url").maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["webhook-logs", user?.id],
    enabled: !!user,
    refetchInterval: 20000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    setWebhookUrl(settings?.webhook_url ?? "");
  }, [settings]);

  const createMutation = useMutation({
    mutationFn: () => generate({ data: { label } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("New API key generated");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const revokeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("api_keys").update({ revoked: true }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
      toast.success("Key revoked");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const webhookMutation = useMutation({
    mutationFn: async () => {
      if (webhookUrl && !/^https?:\/\/.+/.test(webhookUrl)) throw new Error("URL must start with http(s)://");
      const { error } = await supabase
        .from("merchant_settings")
        .update({ webhook_url: webhookUrl || null })
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Webhook URL saved");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">API & Webhooks</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Authenticate every request with your single API key in the <span className="font-mono">X-API-KEY</span> header.
        </p>
      </div>

      <div className="panel p-6">
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-52 flex-1 space-y-2">
            <Label htmlFor="label">Key label</Label>
            <Input id="label" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} />
          </div>
          <Button onClick={() => createMutation.mutate()} disabled={createMutation.isPending}>
            {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Generate API key
          </Button>
        </div>

        <div className="mt-6 space-y-4">
          {keys.map((k) => (
            <div
              key={k.id}
              className={`rounded-xl border p-4 ${k.revoked ? "border-border opacity-55" : "border-primary/25"}`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 font-medium">
                  <KeyRound className="size-4 text-primary" /> {k.label}
                  {k.revoked && <Badge variant="outline">Revoked</Badge>}
                </span>
                {!k.revoked && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => revokeMutation.mutate(k.id)}
                  >
                    <Trash2 className="size-4" /> Revoke
                  </Button>
                )}
              </div>
              <div className="mt-4">
                <CopyField label="API key" value={k.secret_key} secret />
              </div>
            </div>
          ))}
          {keys.length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No API keys yet — generate your first key above.
            </p>
          )}
        </div>
      </div>

      <div className="panel p-6">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <Webhook className="size-4 text-primary" /> Webhook endpoint
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          We POST a <span className="font-mono">payment.success</span> payload here the moment an order settles.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-64 flex-1 space-y-2">
            <Label htmlFor="webhook">URL</Label>
            <Input
              id="webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              placeholder="https://yoursite.com/zapgateway/webhook"
              maxLength={500}
            />
          </div>
          <Button variant="outline" onClick={() => webhookMutation.mutate()} disabled={webhookMutation.isPending}>
            {webhookMutation.isPending && <Loader2 className="size-4 animate-spin" />}
            Save URL
          </Button>
        </div>
      </div>

      <div className="panel p-6">
        <h2 className="text-base font-semibold">Live webhook logs</h2>
        <div className="mt-4 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Delivered</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-mono text-xs">{l.order_id}</TableCell>
                  <TableCell className="max-w-56 truncate text-xs text-muted-foreground">{l.url}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={l.ok ? "border-success/40 text-success" : "border-destructive/40 text-destructive"}
                    >
                      {l.ok ? `${l.status_code} OK` : `Failed${l.status_code ? ` ${l.status_code}` : ""}`}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground">
                    {new Date(l.created_at).toLocaleString("en-IN")}
                  </TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-8 text-center text-sm text-muted-foreground">
                    No webhook deliveries yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
