import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, RefreshCw, Webhook } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

const title = "Webhook delivery logs — ZapGateway";
const description =
  "Inspect every ZapGateway webhook attempt: HTTP status, payload summary, response time and the last delivery error.";

export const Route = createFileRoute("/_authenticated/dashboard/webhooks")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: WebhookLogsPage,
});

type Filter = "all" | "ok" | "failed";

function summarize(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "—";
  const p = payload as Record<string, unknown>;
  const parts = Object.entries(p)
    .slice(0, 4)
    .map(([k, v]) => `${k}=${typeof v === "object" ? "{…}" : String(v)}`);
  return parts.join(" · ");
}

function WebhookLogsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [q, setQ] = useState("");

  const { data, isFetching, refetch } = useQuery({
    queryKey: ["webhook-logs-page"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("webhook_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    refetchInterval: 15000,
  });

  const logs = data ?? [];

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return logs.filter((l) => {
      if (filter === "ok" && !l.ok) return false;
      if (filter === "failed" && l.ok) return false;
      if (!needle) return true;
      return [l.order_id, l.url, l.event, l.error_message, l.response_snippet]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [logs, filter, q]);

  const failed = logs.filter((l) => !l.ok).length;
  const lastError = logs.find((l) => !l.ok);
  const avgMs = (() => {
    const withMs = logs.filter((l) => typeof l.duration_ms === "number");
    if (!withMs.length) return null;
    return Math.round(withMs.reduce((s, l) => s + (l.duration_ms ?? 0), 0) / withMs.length);
  })();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Webhook delivery logs</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every delivery attempt with its HTTP status, payload summary and last error.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`size-4 ${isFetching ? "animate-spin" : ""}`} /> Refresh
        </Button>
      </header>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-5">
          <p className="text-xs text-muted-foreground">Total attempts</p>
          <p className="mt-1 font-display text-2xl font-bold">{logs.length}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs text-muted-foreground">Failed</p>
          <p className={`mt-1 font-display text-2xl font-bold ${failed ? "text-destructive" : ""}`}>{failed}</p>
        </div>
        <div className="panel p-5">
          <p className="text-xs text-muted-foreground">Avg response time</p>
          <p className="mt-1 font-display text-2xl font-bold">{avgMs === null ? "—" : `${avgMs} ms`}</p>
        </div>
      </div>

      {lastError && (
        <div className="panel flex items-start gap-3 border-destructive/40 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Last error</p>
            <p className="mt-1 font-mono text-xs break-words text-muted-foreground">
              {lastError.error_message || lastError.response_snippet || "Delivery failed"}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {new Date(lastError.created_at).toLocaleString()} · {lastError.url}
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Input
          placeholder="Search order ID, URL or error…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-xs"
        />
        {(["all", "ok", "failed"] as Filter[]).map((f) => (
          <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => setFilter(f)}>
            {f === "all" ? "All" : f === "ok" ? "Delivered" : "Failed"}
          </Button>
        ))}
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="border-b border-border/60 text-left text-xs text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Endpoint</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Payload</th>
              <th className="px-4 py-3">Error</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id} className="border-b border-border/40 last:border-0">
                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                  {new Date(l.created_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{l.order_id ?? "—"}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{l.url}</td>
                <td className="px-4 py-3">
                  <Badge variant={l.ok ? "outline" : "destructive"} className="gap-1">
                    {l.ok ? <CheckCircle2 className="size-3" /> : <AlertTriangle className="size-3" />}
                    {l.status_code ?? "ERR"}
                  </Badge>
                  {typeof l.duration_ms === "number" && (
                    <span className="ml-2 text-xs text-muted-foreground">{l.duration_ms} ms</span>
                  )}
                </td>
                <td className="max-w-[260px] truncate px-4 py-3 font-mono text-xs text-muted-foreground">
                  {l.event ? `${l.event} · ` : ""}
                  {summarize(l.payload)}
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-xs text-destructive">
                  {l.error_message ?? ""}
                </td>
              </tr>
            ))}
            {!filtered.length && (
              <tr>
                <td colSpan={6} className="px-4 py-14 text-center text-sm text-muted-foreground">
                  <Webhook className="mx-auto mb-3 size-6 opacity-50" />
                  No webhook deliveries yet. They appear here as soon as an order is settled.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
