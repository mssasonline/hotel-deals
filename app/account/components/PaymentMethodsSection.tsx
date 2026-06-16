'use client';

import type { getTranslations } from '@/lib/i18n/translations';
import type { SavedCard } from '../types';
import { networkBadge, INPUT_CLASS } from '../utils';

type Translations = ReturnType<typeof getTranslations>;

interface AddCardState {
  cardNumber: string;
  cardHolder: string;
  expiry: string;
  cvv: string;
}

interface PaymentMethodsSectionProps {
  savedCards: SavedCard[];
  showAddCard: boolean;
  setShowAddCard: (v: boolean) => void;
  addCard: AddCardState;
  setAddCard: React.Dispatch<React.SetStateAction<AddCardState>>;
  addCardError: string;
  addCardSaving: boolean;
  onAddCard: () => void;
  onDeleteCard: (cardId: number) => void;
  onSetDefault: (cardId: number) => void;
  t: Translations;
}

export function PaymentMethodsSection({
  savedCards,
  showAddCard,
  setShowAddCard,
  addCard,
  setAddCard,
  addCardError,
  addCardSaving,
  onAddCard,
  onDeleteCard,
  onSetDefault,
  t,
}: PaymentMethodsSectionProps) {
  return (
    <>
      <section className="mb-6">
        <h2 className="text-base font-bold text-gray-900 mb-3 px-1">{t['account.paymentMethods']}</h2>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-6 py-3.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {t['account.paymentCards']}
            </p>
            <button
              onClick={() => { setShowAddCard(true); }}
              className="flex items-center gap-1.5 text-sm text-brand-blue hover:text-blue-700 font-semibold transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
              </svg>
              {t['account.addCard']}
            </button>
          </div>

          {savedCards.length === 0 ? (
            <div className="px-6 py-12 flex flex-col items-center text-center">
              <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-3">
                <svg className="w-7 h-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
              </div>
              <p className="text-sm font-semibold text-gray-700">{t['account.noSavedCards']}</p>
              <p className="text-xs text-gray-400 mt-1 max-w-xs">{t['account.noSavedCardsDesc']}</p>
              <button
                onClick={() => { setShowAddCard(true); }}
                className="mt-4 flex items-center gap-2 px-5 py-2.5 border border-brand-blue text-brand-blue text-sm font-semibold rounded-lg hover:bg-brand-blue-light transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t['account.addCard']}
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-gray-50">
              {savedCards.map((card) => {
                const badge = networkBadge(card.network);
                return (
                  <li key={card.id} className="px-6 py-4 flex items-center gap-4">
                    <span className={`shrink-0 px-2 py-0.5 text-xs font-bold border rounded ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900">
                        •••• •••• •••• {card.last_four}
                      </p>
                      <p className="text-xs text-gray-400">{card.card_holder} · {card.expiry}</p>
                    </div>
                    {card.is_default ? (
                      <span className="shrink-0 text-xs font-semibold text-brand-blue bg-brand-blue-light px-2 py-0.5 rounded-full">
                        Default
                      </span>
                    ) : (
                      <button
                        onClick={() => onSetDefault(card.id)}
                        className="shrink-0 text-xs text-gray-400 hover:text-brand-blue transition-colors"
                      >
                        Set default
                      </button>
                    )}
                    <button
                      onClick={() => onDeleteCard(card.id)}
                      className="shrink-0 text-gray-300 hover:text-red-500 transition-colors"
                      title="Remove card"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {showAddCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-900">{t['account.addCard']}</h3>
              <button onClick={() => setShowAddCard(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              {addCardError && (
                <p className="text-sm text-red-500 bg-red-50 px-3 py-2 rounded-lg">{addCardError}</p>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t['payment.cardNumber']}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 5678 9012 3456"
                  value={addCard.cardNumber}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
                    setAddCard(p => ({ ...p, cardNumber: v }));
                  }}
                  className={INPUT_CLASS}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">{t['payment.cardHolder']}</label>
                <input
                  type="text"
                  placeholder={t['payment.cardNamePlaceholder']}
                  value={addCard.cardHolder}
                  onChange={e => setAddCard(p => ({ ...p, cardHolder: e.target.value }))}
                  className={INPUT_CLASS}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t['payment.expiry']}</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="MM/YY"
                    value={addCard.expiry}
                    onChange={e => {
                      const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                      const v = digits.length >= 3 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
                      setAddCard(p => ({ ...p, expiry: v }));
                    }}
                    className={INPUT_CLASS}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">{t['payment.cvv']}</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    placeholder="•••"
                    maxLength={4}
                    value={addCard.cvv}
                    onChange={e => setAddCard(p => ({ ...p, cvv: e.target.value.replace(/\D/g, '').slice(0, 4) }))}
                    className={INPUT_CLASS}
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={onAddCard}
                disabled={addCardSaving}
                className="flex-1 py-2.5 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' }}
              >
                {addCardSaving ? t['account.saving'] : t['account.save']}
              </button>
              <button
                onClick={() => setShowAddCard(false)}
                disabled={addCardSaving}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                {t['account.cancel']}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
