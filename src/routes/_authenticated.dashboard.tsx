import { Link, Outlet, createFileRoute, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CreditCard, KeyRound, LayoutDashboard, Lock, LogOut, Menu, Receipt, Settings, ShieldCheck, BookOpen, Webhook, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { amIAdmin } from "@/lib/billing.functions";

import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: DashboardLayout,
});

type NavItem = {
  to:
    | "/dashboard"
    | "/dashboard/transactions"
    | "/dashboard/api-keys"
    | "/dashboard/webhooks"
    | "/dashboard/settings"
    | "/dashboard/security"
    | "/dashboard/billing"
    | "/dashboard/admin";
  label: string;
  icon: typeof LayoutDashboard;
  exact?: boolean;
};

const nav: NavItem[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/dashboard/transactions", label: "Transactions", icon: Receipt },
  { to: "/dashboard/api-keys", label: "API & Webhooks", icon: KeyRound },
  { to: "/dashboard/webhooks", label: "Webhook logs", icon: Webhook },
  { to: "/dashboard/settings", label: "Payment settings", icon: Settings },
  { to: "/dashboard/security", label: "Security & 2FA", icon: Lock },
  { to: "/dashboard/billing", label: "Billing & plans", icon: CreditCard },
];

const adminItem: NavItem = { to: "/dashboard/admin", label: "Admin panel", icon: ShieldCheck };

function DashboardLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const checkAdmin = useServerFn(amIAdmin);
  const { data: adminData } = useQuery({
    queryKey: ["am-i-admin"],
    queryFn: () => checkAdmin({ data: undefined }),
    enabled: !!user,
    retry: false,
  });
  const items = adminData?.isAdmin ? [...nav, adminItem] : nav;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await signOut();
    navigate({ to: "/auth", search: { mode: "login" }, replace: true });
  }

  const sidebar = (
    <div className="flex h-full flex-col gap-1 p-4">
      <div className="mb-6 flex items-center justify-between">
        <Logo />
        <button
          className="text-muted-foreground lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>
      </div>
      {items.map((item) => {
        const active = item.exact ? pathname === item.to : pathname.startsWith(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            onClick={() => setOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
              active
                ? "bg-primary/12 text-primary ring-1 ring-primary/25"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            }`}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
      <Link
        to="/docs"
        onClick={() => setOpen(false)}
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground"
      >
        <BookOpen className="size-4" />
        Documentation
      </Link>

      <div className="mt-auto space-y-3 border-t border-sidebar-border pt-4">
        <p className="truncate px-3 text-xs text-muted-foreground">{user?.email}</p>
        <Button variant="outline" size="sm" className="w-full" onClick={handleSignOut}>
          <LogOut className="size-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-sidebar-border bg-sidebar lg:block">
        {sidebar}
      </aside>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
            onClick={() => setOpen(false)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 w-64 border-r border-sidebar-border bg-sidebar lg:hidden">
            {sidebar}
          </aside>
        </>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-3 border-b border-border/60 bg-background/70 px-4 backdrop-blur-xl">
          <button className="lg:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
            <Menu className="size-5" />
          </button>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>
        <main className="mx-auto max-w-6xl px-4 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
