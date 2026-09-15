import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, handlePaymentLink } from "@/lib/payment-link.server";

export const Route = createFileRoute("/api/public/payment/$orderId")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async ({ request, params }) => handlePaymentLink(request, params.orderId),
    },
  },
});
