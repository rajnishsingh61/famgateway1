# Zap Gateway

Act as a Principal Full-Stack Engineer and UX Designer. Build a modern, fully functional, production-ready Payment Gateway SaaS Web Application named "Nano Pay".

---

### 🎯 CORE CONCEPT & HUMAN-CENTRIC ARCHITECTURE
The system allows merchants (users) to register, connect their Gmail App Password (for automated FamPay/UPI verification), create API Keys, and accept automated UPI payments on their own websites, Telegram bots, or custom apps via REST API and Webhooks.

---

### 🎨 TECH STACK & UI/UX REQUIREMENTS
- Framework: Full-Stack React / Next.js / Node.js (or Python Flask/FastAPI depending on stack) with Tailwind CSS.
- Theme: Modern Dark/Light Mode with Sleek Cyberpunk/Minimalist Glassmorphism accent (like Stripe or Supabase UI).
- Icons: Lucide React.
- Mobile Responsive: 100% mobile-first design.

---

### 🛠️ REQUIRED FEATURES & MODULES TO GENERATE

#### 1. AUTHENTICATION MODULE (`/login`, `/register`)
- Email & Password Login / Register with JWT or Session Auth.
- Input validation, password strength checker, and smooth toast notifications.
- Dashboard route guard (protected routes).

#### 2. MERCHANT DASHBOARD (`/dashboard`)
- Metrics Overview Cards: Total Earnings (₹), Today's Transactions, Total Orders, Success Rate (%).
- Quick Integration Banner showing connection status.
- Chart showing daily revenue trends.

#### 3. PAYMENT SETTINGS & APP INTEGRATION (`/dashboard/settings`)
- Gmail IMAP Verification Form:
  - Input: FamPay Registered Email
  - Input: 16-digit Google App Password (masked for privacy)
  - Input: Merchant FamPay UPI ID (e.g., user@fam)
  - Status Badge: DISCONNECTED (Red) / CONNECTED (Green).
- Secure test button to verify IMAP connection instantly.

#### 4. DEVELOPER & API SUPPORT (`/dashboard/api-keys`)
- API Key Management: Generate, copy, and revoke `Public Key` and `Secret Key`.
- Webhook URL Config: Input field to set a URL where payment success payloads are automatically sent.
- Live Webhook Logs table showing recent delivery statuses (200 OK / Failed).

#### 5. TRANSACTIONS & HISTORY (`/dashboard/transactions`)
- Table showing: Order ID, Amount, Payer UPI/UTR, Status (Pending / Success / Failed), Date & Time.
- Search bar & Filter by status/date.
- Export to CSV button.

#### 6. TELEGRAM & WEB INTEGRATION DOCS (`/docs`)
- Interactive Documentation Page with tabbed code snippets for:
  - Python (Requests/Flask)
  - Node.js / JavaScript (Fetch)
  - PHP (cURL)
  - Telegram Bot Integration Example (Python-telegram-bot script snippet showing how to auto-accept payments in Telegram).

#### 7. PUBLIC CHECKOUT & API ENGINE (`/pay/<order_id>`)
- Hosted Checkout Page: When a customer visits a payment link, render:
  - Amount to pay.
  - Dynamically generated UPI QR Code.
  - Live 5-minute Countdown Timer.
  - Real-time Polling / WebSockets checking payment status every 3 seconds.
  - Smooth success redirect screen when payment is verified.

---

### ⚙️ BACKEND & BACKGROUND VERIFIER ENGINE LOGIC

1. Background Worker (IMAP Verifier):
   - Securely decrypts user's App Password in memory.
   - Listens to Gmail via IMAP for UNSEEN payment emails.
   - Parses UTR Number (12 digits) and Amount using Regex.
   - Matches with Pending Orders in the database.
   - On match: Marks Order as 'SUCCESS', stores UTR, and triggers Webhook to the merchant's configured Webhook URL.

2. API Endpoints:
   - `POST /api/v1/create-order` (Headers: `X-API-KEY`, Body: `amount`, `customer_email`) -> Returns `order_id`, `payment_url`, and `qr_code`.
   - `GET /api/v1/check-status/:order_id` -> Returns `{ status: "PENDING" | "SUCCESS", utr: "..." }`.

---

### 🔒 SECURITY & ERROR HANDLING
- Encrypt sensitive data like App Passwords at rest.
- Graceful error responses for invalid API keys, timeout issues, and failed IMAP authentications.

Please generate all necessary frontend pages, backend routes, database schemas, and clean component structures for this complete application.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/3bf98ea2-6d6d-4f86-b90f-c3b7684dab87).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
