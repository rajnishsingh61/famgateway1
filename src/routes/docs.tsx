import { Link, createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Check, Copy } from "lucide-react";
import { toast } from "sonner";

import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const title = "API Documentation — Nano Pay UPI Payments";
const description =
  "Integrate Nano Pay in Python, Node.js, PHP or a Telegram bot. Create orders, poll status and handle webhooks.";

export const Route = createFileRoute("/docs")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
    ],
  }),
  component: DocsPage,
});

const BASE = "https://famgateway.lovable.app";

const snippets: Record<string, string> = {
  python: `import requests

BASE = "${BASE}"
SECRET = "PAYFLUX_A1B2C3D_RAJNISH_9F8E7D6C5B4A"

# 1. Create an order
res = requests.post(
    f"{BASE}/api/public/v1/create-order",
    headers={"X-API-KEY": SECRET, "Content-Type": "application/json"},
    json={"amount": 249, "customer_email": "buyer@example.com", "note": "Pro plan"},
    timeout=15,
)
res.raise_for_status()
order = res.json()
print(order["payment_url"], order["qr_code"])

# 2. Poll the status
status = requests.get(
    f"{BASE}/api/public/v1/check-status/{order['order_id']}",
    headers={"X-API-KEY": SECRET},
    timeout=15,
).json()
print(status["status"], status.get("utr"))`,

  node: `const BASE = "${BASE}";
const SECRET = "PAYFLUX_A1B2C3D_RAJNISH_9F8E7D6C5B4A";

const res = await fetch(\`\${BASE}/api/public/v1/create-order\`, {
  method: "POST",
  headers: { "X-API-KEY": SECRET, "Content-Type": "application/json" },
  body: JSON.stringify({ amount: 249, customer_email: "buyer@example.com" }),
});
const order = await res.json();
console.log(order.payment_url);

// Poll every 3 seconds until settled
const poll = setInterval(async () => {
  const s = await fetch(
    \`\${BASE}/api/public/v1/check-status/\${order.order_id}\`,
    { headers: { "X-API-KEY": SECRET } },
  ).then((r) => r.json());
  if (s.status !== "PENDING") {
    clearInterval(poll);
    console.log("Final status:", s.status, s.utr);
  }
}, 3000);`,

  php: `<?php
$base   = "${BASE}";
$secret = "PAYFLUX_A1B2C3D_RAJNISH_9F8E7D6C5B4A";

$ch = curl_init("$base/api/public/v1/create-order");
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST           => true,
  CURLOPT_HTTPHEADER     => ["X-API-KEY: $secret", "Content-Type: application/json"],
  CURLOPT_POSTFIELDS     => json_encode(["amount" => 249, "note" => "Pro plan"]),
]);
$order = json_decode(curl_exec($ch), true);
curl_close($ch);

echo $order["payment_url"];`,

  telegram: `# Telegram bot — NO webhook needed.
# The bot just sends the external payment link and polls verification.
import asyncio, requests
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, ContextTypes

BASE, API_KEY = "${BASE}", "PAYFLUX_A1B2C3D_RAJNISH_9F8E7D6C5B4A"

async def buy(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    order = requests.post(
        f"{BASE}/api/public/v1/create-order",
        headers={"X-API-KEY": API_KEY},
        json={"amount": 99, "note": f"tg:{update.effective_user.id}"},
    ).json()

    # order["payment_url"] -> ${BASE}/api/payment/<order_id>
    kb = InlineKeyboardMarkup(
        [[InlineKeyboardButton("Pay with UPI", url=order["payment_url"])]]
    )
    await update.message.reply_photo(
        order["qr_code"], caption="Scan the QR or tap the button to pay Rs.99", reply_markup=kb
    )

    # External verification — plain GET on the same URL, no webhook, no key
    for _ in range(100):
        await asyncio.sleep(3)
        s = requests.get(order["verify_url"], timeout=15).json()
        if s["status"] == "SUCCESS":
            await update.message.reply_text(f"Payment received! UTR {s['utr']}. Access unlocked.")
            return
        if s["status"] == "FAILED":
            await update.message.reply_text("Payment window expired. Send /buy to retry.")
            return

app = Application.builder().token("TELEGRAM_BOT_TOKEN").build()
app.add_handler(CommandHandler("buy", buy))
app.run_polling()`,

  kotlin: `// Simple Kotlin — no webhook, just the payment link + verification URL
import java.net.HttpURLConnection
import java.net.URL
import org.json.JSONObject

const val BASE = "${BASE}"
const val API_KEY = "PAYFLUX_A1B2C3D_RAJNISH_9F8E7D6C5B4A"

fun createOrder(amount: Int): JSONObject {
    val conn = URL("$BASE/api/public/v1/create-order").openConnection() as HttpURLConnection
    conn.requestMethod = "POST"
    conn.doOutput = true
    conn.setRequestProperty("X-API-KEY", API_KEY)
    conn.setRequestProperty("Content-Type", "application/json")
    conn.outputStream.write(JSONObject().put("amount", amount).toString().toByteArray())
    return JSONObject(conn.inputStream.bufferedReader().readText())
}

fun checkStatus(verifyUrl: String): String =
    JSONObject(URL(verifyUrl).readText()).getString("status")

fun main() {
    val order = createOrder(249)
    println("Open this link to pay: " + order.getString("payment_url"))

    while (true) {
        Thread.sleep(3000)
        val status = checkStatus(order.getString("verify_url"))
        if (status != "PENDING") { println("Final status: $status"); break }
    }
}`,

  vanilla: `<!-- Vanilla JS checkout button — call your own backend, never expose the secret key -->
<button id="pay">Pay ₹249</button>
<div id="qr"></div>

<script>
document.getElementById("pay").addEventListener("click", async () => {
  // your server proxies this call and adds the X-API-KEY header
  const order = await fetch("/my-backend/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ amount: 249 }),
  }).then((r) => r.json());

  document.getElementById("qr").innerHTML =
    '<img src="' + order.qr_code + '" alt="UPI QR code" width="240">' +
    '<p><a href="' + order.payment_url + '">Open hosted checkout</a></p>';

  const timer = setInterval(async () => {
    const s = await fetch("/my-backend/status/" + order.order_id).then((r) => r.json());
    if (s.status === "SUCCESS") {
      clearInterval(timer);
      alert("Payment received! UTR " + s.utr);
    } else if (s.status === "FAILED") {
      clearInterval(timer);
      alert("Payment window expired.");
    }
  }, 3000);
});
<\/script>`,

  flask: `# Flask backend — keeps the secret key server-side
import os, requests
from flask import Flask, jsonify, request

app = Flask(__name__)
BASE = "${BASE}"
SECRET = os.environ["ZAPGATEWAY_API_KEY"]
HEADERS = {"X-API-KEY": SECRET, "Content-Type": "application/json"}

@app.post("/create-order")
def create_order():
    payload = request.get_json(force=True)
    res = requests.post(
        f"{BASE}/api/public/v1/create-order",
        headers=HEADERS,
        json={"amount": payload["amount"], "customer_email": payload.get("email")},
        timeout=15,
    )
    return jsonify(res.json()), res.status_code

@app.get("/status/<order_id>")
def status(order_id):
    # No API key needed — the shareable order URL returns JSON
    res = requests.get(f"{BASE}/api/payment/{order_id}?format=json", timeout=15)
    return jsonify(res.json()), res.status_code


if __name__ == "__main__":
    app.run(port=5000)`,

  verify: `# Pay in a browser (no app, no bot):
${BASE}/api/payment/ZG1A2B3C4DXYZ

# Verify the same order from anywhere (no API key needed):
curl ${BASE}/api/payment/ZG1A2B3C4DXYZ?format=json

{
  "order_id": "ZG1A2B3C4DXYZ",
  "amount": 249,
  "currency": "INR",
  "status": "SUCCESS",
  "utr": "412345678901",
  "paid_at": "2026-01-01T10:00:00.000Z",
  "expires_at": "2026-01-01T10:05:00.000Z"
}`,
};

function Code({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => {
          navigator.clipboard.writeText(code);
          setCopied(true);
          toast.success("Copied to clipboard");
          setTimeout(() => setCopied(false), 1500);
        }}
        aria-label="Copy code"
        className="absolute top-3 right-3 rounded-md border border-border bg-background/80 p-2 text-muted-foreground backdrop-blur transition-colors hover:text-foreground"
      >
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </button>
      <pre className="overflow-x-auto rounded-xl border border-border bg-surface-2 p-5 font-mono text-xs leading-relaxed">
        <code>{code}</code>
      </pre>
    </div>
  );
}

function DocsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button asChild variant="ghost" size="sm">
              <Link to="/">
                <ArrowLeft className="size-4" /> Home
              </Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-12 px-4 py-12">
        <div>
          <h1 className="text-3xl font-bold md:text-4xl">Developer documentation</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Two REST endpoints and one shareable verification link — no webhook required. Authenticate every
            request with your single API key in the{" "}
            <span className="font-mono text-foreground">X-API-KEY</span> header.
          </p>

        </div>

        <section className="panel p-6">
          <h2 className="text-xl font-semibold">Endpoints</h2>
          <div className="mt-5 space-y-4 text-sm">
            <div className="rounded-lg bg-surface-2 p-4">
              <p className="font-mono text-xs">
                <span className="text-success">POST</span> /api/public/v1/create-order
              </p>
              <p className="mt-2 text-muted-foreground">
                Body: <span className="font-mono">amount</span> (required),{" "}
                <span className="font-mono">customer_email</span>, <span className="font-mono">note</span>,{" "}
                <span className="font-mono">expires_in_minutes</span>. Returns{" "}
                <span className="font-mono">order_id</span>, <span className="font-mono">payment_url</span>,{" "}
                <span className="font-mono">upi_uri</span> and <span className="font-mono">qr_code</span>.
              </p>
            </div>
            <div className="rounded-lg bg-surface-2 p-4">
              <p className="font-mono text-xs">
                <span className="text-primary">GET</span> /api/public/v1/check-status/:order_id
              </p>
              <p className="mt-2 text-muted-foreground">
                Returns <span className="font-mono">{`{ status: "PENDING" | "SUCCESS" | "FAILED", utr }`}</span>.
                Poll every 3 seconds.
              </p>
            </div>
            <div className="rounded-lg bg-surface-2 p-4">
              <p className="text-xs font-medium">Errors</p>
              <p className="mt-2 text-muted-foreground">
                <span className="font-mono">401</span> invalid or revoked key ·{" "}
                <span className="font-mono">400</span> validation failure ·{" "}
                <span className="font-mono">404</span> unknown order ·{" "}
                <span className="font-mono">409</span> merchant has no UPI ID configured.
              </p>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-xl font-semibold">Quick start</h2>
          <Tabs defaultValue="python" className="mt-5">
            <TabsList className="flex w-full flex-wrap">
              <TabsTrigger value="python">Python</TabsTrigger>
              <TabsTrigger value="node">Node.js</TabsTrigger>
              <TabsTrigger value="php">PHP</TabsTrigger>
              <TabsTrigger value="telegram">Telegram bot</TabsTrigger>
              <TabsTrigger value="kotlin">Kotlin / Android</TabsTrigger>
              <TabsTrigger value="vanilla">Vanilla JS</TabsTrigger>
              <TabsTrigger value="flask">Flask</TabsTrigger>
            </TabsList>
            {(["python", "node", "php", "telegram", "kotlin", "vanilla", "flask"] as const).map((k) => (
              <TabsContent key={k} value={k} className="mt-4">
                <Code code={snippets[k]!} />
              </TabsContent>
            ))}
          </Tabs>
        </section>

        <section>
          <h2 className="text-xl font-semibold">External verification link</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            No webhook required. Every order gets one shareable URL that works for both paying and verifying —
            open it in a browser and the customer lands on the hosted UPI checkout, request it as JSON and you
            get the live payment status.
          </p>
          <div className="mt-4">
            <Code code={snippets["verify"]!} />
          </div>
        </section>
      </main>
    </div>
  );
}
