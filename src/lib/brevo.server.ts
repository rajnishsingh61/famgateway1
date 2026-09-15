const BREVO_ENDPOINT = "https://api.brevo.com/v3/smtp/email";

function env(name: string): string {
  return process.env[name]?.trim() ?? "";
}

export type TransactionalEmail = {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  text?: string;
  tags?: string[];
};

/**
 * Sends transactional mail through Brevo's API. Missing Brevo configuration is
 * treated as a disabled mail channel so payment processing is not blocked.
 */
export async function sendBrevoEmail(input: TransactionalEmail): Promise<{ sent: boolean; messageId?: string; error?: string }> {
  const apiKey = env("BREVO_API_KEY");
  const senderEmail = env("BREVO_SENDER_EMAIL");
  const senderName = env("BREVO_SENDER_NAME") || "Nano Pay";

  if (!apiKey || !senderEmail) {
    return { sent: false, error: "Brevo is not configured" };
  }

  try {
    const response = await fetch(BREVO_ENDPOINT, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: { email: senderEmail, name: senderName },
        to: [{ email: input.to, ...(input.toName ? { name: input.toName } : {}) }],
        subject: input.subject,
        htmlContent: input.html,
        ...(input.text ? { textContent: input.text } : {}),
        ...(input.tags?.length ? { tags: input.tags } : {}),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as { messageId?: string; message?: string };
    if (!response.ok) {
      return { sent: false, error: payload.message || `Brevo HTTP ${response.status}` };
    }
    return { sent: true, messageId: payload.messageId };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : "Brevo request failed" };
  }
}

export function orderCreatedEmail(orderId: string, amount: number, checkoutUrl: string, expiresAt: string) {
  return {
    subject: `Payment request ${orderId}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2>Payment request created</h2><p>Order <strong>${escapeHtml(orderId)}</strong> is waiting for payment.</p><p>Amount: <strong>₹${amount.toFixed(2)}</strong></p><p><a href="${escapeHtml(checkoutUrl)}">Open payment page</a></p><p>Expires: ${escapeHtml(new Date(expiresAt).toLocaleString("en-IN"))}</p></div>`,
    text: `Payment request ${orderId}\nAmount: ₹${amount.toFixed(2)}\nPay: ${checkoutUrl}\nExpires: ${expiresAt}`,
  };
}

export function paymentSuccessEmail(orderId: string, amount: number, utr: string | null, checkoutUrl: string) {
  return {
    subject: `Payment received — ${orderId}`,
    html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:auto"><h2>Payment received</h2><p>Order <strong>${escapeHtml(orderId)}</strong> has been confirmed.</p><p>Amount: <strong>₹${amount.toFixed(2)}</strong></p><p>UTR: <strong>${escapeHtml(utr || "Not available")}</strong></p><p><a href="${escapeHtml(checkoutUrl)}">View payment status</a></p></div>`,
    text: `Payment received\nOrder: ${orderId}\nAmount: ₹${amount.toFixed(2)}\nUTR: ${utr || "Not available"}\n${checkoutUrl}`,
  };
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char] ?? char);
}
