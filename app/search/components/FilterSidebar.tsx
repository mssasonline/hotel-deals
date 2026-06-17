'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useAppSettingsStore } from '@/store/appSettingsStore';
import { CURRENCY_MAP } from '@/lib/currencyData';

const NO_PRICE_LIMIT = 99999;
const SLIDER_MAX = 10000; // in selected currency

export interface FilterState {
  maxPrice: number; // stored in USD
  minStars: number;
  minGuestRating: number; // 0 = any, 4 = 4.0+, 4.5 = 4.5+
  selectedAmenities: string[];
  selectedCities: string[];
}

export const DEFAULT_FILTERS: FilterState = {
  maxPrice: NO_PRICE_LIMIT,
  minStars: 0,
  minGuestRating: 0,
  selectedAmenities: [],
  selectedCities: [],
};

interface FilterSidebarProps {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  availableCities?: string[];
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      onClick={() => onChange(!enabled)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue ${
        enabled ? 'bg-brand-blue' : 'bg-gray-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
          enabled ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}

export default function FilterSidebar({ filters, onFiltersChange, availableCities = [] }: FilterSidebarProps) {
  const t = useTranslation();
  const currency = useAppSettingsStore((s) => s.currency);
  const { exchangeRate: rate, symbol } = CURRENCY_MAP[currency];

  // Convert stored USD maxPrice → display currency for slider
  const toDisplay = (usd: number) =>
    usd >= NO_PRICE_LIMIT ? SLIDER_MAX : Math.min(SLIDER_MAX, Math.round(usd * rate));

  const sliderMin = 0;
  const sliderStep = Math.max(10, Math.round((SLIDER_MAX - sliderMin) / 200 / 10) * 10);

  const [sliderPrice, setSliderPrice] = useState(() => toDisplay(filters.maxPrice));

  // Re-sync when currency changes or filters are reset externally
  useEffect(() => {
    setSliderPrice(toDisplay(filters.maxPrice));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currency, filters.maxPrice]);

  const update = (partial: Partial<FilterState>) =>
    onFiltersChange({ ...filters, ...partial });

  const commitPrice = (displayVal: number) => {
    const usd = displayVal >= SLIDER_MAX ? NO_PRICE_LIMIT : Math.round(displayVal / rate);
    update({ maxPrice: usd });
  };

  const hasActiveFilters =
    filters.maxPrice < NO_PRICE_LIMIT ||
    filters.minStars > 0 ||
    filters.minGuestRating > 0 ||
    filters.selectedAmenities.length > 0 ||
    filters.selectedCities.length > 0;

  const filledPct = Math.max(0, Math.min(100, ((sliderPrice - sliderMin) / (SLIDER_MAX - sliderMin)) * 100));

  const starOptions = [
    { value: 0, label: t['filter.anyRating'] },
    { value: 3, label: '3+', stars: 3 },
    { value: 4, label: '4+', stars: 4 },
    { value: 5, label: '5',  stars: 5 },
  ];

  function toggleCity(city: string) {
    const next = filters.selectedCities.includes(city)
      ? filters.selectedCities.filter(c => c !== city)
      : [...filters.selectedCities, city];
    update({ selectedCities: next });
  }

  const priceLabel = sliderPrice >= SLIDER_MAX
    ? `${symbol}${SLIDER_MAX.toLocaleString()}+`
    : `${symbol}${sliderPrice.toLocaleString()}`;

  return (
    <div>
      {/* Sidebar header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-gray-900 text-base">{t['filter.title']}</h3>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={() => {
              setSliderPrice(SLIDER_MAX);
              onFiltersChange(DEFAULT_FILTERS);
            }}
            className="text-brand-blue text-sm font-medium hover:underline"
          >
            {t['filter.resetAll']}
          </button>
        )}
      </div>

      <div className="space-y-6">

        {/* ── Price per night ────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800 text-sm">{t['filter.pricePerNight']}</h4>
            <span className="text-brand-blue font-bold text-sm">{t['filter.upTo']} {priceLabel}</span>
          </div>
          <input
            type="range"
            min={sliderMin}
            max={SLIDER_MAX}
            step={sliderStep}
            value={sliderPrice}
            onChange={e => setSliderPrice(Number(e.target.value))}
            onMouseUp={() => commitPrice(sliderPrice)}
            onTouchEnd={() => commitPrice(sliderPrice)}
            className="w-full h-2 rounded-full appearance-none cursor-pointer"
            style={{
              background: `linear-gradient(to right, #003B95 0%, #003B95 ${filledPct}%, #e5e7eb ${filledPct}%, #e5e7eb 100%)`,
              accentColor: '#003B95',
            }}
          />
          <div className="flex justify-between text-gray-400 text-xs mt-1.5">
            <span>{symbol}{sliderMin.toLocaleString()}</span>
            <span>{symbol}{SLIDER_MAX.toLocaleString()}+</span>
          </div>
        </div>

        <hr className="border-gray-100" />

        {/* ── Star rating ───────────────────────────────────── */}
        <div>
          <h4 className="font-semibold text-gray-800 text-sm mb-3">{t['filter.minRating']}</h4>
          <div className="flex flex-wrap gap-2">
            {starOptions.map(opt => {
              const selected = filters.minStars === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() =>
                    update({ minStars: selected && opt.value !== 0 ? 0 : opt.value })
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                    selected
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-blue hover:text-brand-blue'
                  }`}
                  style={selected ? { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' } : {}}
                >
                  {opt.stars != null ? (
                    <>
                      {Array.from({ length: opt.stars }).map((_, i) => (
                        <span key={i} className={selected ? 'text-yellow-300' : 'text-brand-gold'}>★</span>
                      ))}
                      <span className={selected ? 'text-white/80' : 'text-gray-400'}>{opt.label}</span>
                    </>
                  ) : (
                    opt.label
                  )}
                </button>
              );
            })}
          </div>
          {filters.minStars > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              {filters.minStars === 5
                ? 'Showing 5-star hotels only'
                : `Showing ${filters.minStars}+ star hotels`}
            </p>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* ── Guest Rating ──────────────────────────────────── */}
        <div>
          <h4 className="font-semibold text-gray-800 text-sm mb-3">Guest Rating</h4>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 0,   label: 'Any' },
              { value: 4,   label: '4.0+' },
              { value: 4.5, label: '4.5+' },
            ].map(opt => {
              const selected = filters.minGuestRating === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => update({ minGuestRating: selected && opt.value !== 0 ? 0 : opt.value })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors flex items-center gap-1 ${
                    selected
                      ? 'text-white border-transparent'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-brand-blue hover:text-brand-blue'
                  }`}
                  style={selected ? { background: 'linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)' } : {}}
                >
                  {opt.value > 0 && <span className={selected ? 'text-yellow-300' : 'text-brand-gold'}>★</span>}
                  {opt.label}
                </button>
              );
            })}
          </div>
          {filters.minGuestRating > 0 && (
            <p className="text-xs text-gray-400 mt-2">
              Showing hotels rated {filters.minGuestRating}+
            </p>
          )}
        </div>

        <hr className="border-gray-100" />

        {/* ── Amenities ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-gray-800 text-sm">Amenities</h4>
            {filters.selectedAmenities.length > 0 && (
              <button
                type="button"
                onClick={() => update({ selectedAmenities: [] })}
                className="text-xs text-brand-blue hover:underline"
              >
                Clear
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-y-2 gap-x-3">
            {[
              { key: 'free_wifi',    label: 'Free Wi-Fi'  },
              { key: 'pool',         label: 'Pool'         },
              { key: 'free_parking', label: 'Parking'      },
              { key: 'restaurant',   label: 'Restaurant'   },
              { key: 'gym',          label: 'Gym'          },
              { key: 'spa',          label: 'Spa'          },
            ].map(({ key, label }) => {
              const checked = filters.selectedAmenities.includes(key);
              return (
                <label key={key} className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => {
                      const next = checked
                        ? filters.selectedAmenities.filter(a => a !== key)
                        : [...filters.selectedAmenities, key];
                      update({ selectedAmenities: next });
                    }}
                    className="w-4 h-4 rounded cursor-pointer shrink-0"
                    style={{ accentColor: '#003B95' }}
                  />
                  <span className={`text-sm transition-colors ${
                    checked ? 'text-brand-blue font-semibold' : 'text-gray-600 group-hover:text-gray-900'
                  }`}>
                    {label}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* ── City filter ───────────────────────────────────── */}
        {availableCities.length > 1 && (
          <>
            <hr className="border-gray-100" />
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-gray-800 text-sm">{t['filter.cities']}</h4>
                {filters.selectedCities.length > 0 && (
                  <button
                    type="button"
                    onClick={() => update({ selectedCities: [] })}
                    className="text-xs text-brand-blue hover:underline"
                  >
                    {t['filter.allCities']}
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {availableCities.map(city => (
                  <label key={city} className="flex items-center gap-2.5 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={filters.selectedCities.includes(city)}
                      onChange={() => toggleCity(city)}
                      className="w-4 h-4 rounded cursor-pointer shrink-0"
                      style={{ accentColor: '#003B95' }}
                    />
                    <span
                      className={`text-sm transition-colors ${
                        filters.selectedCities.includes(city)
                          ? 'text-brand-blue font-semibold'
                          : 'text-gray-600 group-hover:text-gray-900'
                      }`}
                    >
                      {city}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
