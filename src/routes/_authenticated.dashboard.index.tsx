import { useQuery } from "@tanstack/react-query";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, IndianRupee, Percent, Receipt, TrendingUp } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const title = "Merchant Overview — ZapGateway";
const description = "Track earnings, today's transactions, order volume and success rate for your UPI collections.";

export const Route = createFileRoute("/_authenticated/dashboard/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Overview,
});

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

function Overview() {
  const { user } = useAuth();

  const { data: orders = [] } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("order_id, amount, status, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: settings } = useQuery({
    queryKey: ["settings", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("merchant_settings")
        .select("connected, upi_id, webhook_url, last_error")
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const stats = useMemo(() => {
    const success = orders.filter((o) => o.status === "SUCCESS");
    const todayKey = new Date().toDateString();
    const todays = orders.filter((o) => new Date(o.created_at).toDateString() === todayKey);
    const earnings = success.reduce((sum, o) => sum + Number(o.amount), 0);
    const rate = orders.length ? (success.length / orders.length) * 100 : 0;
    return {
      earnings,
      today: todays.length,
      total: orders.length,
      rate,
    };
  }, [orders]);

  const chartData = useMemo(() => {
    const days: { day: string; revenue: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toDateString();
      const revenue = orders
        .filter((o) => o.status === "SUCCESS" && new Date(o.created_at).toDateString() === key)
        .reduce((sum, o) => sum + Number(o.amount), 0);
      days.push({ day: d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" }), revenue });
    }
    return days;
  }, [orders]);

  const cards = [
    { label: "Total earnings", value: inr.format(stats.earnings), icon: IndianRupee },
    { label: "Today's transactions", value: String(stats.today), icon: TrendingUp },
    { label: "Total orders", value: String(stats.total), icon: Receipt },
    { label: "Success rate", value: `${stats.rate.toFixed(1)}%`, icon: Percent },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Overview</h1>
        <p className="mt-1 text-sm text-muted-foreground">Live snapshot of your UPI collections.</p>
      </div>

      <div
        className={`panel flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between ${
          settings?.connected ? "border-success/35" : "border-warning/40"
        }`}
      >
        <div className="flex items-start gap-3">
          {settings?.connected ? (
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
          ) : (
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
          )}
          <div>
            <p className="font-semibold">
              {settings?.connected ? "Gateway connected" : "Finish your integration"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {settings?.connected
                ? `Verifier is watching your inbox. Collecting to ${settings.upi_id}.`
                : settings?.last_error || "Connect your Gmail App Password and UPI ID to start verifying payments."}
            </p>
          </div>
        </div>
        <Button asChild variant={settings?.connected ? "outline" : "default"} size="sm">
          <Link to="/dashboard/settings">{settings?.connected ? "Manage" : "Connect now"}</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.label} className="panel p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {c.label}
              </span>
              <c.icon className="size-4 text-primary" />
            </div>
            <p className="mt-3 font-display text-2xl font-bold">{c.value}</p>
          </div>
        ))}
      </div>

      <div className="panel p-5">
        <h2 className="text-base font-semibold">Daily revenue — last 14 days</h2>
        <div className="mt-6 h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ left: -18, right: 8, top: 4 }}>
              <defs>
                <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
              <XAxis
                dataKey="day"
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
                tickLine={false}
                axisLine={false}
              />
              <RTooltip
                contentStyle={{
                  background: "var(--color-popover)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "0.75rem",
                  fontSize: 12,
                }}
                formatter={(v: number) => [inr.format(v), "Revenue"]}
              />
              <Area
                type="monotone"
                dataKey="revenue"
                stroke="var(--color-primary)"
                strokeWidth={2}
                fill="url(#rev)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold">Recent orders</h2>
          <Button asChild variant="ghost" size="sm">
            <Link to="/dashboard/transactions">View all</Link>
          </Button>
        </div>
        <div className="mt-4 space-y-2">
          {orders.slice(0, 6).map((o) => (
            <div
              key={o.order_id}
              className="flex items-center justify-between rounded-lg bg-surface-2 px-4 py-3 text-sm"
            >
              <span className="font-mono text-xs">{o.order_id}</span>
              <span className="flex items-center gap-3">
                <span className="font-medium">{inr.format(Number(o.amount))}</span>
                <Badge
                  variant="outline"
                  className={
                    o.status === "SUCCESS"
                      ? "border-success/40 text-success"
                      : o.status === "FAILED"
                        ? "border-destructive/40 text-destructive"
                        : "border-warning/40 text-warning"
                  }
                >
                  {o.status}
                </Badge>
              </span>
            </div>
          ))}
          {orders.length === 0 && (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No orders yet. Create one through the API to see it here.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
