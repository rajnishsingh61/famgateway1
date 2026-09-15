import { createFileRoute } from "@tanstack/react-router";

import { PageShell, Section } from "@/components/PageShell";

const title = "About ZapGateway — UPI collections built in India";
const description =
  "ZapGateway is an Indian payments engine that automates UPI collection, verification and webhook delivery for merchants, bots and indie developers.";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: About,
});

function About() {
  return (
    <PageShell title="About Us" subtitle="A small team building payment infrastructure for Indian merchants.">
      <Section heading="Why we exist">
        <p>
          Traditional aggregators demand company documents, MIDs and long onboarding just to collect a ₹99
          payment. ZapGateway lets any merchant collect UPI payments directly into their own Fam UPI account,
          with automatic verification and webhooks — no MDR, no settlement delay.
        </p>
      </Section>
      <Section heading="How we work">
        <p>
          Our verification engine reads payment notifications from your authorized mailbox, matches amount,
          UTR and receiver, then marks the order paid and fires your webhook. Credentials are encrypted with
          AES-256-GCM and isolated per merchant.
        </p>
      </Section>
      <Section heading="Company">
        <p>Zapgateway Technologies Pvt. Ltd. · Built in India · Serving merchants, bots and SaaS builders.</p>
      </Section>
    </PageShell>
  );
}
