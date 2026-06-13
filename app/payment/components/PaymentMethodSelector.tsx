import type { PaymentMethod } from '../lib/types';

interface Props {
  selected: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const methods: {
  id: PaymentMethod;
  label: string;
  sub: string;
  icon: React.ReactNode;
}[] = [
  {
    id: 'apple-pay',
    label: 'Apple Pay',
    sub: 'Fast & secure',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
      </svg>
    ),
  },
  {
    id: 'google-pay',
    label: 'Google Pay',
    sub: 'Quick checkout',
    icon: (
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
  },
  {
    id: 'credit-card',
    label: 'Credit Card',
    sub: 'Visa · MC · Amex',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
      </svg>
    ),
  },
  {
    id: 'debit-card',
    label: 'Debit Card',
    sub: 'Any bank card',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 15h.01" />
      </svg>
    ),
  },
];

export default function PaymentMethodSelector({ selected, onChange }: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-brand-blue-light rounded-xl flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <h2 className="font-bold text-gray-900 text-lg leading-tight">Payment Method</h2>
            <p className="text-gray-400 text-xs">Choose how you&apos;d like to pay</p>
          </div>
        </div>
      </div>

      <div className="p-4 grid grid-cols-2 gap-3">
        {methods.map((method) => {
          const isActive = selected === method.id;
          return (
            <button
              key={method.id}
              onClick={() => onChange(method.id)}
              className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all duration-200 text-left ${
                isActive
                  ? 'border-brand-blue bg-brand-blue-light shadow-sm'
                  : 'border-gray-100 bg-gray-50 hover:border-gray-200 hover:bg-white'
              }`}
            >
              <div
                className={`shrink-0 transition-colors ${
                  isActive ? 'text-brand-blue' : 'text-gray-400'
                }`}
              >
                {method.icon}
              </div>
              <div className="min-w-0">
                <p
                  className={`text-sm font-bold truncate ${
                    isActive ? 'text-brand-blue' : 'text-gray-700'
                  }`}
                >
                  {method.label}
                </p>
                <p className="text-xs text-gray-400 truncate">{method.sub}</p>
              </div>
              {isActive && (
                <div className="ml-auto shrink-0 w-5 h-5 bg-brand-blue rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
