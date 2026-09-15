import { createFileRoute } from "@tanstack/react-router";

function authorized(request: Request): boolean {
  const secret = process.env.VERIFIER_SECRET?.trim();
  const auth = request.headers.get("authorization") || "";
  const apiKey = request.headers.get("apikey") || "";
  if (secret) return auth === `Bearer ${secret}` || apiKey === secret;
  return Boolean(apiKey && apiKey === process.env.SUPABASE_PUBLISHABLE_KEY);
}

export const Route = createFileRoute("/api/public/hooks/verify")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
        try {
          const { runVerifier } = await import("@/lib/gateway.server");
          return Response.json({ ok: true, ...(await runVerifier()) });
        } catch (error) {
          console.error("verifier failed", error);
          return Response.json({ ok: false, error: error instanceof Error ? error.message : "Verifier failed" }, { status: 500 });
        }
      },
    },
  },
});
