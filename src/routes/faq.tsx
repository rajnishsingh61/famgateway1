import { createFileRoute } from "@tanstack/react-router";

import { PageShell } from "@/components/PageShell";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const title = "ZapGateway FAQ — UPI gateway questions answered";
const description =
  "Answers about Fam UPI setup, Gmail App Passwords, verification speed, webhooks, pricing and refunds on ZapGateway.";

export const Route = createFileRoute("/faq")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Faq,
});

const faqs: [string, string][] = [
  ["Do I need a company or merchant ID?", "No. You only need your own Fam UPI ID and a Gmail App Password. There is no MID, no onboarding and no MDR."],
  ["How fast is verification?", "The verifier polls your mailbox continuously; most payments settle within seconds of the bank notification arriving."],
  ["Is my Gmail App Password safe?", "It is encrypted with AES-256-GCM and only decrypted in memory to read unread payment mails."],
  ["Can I use two UPI IDs?", "No. One Fam UPI ID maps to one account, which keeps verification unambiguous."],
  ["What does it cost?", "10 days free, then ₹99/month Premium or ₹199/month Pro. Payments are made over UPI and approved by our team."],
  ["What if a webhook fails?", "Every attempt is logged with status, timing and error in Dashboard → Webhook logs, and can be replayed."],
];

function Faq() {
  return (
    <PageShell title="FAQ" subtitle="Everything merchants ask before going live.">
      <Accordion type="single" collapsible className="w-full">
        {faqs.map(([q, a]) => (
          <AccordionItem key={q} value={q}>
            <AccordionTrigger className="text-left text-foreground">{q}</AccordionTrigger>
            <AccordionContent>{a}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </PageShell>
  );
}
