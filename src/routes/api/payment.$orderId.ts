import { createFileRoute } from "@tanstack/react-router";

import { corsPreflight, handlePaymentLink } from "@/lib/payment-link.server";

/** Friendly external link: famgateway.lovable.app/api/payment/<order_id> */
export const Route = createFileRoute("/api/payment/$orderId")({
  server: {
    handlers: {
      OPTIONS: async () => corsPreflight(),
      GET: async ({ request, params }) => handlePaymentLink(request, params.orderId),
    },
  },
});
