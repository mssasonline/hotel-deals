'use client';

export interface SavedCard {
  id: number;
  card_holder: string;
  last_four: string;
  network: string;
  expiry: string;
  is_default: boolean;
}

interface Props {
  cards: SavedCard[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
}

function networkBadge(network: string) {
  const map: Record<string, { label: string; cls: string }> = {
    visa:       { label: 'VISA', cls: 'text-blue-700 bg-blue-50 border-blue-200' },
    mastercard: { label: 'MC',   cls: 'text-orange-700 bg-orange-50 border-orange-200' },
    amex:       { label: 'AMEX', cls: 'text-green-700 bg-green-50 border-green-200' },
    discover:   { label: 'DISC', cls: 'text-amber-700 bg-amber-50 border-amber-200' },
    unknown:    { label: '••••', cls: 'text-gray-600 bg-gray-100 border-gray-200' },
  };
  return map[network] ?? map.unknown;
}

export default function SavedCardSelector({ cards, selectedId, onSelect }: Props) {
  if (cards.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100">
        <h3 className="font-bold text-gray-900 text-base">Saved Cards</h3>
        <p className="text-xs text-gray-400 mt-0.5">Select a saved card or enter a new one below</p>
      </div>

      <div className="divide-y divide-gray-50">
        {cards.map((card) => {
          const badge = networkBadge(card.network);
          const active = selectedId === card.id;
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => onSelect(active ? null : card.id)}
              className={`w-full px-6 py-4 flex items-center gap-4 text-left transition-colors ${
                active ? 'bg-brand-blue-light' : 'hover:bg-gray-50'
              }`}
            >
              {/* Radio indicator */}
              <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                active ? 'border-brand-blue' : 'border-gray-300'
              }`}>
                {active && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
              </div>

              <span className={`shrink-0 px-2 py-0.5 text-xs font-bold border rounded ${badge.cls}`}>
                {badge.label}
              </span>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  •••• •••• •••• {card.last_four}
                </p>
                <p className="text-xs text-gray-400">{card.card_holder} · {card.expiry}</p>
              </div>

              {card.is_default && (
                <span className="shrink-0 text-xs font-semibold text-brand-blue bg-brand-blue-light px-2 py-0.5 rounded-full border border-blue-100">
                  Default
                </span>
              )}
            </button>
          );
        })}

        {/* Option to use a new card */}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`w-full px-6 py-4 flex items-center gap-4 text-left transition-colors ${
            selectedId === null ? 'bg-brand-blue-light' : 'hover:bg-gray-50'
          }`}
        >
          <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${
            selectedId === null ? 'border-brand-blue' : 'border-gray-300'
          }`}>
            {selectedId === null && <div className="w-2 h-2 rounded-full bg-brand-blue" />}
          </div>
          <svg className="shrink-0 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <p className="text-sm font-semibold text-gray-700">Use a different card</p>
        </button>
      </div>
    </div>
  );
}
