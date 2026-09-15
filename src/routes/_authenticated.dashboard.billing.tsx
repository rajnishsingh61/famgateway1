import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { CheckCircle2, Clock, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { getMyBilling, startSubscriptionPayment, submitSubscriptionUtr } from "@/lib/billing.functions";
import { PLANS, PLATFORM_UPI_ID, type PlanId, qrImageUrl } from "@/lib/plans";

const title = "Billing & Plans — ZapGateway";
const description = "Start your 10-day free trial or upgrade to Premium (₹99/mo) or Pro (₹199/mo) over UPI.";

export const Route = createFileRoute("/_authenticated/dashboard/billing")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: BillingPage,
});

type Payment = {
  id: string;
  plan: string;
  amount: number;
  reference: string;
  upi_uri: string;
  utr: string | null;
  status: string;
  admin_note: string | null;
  created_at: string;
};

function BillingPage() {
  const queryClient = useQueryClient();
  const fetchBilling = useServerFn(getMyBilling);
  const start = useServerFn(startSubscriptionPayment);
  const submit = useServerFn(submitSubscriptionUtr);

  const [active, setActive] = useState<Payment | null>(null);
  const [utr, setUtr] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["billing"],
    queryFn: () => fetchBilling({ data: undefined }),
  });

  const startMutation = useMutation({
    mutationFn: (plan: PlanId) => start({ data: { plan } }),
    onSuccess: (row) => {
      setActive(row as unknown as Payment);
      setUtr("");
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const submitMutation = useMutation({
    mutationFn: () => submit({ data: { paymentId: active!.id, utr } }),
    onSuccess: () => {
      toast.success("UTR submitted — an admin will approve your plan shortly.");
      setActive(null);
      queryClient.invalidateQueries({ queryKey: ["billing"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const sub = data?.subscription;
  const trialEnds = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;
  const trialDaysLeft = trialEnds ? Math.max(0, Math.ceil((trialEnds.getTime() - Date.now()) / 86_400_000)) : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold md:text-3xl">Billing & plans</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pay over UPI to <span className="font-mono text-foreground">{PLATFORM_UPI_ID}</span> — plans activate as
          soon as an admin verifies your UTR.
        </p>
      </div>

      <div className="panel flex flex-wrap items-center justify-between gap-4 p-6">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Current plan</p>
          <p className="mt-1 text-2xl font-bold capitalize">{sub?.plan ?? "trial"}</p>
          {sub?.status === "trialing" ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Free trial — {trialDaysLeft} day{trialDaysLeft === 1 ? "" : "s"} left
            </p>
          ) : sub?.current_period_end ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Renews {new Date(sub.current_period_end).toLocaleDateString("en-IN")}
            </p>
          ) : null}
        </div>
        <Badge
          variant="outline"
          className={
            sub?.status === "active"
              ? "border-success/40 bg-success/10 px-3 py-1.5 text-success"
              : "border-primary/40 bg-primary/10 px-3 py-1.5 text-primary"
          }
        >
          {(sub?.status ?? "trialing").toUpperCase()}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {(Object.values(PLANS) as (typeof PLANS)[PlanId][]).map((plan) => (
          <div key={plan.id} className="panel relative flex flex-col p-6">
            {plan.id === "pro" && (
              <Badge className="absolute top-6 right-6 gap-1">
                <Sparkles className="size-3" /> Popular
              </Badge>
            )}
            <h2 className="text-lg font-semibold">{plan.name}</h2>
            <p className="text-sm text-muted-foreground">{plan.tagline}</p>
            <p className="mt-4 font-display text-4xl font-bold">
              ₹{plan.price}
              <span className="text-base font-normal text-muted-foreground">/month</span>
            </p>
            <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
              {plan.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              className="mt-6"
              variant={plan.id === "pro" ? "default" : "outline"}
              disabled={startMutation.isPending}
              onClick={() => startMutation.mutate(plan.id)}
            >
              {startMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              Pay ₹{plan.price} via UPI
            </Button>
          </div>
        ))}
      </div>

      {active && (
        <div className="panel grid gap-6 p-6 md:grid-cols-[auto_1fr]">
          <div className="mx-auto rounded-xl bg-white p-3">
            <img
              src={qrImageUrl(active.upi_uri)}
              alt={`UPI QR to pay ₹${active.amount} to ${PLATFORM_UPI_ID}`}
              width={220}
              height={220}
              className="size-[220px]"
            />
          </div>
          <div className="space-y-4">
            <div>
              <h2 className="text-base font-semibold">
                Pay ₹{Number(active.amount).toFixed(2)} to {PLATFORM_UPI_ID}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Scan with any UPI app, or copy the payment link. Include reference{" "}
                <span className="font-mono text-foreground">{active.reference}</span> in the note.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" asChild>
                <a href={active.upi_uri}>Open UPI app</a>
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  navigator.clipboard.writeText(PLATFORM_UPI_ID);
                  toast.success("UPI ID copied");
                }}
              >
                <Copy className="size-4" /> Copy UPI ID
              </Button>
            </div>
            <form
              className="space-y-3"
              onSubmit={(e) => {
                e.preventDefault();
                submitMutation.mutate();
              }}
            >
              <div className="space-y-2">
                <Label htmlFor="utr">UTR / reference number from your UPI app</Label>
                <Input
                  id="utr"
                  value={utr}
                  onChange={(e) => setUtr(e.target.value.replace(/\D/g, ""))}
                  placeholder="123456789012"
                  inputMode="numeric"
                  maxLength={14}
                  required
                />
              </div>
              <Button type="submit" disabled={submitMutation.isPending}>
                {submitMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
                Submit for approval
              </Button>
            </form>
          </div>
        </div>
      )}

      <div className="panel p-6">
        <h2 className="text-base font-semibold">Payment history</h2>
        {isLoading ? (
          <p className="mt-4 text-sm text-muted-foreground">Loading…</p>
        ) : !data?.payments.length ? (
          <p className="mt-4 text-sm text-muted-foreground">No subscription payments yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs tracking-wide text-muted-foreground uppercase">
                <tr>
                  <th className="py-2 pr-4">Reference</th>
                  <th className="py-2 pr-4">Plan</th>
                  <th className="py-2 pr-4">Amount</th>
                  <th className="py-2 pr-4">UTR</th>
                  <th className="py-2 pr-4">Status</th>
                  <th className="py-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {(data.payments as unknown as Payment[]).map((p) => (
                  <tr key={p.id} className="border-t border-border/60">
                    <td className="py-2.5 pr-4 font-mono text-xs">{p.reference}</td>
                    <td className="py-2.5 pr-4 capitalize">{p.plan}</td>
                    <td className="py-2.5 pr-4">₹{Number(p.amount).toFixed(2)}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">{p.utr ?? "—"}</td>
                    <td className="py-2.5 pr-4">
                      <span
                        className={
                          p.status === "APPROVED"
                            ? "text-success"
                            : p.status === "REJECTED"
                              ? "text-destructive"
                              : "text-muted-foreground"
                        }
                      >
                        {p.status === "SUBMITTED" && <Clock className="mr-1 inline size-3" />}
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2.5">{new Date(p.created_at).toLocaleString("en-IN")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
