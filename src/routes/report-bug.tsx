import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";

import { PageShell, Section } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SUPPORT_EMAIL } from "@/lib/brand";

const title = "Report a Bug — ZapGateway";
const description =
  "Found a problem with checkout, verification or the dashboard? Send the ZapGateway team a detailed bug report.";

export const Route = createFileRoute("/report-bug")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: ReportBug,
});

function ReportBug() {
  const [where, setWhere] = useState("");
  const [steps, setSteps] = useState("");
  const [email, setEmail] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const body = encodeURIComponent(`Where: ${where}\n\nSteps / expected vs actual:\n${steps}\n\nReporter: ${email}`);
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Bug report")}&body=${body}`;
    toast.success("Opening your mail app…");
  }

  return (
    <PageShell title="Report a Bug" subtitle="The more detail you give, the faster we can ship a fix.">
      <Section heading="Bug details">
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="where">Where did it happen?</Label>
            <Input
              id="where"
              placeholder="Checkout page / Dashboard → Settings / API"
              value={where}
              onChange={(e) => setWhere(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="steps">Steps to reproduce</Label>
            <Textarea id="steps" rows={6} value={steps} onChange={(e) => setSteps(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Your email</Label>
            <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <Button type="submit">Submit report</Button>
        </form>
      </Section>
    </PageShell>
  );
}
