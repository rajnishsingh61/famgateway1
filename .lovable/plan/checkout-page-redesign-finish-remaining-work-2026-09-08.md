# Checkout page redesign + finish remaining work

## 1. Payment page redesigned like your screenshot

Rebuild `/pay/:orderId` to match the layout you sent:

- A clean card floating on a soft grey background, with a blue "shadow" card offset behind it (the layered look).
- Logo at the top of the card.
- "ORDER TOTAL" label, then the amount in very large bold type with a small "INR" beside it.
- Inner white panel holding the QR code, with the caption "SCAN WITH ANY UPI APP".
- A "Save QR" button that downloads the QR image.
- A details list with dividers: Merchant, Order ID, Expires In (live countdown), Verification (a pill showing "Waiting for payment…" / "Payment received" / "Expired").
- On phones: an "Open UPI app" button and tap-to-copy UPI ID stay available.
- Success and expired states keep working, styled to match the new card.

## 2. Finish the leftover documentation wording

- Replace the old intro line "Two REST endpoints and one webhook… secret key" with wording for the single API key and the no-webhook verification link.
- Tidy the Flask example's verification section so it uses the shareable order URL.

## 3. Verify

- Run the type check and a production build.
- Load the payment page and docs page in a browser to confirm they render.

## Technical notes

- Only `src/routes/pay.$orderId.tsx` and `src/routes/docs.tsx` change; no backend, database, or API changes.
- QR generation stays client-side via `qrcode`; "Save QR" uses the existing data URL as a download link.
- Status polling every 3 s via `getOrderStatus` stays as-is.
- New card styling uses existing design tokens (surface/border/primary), no hardcoded colors.
