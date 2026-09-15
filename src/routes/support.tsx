import { createFileRoute } from "@tanstack/react-router";

import { PageShell, Section } from "@/components/PageShell";
import { SUPPORT_EMAIL } from "@/lib/brand";

const title = "ZapGateway Support — setup, verification and webhook help";
const description =
  "Get help connecting your Fam UPI ID, fixing verification issues, retrying webhooks and managing your ZapGateway subscription.";

export const Route = createFileRoute("/support")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Support,
});

function Support() {
  return (
    <PageShell title="Support" subtitle="Common fixes first — then reach us directly.">
      <Section heading="Payments not verifying">
        <p>
          Check that your Gmail App Password is still valid, the Fam UPI ID in Settings matches the receiver in
          the payment mail, and the order amount is exact. Run “Test connection” in Dashboard → Settings.
        </p>
      </Section>
      <Section heading="Webhook not received">
        <p>
          Open Dashboard → Webhook logs to see each attempt, HTTP status and last error. Your endpoint must
          answer with 2xx within 10 seconds over HTTPS.
        </p>
      </Section>
      <Section heading="Billing and plans">
        <p>
          Upgrades are approved manually after your UPI payment. If a payment is not approved within a few
          hours, email us with the UTR.
        </p>
      </Section>
      <Section heading="Still stuck?">
        <p>Email {SUPPORT_EMAIL} with your merchant email and order ID. We reply within one business day.</p>
      </Section>
    </PageShell>
  );
}
