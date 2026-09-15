import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Check, Loader2, ShieldAlert, Unplug, X } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  adminApproveOrder,
  adminDisconnectUpi,
  adminOverview,
  reviewSubscriptionPayment,
} from "@/lib/billing.functions";

const title = "Admin Panel — ZapGateway";

export const Route = createFileRoute("/_authenticated/dashboard/admin")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: "ZapGateway platform administration." },
      { property: "og:title", content: title },
      { property: "og:description", content: "ZapGateway platform administration." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const queryClient = useQueryClient();
  const overview = useServerFn(adminOverview);
  const review = useServerFn(reviewSubscriptionPayment);
  const approveOrder = useServerFn(adminApproveOrder);
  const releaseUpi = useServerFn(adminDisconnectUpi);
  const [orderId, setOrderId] = useState("");
  const [orderUtr, setOrderUtr] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => overview({ data: undefined }),
    retry: false,
  });

  const reviewMutation = useMutation({
    mutationFn: (vars: { paymentId: string; action: "approve" | "reject" }) => review({ data: vars }),
    onSuccess: (res) => {
      toast.success(`Payment ${res.status.toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const orderMutation = useMutation({
    mutationFn: () => approveOrder({ data: { orderId: orderId.trim(), utr: orderUtr.trim() || undefined } }),
    onSuccess: () => {
      toast.success("Order marked as paid and webhook fired.");
      setOrderId("");
      setOrderUtr("");
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const releaseMutation = useMutation({
    mutationFn: (userId: string) => releaseUpi({ data: { userId } }),
    onSuccess: () => {
      toast.success("UPI released — the merchant can connect a new Fam UPI ID.");
      queryClient.invalidateQueries({ queryKey: ["admin-overview"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (error) {
    return (
      <div className="panel flex flex-col items-center gap-3 p-10 text-center">
        <ShieldAlert className="size-8 text-destructive" />
        <h1 className="text-xl font-bold">Admin access required</h1>
        <p className="max-w-md text-sm text-muted-foreground">{(error as Error).message}</p>
      </div>
    );
  }

  const stats = data?.stats;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Admin panel</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Approve subscription payments, monitor merchants and settle orders manually.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Merchants", stats?.merchants ?? 0],
          ["Active subscriptions", stats?.activeSubs ?? 0],
          ["On trial", stats?.trialing ?? 0],
          ["Pending approvals", stats?.pendingApprovals ?? 0],
          ["MRR", `₹${(stats?.mrr ?? 0).toLocaleString("en-IN")}`],
          ["Gateway GMV", `₹${(stats?.gmv ?? 0).toLocaleString("en-IN")}`],
          ["Orders", stats?.orders ?? 0],
        ].map(([label, value]) => (
          <div key={String(label)} className="panel p-5">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">{label}</p>
            <p className="mt-2 font-display text-2xl font-bold">{value}</p>
          </div>
        ))}
      </div>

      <div className="panel p-6">
        <h2 className="text-base font-semibold">Subscription approval queue</h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : !data?.queue.length ? (
          <p className="mt-4 text-sm text-muted-foreground">Nothing to review.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="py-2 pr-4">Merchant</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">UTR</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {data.queue.map((p) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="py-2.5 pr-4">
                      <div className="font-medium">{p.businessName ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{p.email}</div>
                      <div className="font-mono text-[11px] text-muted-foreground">{p.reference}</div>
                    </td>
                    <td className="py-2.5 pr-4 capitalize">{p.plan}</td>
                    <td className="py-2.5 pr-4">₹{Number(p.amount).toFixed(2)}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{p.utr ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <Badge
                        variant="outline"
                        className={
                          p.status === "APPROVED"
                            ? "border-success/40 text-success"
                            : p.status === "REJECTED"
                              ? "border-destructive/40 text-destructive"
                              : "border-primary/40 text-primary"
                        }
                      >
                        {p.status}
                      </Badge>
                    </td>
                    <td className="py-2.5">
                      {p.status === "APPROVED" || p.status === "REJECTED" ? (
                        <span className="text-xs text-muted-foreground">
                          {p.reviewed_at ? new Date(p.reviewed_at).toLocaleDateString("en-IN") : "reviewed"}
                        </span>
                      ) : (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ paymentId: p.id, action: "approve" })}
                          >
                            <Check className="size-4" /> Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={reviewMutation.isPending}
                            onClick={() => reviewMutation.mutate({ paymentId: p.id, action: "reject" })}
                          >
                            <X className="size-4" /> Reject
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel p-6">
        <h2 className="text-base font-semibold">Manually settle a gateway order</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Use this when a customer paid but the verifier missed the credit alert. The merchant webhook fires
          immediately.
        </p>
        <form
          className="mt-4 flex flex-wrap gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            orderMutation.mutate();
          }}
        >
          <Input
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
            placeholder="Order ID (ZG…)"
            className="w-56"
            required
          />
          <Input
            value={orderUtr}
            onChange={(e) => setOrderUtr(e.target.value)}
            placeholder="UTR (optional)"
            className="w-48"
          />
          <Button type="submit" disabled={orderMutation.isPending || !orderId.trim()}>
            {orderMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
            Mark as paid
          </Button>
        </form>
      </div>

      <div className="panel p-6">
        <h2 className="text-base font-semibold">Merchants</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="py-2 pr-4">Merchant</th>
                <th className="py-2 pr-4">Project</th>
                <th className="py-2 pr-4">Fam UPI ID</th>
                <th className="py-2 pr-4">Mailbox</th>
                <th className="py-2 pr-4">Plan</th>
                <th className="py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(data?.merchants ?? []).map((m) => (
                <tr key={m.id} className="border-t border-border/60">
                  <td className="py-2.5 pr-4">
                    <div className="font-medium">{m.businessName ?? "—"}</div>
                    <div className="text-xs text-muted-foreground">{m.email}</div>
                  </td>
                  <td className="py-2.5 pr-4">{m.projectName ?? "—"}</td>
                  <td className="py-2.5 pr-4 font-mono text-xs">{m.upiId ?? "—"}</td>
                  <td className="py-2.5 pr-4">
                    <span className={m.connected ? "text-success" : "text-muted-foreground"}>
                      {m.connected ? "Authorized" : "Not connected"}
                    </span>
                  </td>
                  <td className="py-2.5 pr-4 capitalize">
                    {m.subscription?.plan ?? "trial"}{" "}
                    <span className="text-xs text-muted-foreground">({m.subscription?.status ?? "trialing"})</span>
                  </td>
                  <td className="py-2.5">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={releaseMutation.isPending || (!m.upiId && !m.connected)}
                      onClick={() => {
                        if (!window.confirm(`Disconnect UPI for ${m.email ?? "this merchant"}?`)) return;
                        releaseMutation.mutate(m.id);
                      }}
                    >
                      {releaseMutation.isPending ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <Unplug className="size-4" />
                      )}
                      Disconnect UPI
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
