import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { CheckCircle2, Copy, Download, Loader2, ShieldCheck, XCircle } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { getOrderStatus, getPublicOrder } from "@/lib/checkout.functions";

export const Route = createFileRoute("/pay/$orderId")({
  head: ({ params }) => {
    const title = `Pay order ${params.orderId} — ZapGateway`;
    const description = "Secure hosted UPI checkout. Scan the QR to pay; the order settles automatically.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: CheckoutPage,
});

const inr = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-border/60 py-4 last:border-b-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-right text-sm font-semibold">{children}</span>
    </div>
  );
}

function CheckoutPage() {
  const { orderId } = Route.useParams();
  const fetchOrder = useServerFn(getPublicOrder);
  const fetchStatus = useServerFn(getOrderStatus);
  const [qr, setQr] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(0);

  const { data: order, isLoading } = useQuery({
    queryKey: ["public-order", orderId],
    queryFn: () => fetchOrder({ data: { orderId } }),
  });

  const { data: status } = useQuery({
    queryKey: ["public-status", orderId],
    queryFn: () => fetchStatus({ data: { orderId } }),
    refetchInterval: (q) => (q.state.data?.status === "PENDING" ? 3000 : false),
    enabled: !!order,
  });

  useEffect(() => {
    if (!order?.upiUri) return;
    QRCode.toDataURL(order.upiUri, { width: 640, margin: 1 }).then(setQr).catch(() => setQr(null));
  }, [order?.upiUri]);

  useEffect(() => {
    if (!order) return;
    const tick = () =>
      setRemaining(Math.max(0, Math.floor((new Date(order.expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [order]);

  const current = status?.status ?? order?.status ?? "PENDING";
  const mm = String(Math.floor(remaining / 60)).padStart(2, "0");
  const ss = String(remaining % 60).padStart(2, "0");

  if (isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface-2">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="grid min-h-screen place-items-center bg-surface-2 px-4 text-center">
        <div>
          <XCircle className="mx-auto size-10 text-destructive" />
          <h1 className="mt-4 text-xl font-semibold">Payment link not found</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This order does not exist or has been removed.
          </p>
        </div>
      </div>
    );
  }

  const pill =
    current === "SUCCESS"
      ? { text: "Payment received", cls: "bg-success/10 text-success" }
      : current === "FAILED"
        ? { text: "Expired", cls: "bg-destructive/10 text-destructive" }
        : { text: "Waiting for payment…", cls: "bg-primary/10 text-primary" };

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-2 px-4 py-10">
      <div className="relative w-full max-w-md">
        {/* layered offset card */}
        <div
          className="absolute inset-0 translate-x-3 translate-y-3 rounded-[28px] bg-primary"
          aria-hidden
        />

        <div className="relative rounded-[28px] border border-border/60 bg-background p-6 shadow-xl sm:p-8">
          <Logo />

          <p className="mt-6 text-[11px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">
            Order total
          </p>
          <p className="mt-1 flex items-end gap-2">
            <span className="font-display text-5xl leading-none font-extrabold tracking-tight">
              ₹{inr.format(order.amount)}
            </span>
            <span className="pb-1 text-sm font-semibold text-muted-foreground">INR</span>
          </p>

          <div className="mt-6 rounded-3xl border border-border/60 bg-surface-2/50 p-5">
            {current === "SUCCESS" ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto size-14 text-success" />
                <h1 className="mt-4 text-xl font-bold">Payment received</h1>
                {status?.utr && (
                  <p className="mt-2 font-mono text-xs text-muted-foreground">UTR {status.utr}</p>
                )}
                <p className="mt-4 text-xs text-muted-foreground">
                  You can close this page — the merchant has been notified.
                </p>
              </div>
            ) : current === "FAILED" ? (
              <div className="py-8 text-center">
                <XCircle className="mx-auto size-14 text-destructive" />
                <h1 className="mt-4 text-xl font-bold">Payment window expired</h1>
                <p className="mt-2 text-sm text-muted-foreground">
                  Go back to the merchant and start a new order.
                </p>
              </div>
            ) : (
              <>
                <div className="flex justify-center">
                  {qr ? (
                    <img
                      src={qr}
                      alt={`UPI QR code to pay ₹${inr.format(order.amount)} to ${order.merchantName}`}
                      className="size-56 rounded-2xl bg-white p-3"
                    />
                  ) : (
                    <div className="grid size-56 place-items-center rounded-2xl border border-dashed border-border px-6 text-center text-xs text-muted-foreground">
                      Merchant has not configured a UPI ID
                    </div>
                  )}
                </div>

                <p className="mt-4 text-center text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase">
                  Scan with any UPI app
                </p>

                {qr && (
                  <div className="mt-3 flex justify-center">
                    <Button asChild variant="secondary" size="sm">
                      <a href={qr} download={`${order.orderId}-upi-qr.png`}>
                        <Download className="size-4" /> Save QR
                      </a>
                    </Button>
                  </div>
                )}
              </>
            )}

            <div className="mt-6">
              <Row label="Merchant">{order.merchantName}</Row>
              <Row label="Order ID">
                <span className="font-mono text-xs">{order.orderId}</span>
              </Row>
              {current === "PENDING" && (
                <Row label="Expires In">
                  Expires in {mm}:{ss}
                </Row>
              )}
              <Row label="Verification">
                <span
                  className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${pill.cls}`}
                >
                  <span className="size-1.5 rounded-full bg-current" />
                  {pill.text}
                </span>
              </Row>
            </div>
          </div>

          {current === "PENDING" && order.upiId && (
            <button
              className="mx-auto mt-5 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2 font-mono text-xs transition-colors hover:border-primary/40 hover:text-primary"
              onClick={() => {
                navigator.clipboard.writeText(order.upiId!);
                toast.success("UPI ID copied");
              }}
            >
              {order.upiId} <Copy className="size-3.5" />
            </button>
          )}

          {current === "PENDING" && order.upiUri && (
            <Button asChild className="mt-4 w-full sm:hidden">
              <a href={order.upiUri}>Open UPI app</a>
            </Button>
          )}

          <p className="mt-6 flex items-center justify-center gap-1.5 border-t border-border/60 pt-5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5 text-primary" /> Secured by ZapGateway
          </p>
        </div>
      </div>
    </div>
  );
}
