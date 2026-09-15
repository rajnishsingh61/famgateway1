import { createFileRoute } from "@tanstack/react-router";

import { PageShell, Section } from "@/components/PageShell";
import { SUPPORT_EMAIL } from "@/lib/brand";

const title = "Refund Policy — ZapGateway";
const description =
  "When ZapGateway subscription payments are refundable, how to request a refund, and how customer payments are handled.";

export const Route = createFileRoute("/refunds")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Refunds,
});

function Refunds() {
  return (
    <PageShell title="Refund Policy" subtitle="Last updated: August 2026">
      <Section heading="Subscription refunds">
        <p>
          If a subscription payment is charged but your plan is not activated, we refund it in full to the
          source UPI account within 5–7 working days. Duplicate payments for the same period are refunded in
          full.
        </p>
      </Section>
      <Section heading="Change of mind">
        <p>
          Because a 10-day free trial is offered before any payment, subscription fees are otherwise
          non-refundable once the billing period has started. You can cancel at any time to stop renewal.
        </p>
      </Section>
      <Section heading="Customer payments">
        <p>
          Payments made by your customers land directly in your own UPI account. ZapGateway never holds those
          funds, so refunds to your customers must be issued by you.
        </p>
      </Section>
      <Section heading="How to request">
        <p>Email {SUPPORT_EMAIL} with the UTR, amount and date. We respond within one business day.</p>
      </Section>
    </PageShell>
  );
}
