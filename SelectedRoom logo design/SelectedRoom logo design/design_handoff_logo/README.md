# Handoff: SelectedRoom — Brand Logo

## Overview
Logo system for **SelectedRoom — Premium Hotels**, a hotel-booking website. This package lets you wire the brand logo into the live site (header, footer, favicon, app icon) and keep every usage on-brand.

## About the Design Files
The files here are a **design reference**. The visual is a pure-text wordmark — there is no bitmap to slice. Recreate it in the site's existing environment (React/Vue/plain HTML, etc.) using the snippets in `logo-components.html`, or drop the SVGs in `assets/` directly. Prefer the live-text version for the header (crisp at any size, accessible, themeable); use the SVGs where a single self-contained asset is easier (emails, OG images, README).

## Fidelity
**High-fidelity.** Colors, font, weights, and spacing below are final — match them exactly.

## The Logo

### Concept
Single-line wordmark: **SELECTED** in light weight + **ROOM** in bold amber. Uppercase, generous tracking. Weight contrast (not just color) carries the identity, so it survives in one-color/print contexts. Tagline **PREMIUM HOTELS** sits below in wide tracking.

### Variants & when to use
| Variant | File | Use |
|---|---|---|
| Wordmark on light | `assets/logo-horizontal-light.svg` | White / light header & docs |
| Wordmark on dark | `assets/logo-horizontal-dark.svg` | Navy / photo / dark header |
| Monogram **SR** | (CSS in `logo-components.html`) | App icon, avatar, tight spaces |
| Favicon | `assets/favicon.svg` | Browser tab, PWA |

## Specifications

### Colors (design tokens)
| Token | Hex | Use |
|---|---|---|
| `--navy` | `#12224F` | "SELECTED" on light, icon bg, theme-color |
| `--midnight` | `#0B1430` | Deep section backgrounds |
| `--amber` | `#E78319` | "ROOM", accent, dot |
| `--mist` | `#F5F7FB` | Light page background |
| `--white` | `#FFFFFF` | "SELECTED" on dark |
| `--tagline-light` | `#B8C2DC` | Tagline on navy |
| `--tagline-dark` | `#7886A8` | Tagline on white |

### Typography
- **Family:** `Sora` (Google Fonts). Fallback: `'Segoe UI', system-ui, sans-serif`.
- **Weights loaded:** 300, 400, 500, 700.
- **Wordmark:** `font-size` is the single scale knob; `letter-spacing: 0.10em`. "SELECTED" = weight **300**, "ROOM" = weight **700** + amber. No space between the two words.
- **Tagline:** weight 500, `letter-spacing: 0.5em` (add equal left padding so it stays optically centered), color per theme.
- **Monogram:** weight 700, `letter-spacing: -0.02em`.

### Geometry
- App-icon corner radius ≈ **24%** of its size (e.g. 34px @ 148px, 15px @ 64px).
- Clear space around the wordmark: at least the cap-height of "S" on every side.
- Minimum legible width: ~120px for the full wordmark; below that use the **SR** monogram.

## Assets
- `assets/logo-horizontal-light.svg` — wordmark, dark text, transparent bg
- `assets/logo-horizontal-dark.svg` — wordmark, white text, transparent bg
- `assets/favicon.svg` — SR monogram in navy rounded square
- `logo-components.html` — copy-paste HTML/CSS for header, lockup, monogram, favicon meta
- `SelectedRoom Logo.dc.html` — full visual brand sheet (reference only)

> **Note on the SVGs:** they render their text in `Sora`, so the page must load that font (the favicon is fine standalone since the monogram is letters in any sans). If you need a font-independent file (e.g. for an email signature), open the SVG in a vector tool and *convert text to outlines* before exporting.

## Implementation checklist
- [ ] Load Sora (weights 300/400/500/700) once in `<head>`.
- [ ] Header: live-text wordmark (`logo-components.html` §1), theme class per background.
- [ ] Footer/hero: full lockup with tagline (§2).
- [ ] `/favicon.svg` + `apple-touch-icon` (180×180) + `<meta name="theme-color" content="#12224F">`.
- [ ] Wrap the logo in `<a href="/">` with `aria-label="SelectedRoom — Premium Hotels"`.
