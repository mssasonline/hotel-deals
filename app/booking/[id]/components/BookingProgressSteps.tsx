'use client';

import { useTranslation } from '@/lib/i18n/useTranslation';

export default function BookingProgressSteps() {
  const t = useTranslation();

  const steps = [
    { label: t['booking.stepSearch'], done: true },
    { label: t['booking.stepHotelDetails'], done: true },
    { label: t['booking.stepYourBooking'], done: false, active: true },
    { label: t['booking.stepConfirmation'], done: false, active: false },
  ];

  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className={`flex items-center gap-2 text-sm font-medium ${
            step.active ? 'text-brand-blue' : step.done ? 'text-green-600' : 'text-gray-400'
          }`}>
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                step.done
                  ? 'bg-green-500 text-white'
                  : step.active
                  ? 'text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}
              style={step.active ? { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' } : {}}
            >
              {step.done ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                i + 1
              )}
            </div>
            <span className="hidden sm:inline whitespace-nowrap">{step.label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`h-0.5 w-8 sm:w-16 mx-2 ${step.done ? 'bg-green-300' : 'bg-gray-200'}`} />
          )}
        </div>
      ))}
    </div>
  );
}
