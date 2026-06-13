'use client';

import CurrencyAmount from '@/app/components/CurrencyAmount';

interface Props {
  onPay: () => void;
  isProcessing: boolean;
  totalPrice: number;
}

export default function ApplePaySection({ onPay, isProcessing, totalPrice }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100 flex items-center gap-3">
        <div className="w-9 h-9 bg-gray-900 rounded-xl flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
          </svg>
        </div>
        <div>
          <h2 className="font-bold text-gray-900 text-lg leading-tight">Apple Pay</h2>
          <p className="text-gray-400 text-xs">Fast and secure payment with Apple Pay</p>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        {/* Message */}
        <div className="bg-gray-50 rounded-xl px-4 py-4 flex items-start gap-3">
          <div className="w-8 h-8 bg-gray-900 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <div>
            <p className="text-gray-800 text-sm font-semibold">Touch ID or Face ID</p>
            <p className="text-gray-500 text-xs mt-0.5">
              Authenticate instantly using biometrics stored on your device. Your card details never leave your phone.
            </p>
          </div>
        </div>

        {/* Apple Pay button */}
        <button
          onClick={onPay}
          disabled={isProcessing}
          className="w-full bg-gray-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all duration-200 shadow-lg shadow-gray-900/25 hover:shadow-gray-900/40 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-3 text-lg"
        >
          {isProcessing ? (
            <>
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </>
          ) : (
            <>
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Pay <CurrencyAmount amount={totalPrice} /> with Apple Pay
            </>
          )}
        </button>

        <p className="text-center text-gray-400 text-xs">
          Apple Pay uses Touch ID or Face ID to verify your identity
        </p>
      </div>
    </div>
  );
}
