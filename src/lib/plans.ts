export const PLATFORM_UPI_ID = "7079383841@ybl";
export const PLATFORM_UPI_NAME = "ZapGateway";

export type PlanId = "premium" | "pro";

export const PLANS: Record<PlanId, { id: PlanId; name: string; price: number; tagline: string; features: string[] }> = {
  premium: {
    id: "premium",
    name: "Premium",
    price: 99,
    tagline: "For solo builders going live",
    features: [
      "1 Fam UPI ID connected",
      "Unlimited UPI collection orders",
      "Automatic UTR verification engine",
      "Hosted checkout + dynamic QR",
      "Webhooks with delivery logs",
      "Email support",
    ],
  },
  pro: {
    id: "pro",
    name: "Pro",
    price: 199,
    tagline: "For teams and high-volume bots",
    features: [
      "Everything in Premium",
      "Priority verification queue (faster settles)",
      "Webhook replay + extended logs",
      "Multiple API key pairs",
      "Telegram bot & app integration support",
      "Priority support",
    ],
  },
};

export const TRIAL_DAYS = 10;

export function buildPlatformUpiUri(amount: number, reference: string): string {
  const params = new URLSearchParams({
    pa: PLATFORM_UPI_ID,
    pn: PLATFORM_UPI_NAME,
    am: amount.toFixed(2),
    cu: "INR",
    tn: reference,
  });
  return `upi://pay?${params.toString()}`;
}

export function qrImageUrl(upiUri: string, size = 340): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(upiUri)}`;
}
