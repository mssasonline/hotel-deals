# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

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
  page.tsx              # Home — hero, last-minute deals, destination cities
  search/page.tsx       # Hotel search results (server component, force-dynamic)
  hotel/[id]/page.tsx   # Hotel detail — gallery, amenities, booking panel
  booking/[id]/         # Multi-step booking wizard
  admin/                # Admin console — requires role === 'admin'
  partner/              # Partner dashboard — requires role === 'partner' | 'admin'
  api/availability/     # Room availability RPC wrapper
  api/autocomplete/     # City autocomplete
```

### Database Migrations

Migrations are in [supabase/migrations/](supabase/migrations/). Key ones to know:
- `003.1` — full initial schema
- `008` — Row-Level Security policies
- `013` — establishes `base_price` / `price_per_night` two-price model

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
