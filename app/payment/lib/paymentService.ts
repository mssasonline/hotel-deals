import type { PaymentRequest, PaymentResult } from './types';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Mock processor — replace the body with a real provider SDK call
export async function processPayment(
  request: PaymentRequest,
): Promise<PaymentResult> {
  void request; // consumed by real implementation
  await delay(1800);
  return {
    success: true,
    transactionId: `TXN-${Date.now().toString(36).toUpperCase()}`,
  };
}

// ── Stripe (future) ──────────────────────────────────────
// import { loadStripe } from '@stripe/stripe-js';
// export async function processStripePayment(req: PaymentRequest): Promise<PaymentResult> {
//   const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PK!);
//   const { clientSecret } = await createPaymentIntent(req); // server action
//   const { error, paymentIntent } = await stripe!.confirmCardPayment(clientSecret, { ... });
//   return { success: !error, transactionId: paymentIntent?.id, error: error?.message };
// }

// ── Checkout.com (future) ────────────────────────────────
// export async function processCheckoutPayment(req: PaymentRequest): Promise<PaymentResult> { ... }

// ── PayTabs (future) ─────────────────────────────────────
// export async function processPayTabsPayment(req: PaymentRequest): Promise<PaymentResult> { ... }

// ── Apple Pay / Google Pay (future) ─────────────────────
// Both require a server-side payment session endpoint and merchant verification.
// export async function processApplePayPayment(req: PaymentRequest): Promise<PaymentResult> { ... }
// export async function processGooglePayPayment(req: PaymentRequest): Promise<PaymentResult> { ... }
