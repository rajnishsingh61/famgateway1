import { createFileRoute } from "@tanstack/react-router";

import { PageShell, Section } from "@/components/PageShell";

const title = "Terms of Service — ZapGateway";
const description =
  "The rules for using ZapGateway: merchant obligations, acceptable use, subscriptions, liability and termination.";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Terms,
});

function Terms() {
  return (
    <PageShell title="Terms of Service" subtitle="Last updated: August 2026">
      <Section heading="1. The service">
        <p>
          ZapGateway is a payment verification and automation tool. Funds move directly from your customer to
          your own UPI account — we never hold, route or settle merchant money.
        </p>
      </Section>
      <Section heading="2. Merchant obligations">
        <p>
          You must own the Fam UPI ID and mailbox you connect. One Fam UPI ID may be linked to one account
          only. You are responsible for the legality of what you sell and for your own tax compliance.
        </p>
      </Section>
      <Section heading="3. Acceptable use">
        <p>
          No fraud, gambling where prohibited, illegal goods, adult content involving minors, money laundering
          or reselling access to the API. We may suspend accounts that breach this.
        </p>
      </Section>
      <Section heading="4. Subscriptions">
        <p>
          A 10-day free trial is followed by Premium (₹99/month) or Pro (₹199/month). Access ends automatically
          when a plan expires until renewal is approved.
        </p>
      </Section>
      <Section heading="5. Liability">
        <p>
          The service is provided “as is”. We are not liable for failed or delayed verification caused by mail
          provider outages, incorrect credentials or customer error. Our total liability is limited to the
          subscription fees paid in the previous month.
        </p>
      </Section>
      <Section heading="6. Termination">
        <p>You may stop using the service at any time; we may terminate for breach of these terms.</p>
      </Section>
    </PageShell>
  );
}
