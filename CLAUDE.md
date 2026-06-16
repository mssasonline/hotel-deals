# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **This is NOT the Next.js you know.** Version 16.2.6 has breaking changes — APIs, conventions, and file structure may differ from training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # ESLint (no test runner configured)
```

## Architecture

**Stack:** Next.js 16.2.6 (App Router) · React 19 · TypeScript · Supabase (auth + DB) · Zustand · Tailwind CSS 4

### Middleware / Route Protection

Route guards live in [proxy.ts](proxy.ts), **not** `middleware.ts`. It intercepts `/admin/*` and `/partner/*`, reads the Supabase session from cookies via `createServerClient`, queries `profiles.role`, and redirects unauthorized requests. The matcher config is at the bottom of `proxy.ts`.

Role is cached in an `x-role-cache` cookie (5-minute TTL, httpOnly) to avoid a DB round-trip on every request. The cache is cleared on sign-out. Server Actions (POST with `Next-Action` header) bypass route guards — they handle their own auth internally.

### Authentication

- Browser client: [lib/supabase.ts](lib/supabase.ts) — uses `createBrowserClient` from `@supabase/ssr`, which stores the session in **cookies** (not localStorage) so server components and `proxy.ts` can read it.
- Server client: [lib/supabase-server.ts](lib/supabase-server.ts) — uses `createServerClient`, reads cookies from the request.
- React context: [lib/authContext.tsx](lib/authContext.tsx) — `AuthProvider` wraps the app in [app/layout.tsx](app/layout.tsx) and exposes `{ user, session, role, loading, signOut }` via `useAuth()`.
- Roles are stored in the `profiles` table (`admin` | `partner` | `user`). `fetchUserRole(userId)` is called after every session change.

### State Management (Zustand)

Two persisted stores:

| Store | Key | Contents |
|-------|-----|----------|
| [store/appSettingsStore.ts](store/appSettingsStore.ts) | `sr-app-settings` | `language`, `currency` |
| [store/bookingStore.ts](store/bookingStore.ts) | `sr-booking-store` | `selectedHotel`, `selectedRoom`, dates, guests, `totalPrice`, past `bookings` |

`bookingStore` calls `calcRoomPrice()` directly — keep it in sync with the pricing engine.

### Pricing Model

Defined in [lib/pricingEngine.ts](lib/pricingEngine.ts), established by migration `013`:

- `rooms.base_price` — original rack rate, displayed as **strikethrough (red)**
- `rooms.price_per_night` — discounted selling price, the **active payable price (green)**
- Taxes are always **15% of subtotal** (`price_per_night × nights × rooms`)
- Use `calcRoomPrice(basePrice, pricePerNight)` for per-night metrics and `calcRoomStayPrice({...})` for full stay totals. Never compute discounts inline.

### Last-Minute Deals Engine

Defined in [lib/dealsEngine.ts](lib/dealsEngine.ts). Discounts are time-based (hours remaining):

| Hours left | Status | Discount |
|---|---|---|
| > 12 | `LOW_DEMAND` | 20% |
| 6–12 | `MEDIUM_DEMAND` | 35% |
| 2–6 | `HIGH_DEMAND` | 55% |
| < 2 | `CRITICAL` | 70% |

Use `getUrgencyConfig(timeLeft)` for display properties and `calculateFinalPrice(originalPrice, timeLeft)` for the discounted price.

### Revenue & Platform Settings

- Revenue split: partners receive **90%** of booking total; platform keeps 10% commission.
- Platform-wide settings (`commission_rate`, `guest_booking_limit`, `auto_suspend_threshold`) are stored in the `platform_settings` table (migration `033`) and read via [lib/platformSettings.ts](lib/platformSettings.ts) with a 1-minute in-memory cache. Defaults: commission 10%, booking limit 5, suspend threshold 3.

### Email Service

[lib/emailService.ts](lib/emailService.ts) uses Resend. **Emails are only sent when `NOTIFICATIONS_ENABLED=true`**; otherwise intent is logged. Required env vars when enabled: `RESEND_API_KEY`, optionally `RESEND_FROM_EMAIL`. Sends booking confirmations to guest + partner, and welcome emails to newly created partners.

### Data & Types

- Canonical shared types: [lib/types.ts](lib/types.ts) — `DestinationCity`, `Room`, `Booking`, `RawBookingRow`, `normalizeBooking()`.
- Supabase returns FK joins as arrays in some query shapes; `normalizeBooking()` collapses `rooms: []` → `rooms: {}`.
- Pages that need live data export `export const dynamic = "force-dynamic"` to disable Next.js caching.
- Room availability is checked via Supabase RPC: `get_room_availability(p_room_id, p_check_in, p_check_out)`, also exposed at `/api/availability`.

### i18n

- 36 languages configured in [lib/languageData.ts](lib/languageData.ts).
- Get translations with `getTranslations(language)` where `language` comes from `useAppSettingsStore`.
- All user-visible strings in shared components must use the translation keys — do not hardcode English text.

### Routing Structure

```
app/
  page.tsx                     # Home — hero, last-minute deals, destination cities
  search/page.tsx              # Hotel search results (server component, force-dynamic)
  hotel/[id]/page.tsx          # Hotel detail — gallery, amenities, booking panel
  booking/[id]/                # Multi-step booking wizard
  booking/success/[id]/        # Post-booking confirmation
  admin/                       # Admin console — requires role === 'admin'
  partner/                     # Partner dashboard — requires role === 'partner' | 'admin'
  api/availability/            # Room availability RPC wrapper
  api/autocomplete/            # City autocomplete
  api/room-rates/              # Room rate lookup
  api/cron/reset-availability/ # Daily availability reset (cron-triggered)
  api/auth/signout/            # Sign-out handler
```

### Database Migrations

Migrations are in [supabase/migrations/](supabase/migrations/). Key ones to know:
- `003.1` — full initial schema
- `008` — Row-Level Security policies
- `013` — establishes `base_price` / `price_per_night` two-price model
- `020` — partner management
- `032` — revenue split
- `033` — platform settings table
- `045` — saved cards
- `046` — daily availability reset
- `048` — tax rates by country

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Optional (for email notifications):
```
NOTIFICATIONS_ENABLED=true
RESEND_API_KEY=
RESEND_FROM_EMAIL=
```
