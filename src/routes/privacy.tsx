import { createFileRoute } from "@tanstack/react-router";

import { PageShell, Section } from "@/components/PageShell";
import { SUPPORT_EMAIL } from "@/lib/brand";

const title = "Privacy Policy — ZapGateway";
const description =
  "How ZapGateway collects, encrypts and uses merchant data, mailbox credentials and payment records.";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Privacy,
});

function Privacy() {
  return (
    <PageShell title="Privacy Policy" subtitle="Last updated: August 2026">
      <Section heading="What we collect">
        <p>
          Account details (name, business name, email), your Fam UPI ID, your Gmail address and App Password,
          webhook URLs, and payment records created through the gateway.
        </p>
      </Section>
      <Section heading="How mailbox credentials are handled">
        <p>
          App Passwords are encrypted with AES-256-GCM before storage and are only decrypted in memory by the
          verification engine to read unread payment notifications. We never read unrelated mail, and we never
          display the password back to you.
        </p>
      </Section>
      <Section heading="How we use data">
        <p>
          To verify payments, deliver webhooks, show analytics, process subscriptions and provide support. We
          do not sell personal data. Advertising partners may set cookies on public pages.
        </p>
      </Section>
      <Section heading="Retention and deletion">
        <p>
          Order and webhook logs are retained while your account is active. You can request deletion of your
          account and credentials at any time by emailing {SUPPORT_EMAIL}.
        </p>
      </Section>
      <Section heading="Your rights">
        <p>Access, correction, export and deletion requests are honoured within 30 days.</p>
      </Section>
    </PageShell>
  );
}
