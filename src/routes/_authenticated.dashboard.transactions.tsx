import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const title = "Transactions — ZapGateway";
const description = "Search, filter and export every UPI order collected through your ZapGateway account.";

export const Route = createFileRoute("/_authenticated/dashboard/transactions")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: TransactionsPage,
});

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" });

function TransactionsPage() {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [from, setFrom] = useState("");

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("order_id, amount, customer_email, payer_upi, utr, status, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data ?? [];
    },
  });

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return orders.filter((o) => {
      if (status !== "ALL" && o.status !== status) return false;
      if (from && new Date(o.created_at) < new Date(from)) return false;
      if (!needle) return true;
      return [o.order_id, o.utr, o.customer_email, o.payer_upi]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(needle));
    });
  }, [orders, q, status, from]);

  function exportCsv() {
    const header = ["Order ID", "Amount", "Customer", "Payer UPI", "UTR", "Status", "Created"];
    const rows = filtered.map((o) => [
      o.order_id,
      Number(o.amount).toFixed(2),
      o.customer_email ?? "",
      o.payer_upi ?? "",
      o.utr ?? "",
      o.status,
      new Date(o.created_at).toISOString(),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `zapgateway-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold md:text-3xl">Transactions</h1>
          <p className="mt-1 text-sm text-muted-foreground">{filtered.length} order(s) shown</p>
        </div>
        <Button variant="outline" onClick={exportCsv} disabled={!filtered.length}>
          <Download className="size-4" /> Export CSV
        </Button>
      </div>

      <div className="panel flex flex-col gap-3 p-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search order ID, UTR, customer…"
            className="pl-9"
            maxLength={80}
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="sm:w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING">Pending</SelectItem>
            <SelectItem value="SUCCESS">Success</SelectItem>
            <SelectItem value="FAILED">Failed</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="sm:w-44" />
      </div>

      <div className="panel overflow-x-auto p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order ID</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Payer / UTR</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Date & time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((o) => (
              <TableRow key={o.order_id}>
                <TableCell className="font-mono text-xs">{o.order_id}</TableCell>
                <TableCell className="font-medium">{inr.format(Number(o.amount))}</TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {o.utr ?? o.payer_upi ?? o.customer_email ?? "—"}
                </TableCell>
                <TableCell>
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
                </TableCell>
                <TableCell className="text-right text-xs text-muted-foreground">
                  {new Date(o.created_at).toLocaleString("en-IN")}
                </TableCell>
              </TableRow>
            ))}
            {!filtered.length && (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-sm text-muted-foreground">
                  {isLoading ? "Loading…" : "No transactions match your filters."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
