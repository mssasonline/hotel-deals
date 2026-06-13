export type PaymentMethod = 'apple-pay' | 'google-pay' | 'credit-card' | 'debit-card';

export type PaymentStatus = 'idle' | 'processing' | 'success' | 'error';

export type CardNetworkType = 'visa' | 'mastercard' | 'amex' | null;

export interface CardDetails {
  cardholderName: string;
  cardNumber: string;
  expiryDate: string;
  cvv: string;
}

export interface PaymentRequest {
  method: PaymentMethod;
  amount: number;
  currency: string;
  bookingRef?: string;
  cardDetails?: CardDetails;
}

export interface PaymentResult {
  success: boolean;
  transactionId?: string;
  error?: string;
}

// Future payment provider configuration
export type PaymentProvider =
  | 'stripe'
  | 'checkout.com'
  | 'paytabs'
  | 'apple-pay'
  | 'google-pay';

export interface PaymentProviderConfig {
  provider: PaymentProvider;
  publicKey: string;
  mode: 'test' | 'live';
}
