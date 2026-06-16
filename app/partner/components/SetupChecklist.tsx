'use client';

import Link from 'next/link';
import { useState } from 'react';

export interface SetupProgress {
  hasDescription: boolean;
  hasLocation: boolean;
  hasRooms: boolean;
  hasAmenities: boolean;
  hasImages: boolean;
}

interface ChecklistItem {
  key: keyof SetupProgress;
  label: string;
  hint: string;
  href: string;
  icon: React.ReactNode;
}

const ITEMS: ChecklistItem[] = [
  {
    key: 'hasImages',
    label: 'Add hotel photos',
    hint: 'Upload cover & gallery images to attract more guests.',
    href: '/partner/hotels',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
  },
  {
    key: 'hasDescription',
    label: 'Write a hotel description',
    hint: 'Tell guests what makes your hotel special.',
    href: '/partner/hotels',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
      </svg>
    ),
  },
  {
    key: 'hasRooms',
    label: 'Add your first room',
    hint: 'Guests can only book if you have at least one room listed.',
    href: '/partner/rooms',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
      </svg>
    ),
  },
  {
    key: 'hasLocation',
    label: 'Set your location on the map',
    hint: 'Help guests find you by pinning your exact coordinates.',
    href: '/partner/hotels',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
  {
    key: 'hasAmenities',
    label: 'Select your amenities',
    hint: 'Pool, gym, free Wi-Fi — help guests know what to expect.',
    href: '/partner/hotels',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
];

export default function SetupChecklist({ progress }: { progress: SetupProgress }) {
  const [collapsed, setCollapsed] = useState(false);

  const total = ITEMS.length;
  const done  = ITEMS.filter(i => progress[i.key]).length;
  const pct   = Math.round((done / total) * 100);
  const allDone = done === total;

  if (allDone) return null;

  return (
    <div className="bg-white rounded-2xl border border-brand-blue/20 shadow-sm overflow-hidden mb-6">
      {/* Header */}
      <button
        type="button"
        onClick={() => setCollapsed(p => !p)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0">
            <svg className="w-5 h-5 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-900 text-sm">Complete your hotel setup</p>
            <p className="text-xs text-gray-400 mt-0.5">{done} of {total} steps done</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Progress ring */}
          <div className="relative w-10 h-10 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
              <circle
                cx="18" cy="18" r="15.9" fill="none"
                stroke="#2563EB" strokeWidth="3"
                strokeDasharray={`${pct} ${100 - pct}`}
                strokeDashoffset="0"
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-brand-blue">
              {pct}%
            </span>
          </div>

          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <div
          className="h-full bg-brand-blue rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Checklist items */}
      {!collapsed && (
        <div className="divide-y divide-gray-50 px-6 py-2">
          {ITEMS.map(item => {
            const isDone = progress[item.key];
            return (
              <div key={item.key} className="flex items-center gap-4 py-3">
                {/* Status icon */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all ${
                  isDone
                    ? 'bg-green-100 text-green-600'
                    : 'border-2 border-gray-200 text-gray-300'
                }`}>
                  {isDone ? (
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-gray-200" />
                  )}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isDone ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                    {item.label}
                  </p>
                  {!isDone && (
                    <p className="text-xs text-gray-400 mt-0.5">{item.hint}</p>
                  )}
                </div>

                {/* Action icon */}
                {!isDone && (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-lg text-brand-blue bg-brand-blue/8`}>
                      {item.icon}
                    </span>
                    <Link
                      href={item.href}
                      className="text-xs font-semibold text-brand-blue hover:underline whitespace-nowrap"
                    >
                      Go →
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
