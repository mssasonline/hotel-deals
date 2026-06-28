/**
 * Single source of truth for the SelectedRoom brand wordmark.
 * Update here → changes everywhere: web components + email HTML.
 */
export const BRAND = {
  part1: 'SELECTED',
  part2: 'ROOM',

  // Web (React) — CSS variable with system-font fallbacks
  fontFamily: "var(--font-sora, 'Segoe UI', system-ui, sans-serif)",

  // Email — inline HTML only, no CSS variables
  fontFamilyEmail: 'Arial, Helvetica, sans-serif',

  letterSpacing: '0.10em',
  weight1: 300,  // part1 weight
  weight2: 700,  // part2 weight

  colors: {
    light1:  '#FFFFFF',   // part1 on dark backgrounds
    dark1:   '#12224F',   // part1 on light backgrounds
    accent:  '#E78319',   // part2 (always orange)
    // email-only extras
    emailTld:       '#93C5FD',
    emailFooterTld: '#6b7280',
  },
} as const;

/** Generate the logo HTML string for email templates (light variant, dark background). */
export function emailLogoHtml(variant: 'light' | 'dark' = 'light', sizePx = 22): string {
  const color1 = variant === 'light' ? BRAND.colors.light1 : BRAND.colors.dark1;
  const tldColor = variant === 'light' ? BRAND.colors.emailTld : BRAND.colors.emailFooterTld;
  const supSize = Math.round(sizePx * 0.5);
  const base = `font-family:${BRAND.fontFamilyEmail};letter-spacing:${BRAND.letterSpacing};text-transform:uppercase`;
  return (
    `<span style="${base};font-weight:${BRAND.weight1};font-size:${sizePx}px;color:${color1}">${BRAND.part1}</span>` +
    `<span style="${base};font-weight:${BRAND.weight2};font-size:${sizePx}px;color:${BRAND.colors.accent}">${BRAND.part2}</span>` +
    `<sup style="font-family:${BRAND.fontFamilyEmail};font-size:${supSize}px;font-weight:700;color:${tldColor};letter-spacing:0">.com</sup>`
  );
}
