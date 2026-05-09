

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key

Optional billing setup:
- Add Stripe credentials to `backend/.env` or environment variables: `STRIPE_API_KEY` and `STRIPE_PRICE_ID` to enable a weekly ₹9 subscription flow when users exceed the free quota.
- The backend will create a Checkout Session when the daily free limit is reached and will return a `subscribe_url` in the 402 response detail for clients to redirect to.
- PhonePe QR (dev): drop your `phonepe-qr.png` into the `public/` folder (or ask me and I'll add it). The billing modal supports manual payment via PhonePe QR — users can scan and pay; then an admin can verify and activate subscriptions. For development convenience there is also an 'I've Paid (Dev)' button that posts to `/api/billing/mock-subscribe` when `ALLOW_DEV_PAYMENTS=true` in `.env` (do not enable this in production).3. Run the app:
   `npm run dev`
