import { Link } from "@tanstack/react-router";

import { Logo } from "@/components/Logo";
import { COMPANY_NAME } from "@/lib/brand";

const product = [
  { label: "Features", href: "/#features" },
  { label: "Developers", href: "/docs" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/faq" },
];

const company = [
  { label: "About Us", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Support", href: "/support" },
  { label: "Report a Bug", href: "/report-bug" },
];

const legal = [
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Service", href: "/terms" },
  { label: "Refund Policy", href: "/refunds" },
];

function Column({ title, items }: { title: string; items: { label: string; href: string }[] }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
        {items.map((i) => (
          <li key={i.label}>
            <a href={i.href} className="transition-colors hover:text-foreground">
              {i.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-surface-2/40">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              Automated UPI collections for Indian merchants — hosted checkout, instant verification and
              webhooks.
            </p>
          </div>
          <Column title="Product" items={product} />
          <Column title="Company" items={company} />
          <div>
            <Column title="Legal" items={legal} />
            <p className="mt-4 text-xs text-muted-foreground">Connect with us: hello@zapgateway.in</p>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-3 border-t border-border/60 pt-6 text-xs text-muted-foreground sm:flex-row">
          <p>
            © {new Date().getFullYear()} {COMPANY_NAME} · Built in India
          </p>
          <div className="flex items-center gap-4">
            <Link to="/privacy" className="transition-colors hover:text-foreground">
              Privacy
            </Link>
            <Link to="/terms" className="transition-colors hover:text-foreground">
              Terms
            </Link>
            <Link to="/refunds" className="transition-colors hover:text-foreground">
              Refunds
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
