import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell, Section } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT_EMAIL } from "@/lib/brand";

const title = "Contact ZapGateway — talk to our payments team";
const description =
  "Reach the ZapGateway team for sales, integration help or partnership questions. We usually reply within one business day.";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: Contact,
});

function Contact() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("ZapGateway enquiry")}&body=${body}`;
    toast.success("Opening your mail app…");
  }

  return (
    <PageShell title="Contact" subtitle="Questions about pricing, integrations or partnerships?">
      <Section heading="Send us a message">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} required />
          </div>
          <Button type="submit">Send message</Button>
        </form>
      </Section>
      <Section heading="Direct">
        <p>Email: {SUPPORT_EMAIL}</p>
        <p>Support hours: Mon–Sat, 10:00–19:00 IST.</p>
      </Section>
    </PageShell>
  );
}
