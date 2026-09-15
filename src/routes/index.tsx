import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Code2,
  KeyRound,
  Mail,
  QrCode,
  ShieldCheck,
  Webhook,
  Zap,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";

import { Logo } from "@/components/Logo";
import { SiteFooter } from "@/components/SiteFooter";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { HERO_IMAGE_URL } from "@/lib/brand";
import { PLANS, TRIAL_DAYS } from "@/lib/plans";

const title = "ZapGateway — Automated UPI Payment Gateway for Indian Merchants";
const description =
  "Accept UPI payments on your website, Telegram bot or app. ZapGateway auto-verifies FamPay/UPI credits from your Gmail inbox and fires webhooks in seconds.";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: Mail,
    title: "Gmail IMAP verifier",
    body: "Your App Password is encrypted at rest. Our engine reads unseen payment mails, extracts the 12-digit UTR and settles the order.",
  },
  {
    icon: QrCode,
    title: "Hosted checkout",
    body: "Every order gets a shareable link with a dynamic UPI QR, a 5-minute countdown and live status polling every 3 seconds.",
  },
  {
    icon: Webhook,
    title: "Instant webhooks",
    body: "Payment success payloads are pushed to your endpoint the moment a UTR matches, with delivery logs you can replay.",
  },
  {
    icon: KeyRound,
    title: "Developer API keys",
    body: "Generate, copy and revoke public and secret key pairs. Two REST endpoints are all you need to go live.",
  },
  {
    icon: BarChart3,
    title: "Merchant analytics",
    body: "Earnings, today's volume, order counts and success rate — plus a daily revenue trend chart.",
  },
  {
    icon: ShieldCheck,
    title: "Secure by default",
    body: "AES-256-GCM encrypted credentials, row-level isolation per merchant and graceful API error responses.",
  },
];

function Landing() {
  const { session } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#pricing" className="transition-colors hover:text-foreground">
              Pricing
            </a>
            <Link to="/docs" className="transition-colors hover:text-foreground">
              Docs
            </Link>
            <Link to="/faq" className="transition-colors hover:text-foreground">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session ? (
              <Button asChild size="sm">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                  <Link to="/auth" search={{ mode: "login" }}>
                    Sign in
                  </Link>
                </Button>
                <Button asChild size="sm">
                  <Link to="/auth" search={{ mode: "register" }}>
                    Get started
                  </Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden [perspective:1600px]">
          <div
            className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-25 mix-blend-luminosity"
            style={{ backgroundImage: `url(${HERO_IMAGE_URL})` }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(120% 80% at 70% 10%, transparent 0%, var(--color-background) 72%), linear-gradient(to bottom, transparent 40%, var(--color-background) 96%)",
            }}
            aria-hidden
          />
          <div className="grid-bg absolute inset-0 opacity-30" aria-hidden />
          <div
            className="absolute inset-x-0 top-0 h-[520px]"
            style={{ background: "var(--gradient-glow)" }}
            aria-hidden
          />

          <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 md:py-28 lg:grid-cols-2">
            <div className="text-center lg:text-left">
              <Badge variant="outline" className="mb-6 gap-1.5 border-primary/30 bg-primary/10 text-primary">
                <Zap className="size-3" /> {TRIAL_DAYS}-day free trial · Fam UPI only
              </Badge>
              <h1 className="text-4xl leading-[1.05] font-bold md:text-6xl">
                The payment engine <span className="text-gradient">built for India</span>
              </h1>
              <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground lg:mx-0 md:text-lg">
                Connect your Fam UPI ID, generate a real-amount QR for every order and let our verification
                engine match amount + UTR + receiver automatically — then fire your webhook.
              </p>
              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row lg:justify-start">
                <Button asChild size="lg" className="glow w-full sm:w-auto">
                  <Link to="/auth" search={{ mode: "register" }}>
                    Start processing free <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="w-full sm:w-auto">
                  <Link to="/docs">
                    <Code2 className="size-4" /> View API docs
                  </Link>
                </Button>
              </div>

              <div className="mt-12 grid grid-cols-3 gap-3">
                {[
                  ["₹0", "Setup & MDR fees"],
                  ["100%", "Direct settlements"],
                  ["99.99%", "API uptime SLA"],
                ].map(([value, label]) => (
                  <div key={label} className="glass rounded-xl px-3 py-4">
                    <div className="font-display text-xl font-bold text-primary md:text-2xl">{value}</div>
                    <div className="mt-1 text-[11px] text-muted-foreground md:text-xs">{label}</div>
                  </div>
                ))}
              </div>
            </div>

            <HeroDevice />
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20" id="flow">
          <h2 className="text-3xl font-bold md:text-4xl">The Fam-only settlement flow</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            No Paytm, no aggregator, no MID. Money moves from your customer straight into your Fam account.
          </p>
          <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Fam UPI connect", "Merchant links their Fam UPI ID and authorizes the mailbox."],
              ["Order + QR", "Gateway creates the order and a real-amount UPI QR."],
              ["Customer pays", "Payment lands directly in the merchant's Fam account."],
              ["Verify → PAID", "Amount + UTR + receiver match, then your webhook fires."],
            ].map(([t, b], i) => (
              <div key={t} className="panel p-5">
                <span className="font-mono text-xs text-primary">0{i + 1}</span>
                <h3 className="mt-2 text-sm font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{b}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-bold md:text-4xl">Everything a merchant needs</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            A complete collection stack: hosted checkout, verifier engine, REST API and delivery logs.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="panel p-6 transition-colors hover:border-primary/40">
                <span className="grid size-10 place-items-center rounded-lg bg-primary/12 text-primary ring-1 ring-primary/25">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="how" className="border-y border-border/60 bg-surface-2/50">
          <div className="mx-auto max-w-6xl px-4 py-20">
            <h2 className="text-3xl font-bold md:text-4xl">How it works</h2>
            <ol className="mt-10 grid gap-6 md:grid-cols-4">
              {[
                ["Connect Gmail", "Add your FamPay email, 16-digit App Password and UPI ID."],
                ["Create an order", "Call POST /api/v1/create-order with your secret key."],
                ["Customer pays", "They scan the UPI QR on your hosted checkout page."],
                ["Auto-settled", "The verifier matches the UTR and fires your webhook."],
              ].map(([t, b], i) => (
                <li key={t} className="panel p-6">
                  <span className="font-mono text-xs text-primary">STEP {i + 1}</span>
                  <h3 className="mt-2 text-base font-semibold">{t}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{b}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="pricing" className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-bold md:text-4xl">Simple pricing</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Start with a {TRIAL_DAYS}-day free trial. No card needed — pay over UPI when you are ready.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <div className="panel flex flex-col p-6">
              <h3 className="text-lg font-semibold">Free trial</h3>
              <p className="text-sm text-muted-foreground">Full platform for {TRIAL_DAYS} days</p>
              <p className="mt-4 font-display text-4xl font-bold">
                ₹0<span className="text-base font-normal text-muted-foreground">/{TRIAL_DAYS} days</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm text-muted-foreground">
                {["1 Fam UPI ID", "Live API keys", "Hosted checkout + QR", "Webhooks"].map((f) => (
                  <li key={f} className="flex gap-2">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                    {f}
                  </li>
                ))}
              </ul>
              <Button asChild variant="outline" className="mt-6">
                <Link to="/auth" search={{ mode: "register" }}>Start free</Link>
              </Button>
            </div>

            {Object.values(PLANS).map((plan) => (
              <div
                key={plan.id}
                className={`panel relative flex flex-col p-6 ${plan.id === "pro" ? "glow border-primary/40" : ""}`}
              >
                {plan.id === "pro" && <Badge className="absolute top-6 right-6">Popular</Badge>}
                <h3 className="text-lg font-semibold">{plan.name}</h3>
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
                <Button asChild className="mt-6" variant={plan.id === "pro" ? "default" : "outline"}>
                  <Link to="/auth" search={{ mode: "register" }}>Choose {plan.name}</Link>
                </Button>
              </div>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <div className="panel glow relative overflow-hidden p-10 text-center">
            <div className="grid-bg absolute inset-0 opacity-30" aria-hidden />
            <div className="relative">
              <CheckCircle2 className="mx-auto size-8 text-success" />
              <h2 className="mt-4 text-3xl font-bold">Go live in under five minutes</h2>
              <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
                No merchant onboarding, no settlement delay. Money lands directly in your own UPI account.
              </p>
              <Button asChild size="lg" className="mt-7">
                <Link to="/auth" search={{ mode: "register" }}>
                  Start collecting payments <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

    </div>
  );
}

function HeroDevice() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: -6, y: 12 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      setTilt({ x: -py * 20, y: px * 28 });
    };
    const onLeave = () => setTilt({ x: -6, y: 12 });
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerleave", onLeave);
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  const chips: { label: string; sub: string; pos: string; z: number }[] = [
    { label: "Google Pay", sub: "UPI intent", pos: "-left-8 top-16", z: 120 },
    { label: "PhonePe", sub: "QR scan", pos: "-left-4 bottom-28", z: 90 },
    { label: "UPI", sub: "Unified Payments", pos: "-right-6 top-24", z: 140 },
    { label: "Paytm", sub: "Dynamic QR", pos: "-right-2 bottom-20", z: 70 },
  ];

  return (
    <div ref={ref} className="relative mx-auto w-full max-w-md [perspective:1400px]">
      <div
        className="absolute -inset-10 rounded-[3rem] blur-3xl"
        style={{ background: "var(--gradient-glow)" }}
        aria-hidden
      />
      <div
        className="relative transition-transform duration-200 ease-out will-change-transform [transform-style:preserve-3d]"
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      >
        <div
          className="absolute inset-x-6 -bottom-6 h-16 rounded-[50%] bg-primary/25 blur-2xl"
          style={{ transform: "translateZ(-60px)" }}
          aria-hidden
        />
        <img
          src={HERO_IMAGE_URL}
          alt="ZapGateway UPI checkout on a phone surrounded by Google Pay, PhonePe and UPI glass cards"
          className="relative w-full rounded-[2rem] border border-border/60 shadow-2xl"
          loading="eager"
          style={{ transform: "translateZ(20px)" }}
        />

        {chips.map((c) => (
          <div
            key={c.label}
            className={`glass absolute ${c.pos} rounded-xl px-3 py-2 text-left`}
            style={{ transform: `translateZ(${c.z}px)` }}
          >
            <p className="text-xs font-semibold">{c.label}</p>
            <p className="text-[10px] text-muted-foreground">{c.sub}</p>
          </div>
        ))}

        <div
          className="glass absolute -left-10 top-1/2 rounded-xl px-4 py-3 text-left"
          style={{ transform: "translateZ(170px)" }}
        >
          <p className="text-[10px] tracking-wide text-muted-foreground uppercase">UTR matched</p>
          <p className="font-mono text-sm font-semibold text-success">₹2,499.00 · PAID</p>
        </div>
        <div
          className="glass absolute -right-8 bottom-1/3 rounded-xl px-4 py-3 text-left"
          style={{ transform: "translateZ(190px)" }}
        >
          <p className="text-[10px] tracking-wide text-muted-foreground uppercase">Webhook</p>
          <p className="font-mono text-sm font-semibold text-primary">200 OK · 1.2s</p>
        </div>
      </div>
    </div>
  );
}

