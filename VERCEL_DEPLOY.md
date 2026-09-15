# Nano Pay — Vercel deployment

## Required Vercel Environment Variables

- `SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_PROJECT_ID`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- `VITE_SUPABASE_PROJECT_ID`
- `BREVO_API_KEY` (server only)
- `BREVO_SENDER_EMAIL` (must be verified in Brevo)
- `BREVO_SENDER_NAME`
- `APP_BASE_URL` (your production Vercel URL)
- `VERIFIER_SECRET` (optional; recommended for manual/external verifier calls)

## Email

Application transactional emails use the Brevo REST API from server-side code. The Brevo API key is never exposed to browser code.

## Payment verification

The Telegram integration should poll `GET /api/public/v1/check-status/:orderId` with `X-API-KEY`. While an order is pending, that endpoint throttles the Gmail verifier to one scan per merchant every 10 seconds. This avoids requiring a long-running worker on Vercel.

The verifier requires the payment email to contain:

1. the exact generated order ID in the payment purpose/note field;
2. the exact order amount;
3. a 12-digit UTR/RRN.

Amount-only matching is intentionally not used.

## Supabase

Apply all files in `supabase/migrations/` to the project. The final hardening migration adds a unique partial index for UTRs and pending-order lookup indexes.

## Important

Supabase Auth's built-in password-reset/auth emails are controlled by Supabase Auth configuration. The Brevo integration in this repository handles application transactional messages such as order-created and payment-success notifications.
