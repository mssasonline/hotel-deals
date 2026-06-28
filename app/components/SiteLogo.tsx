import Link from 'next/link';
import { BRAND } from '@/lib/brand';

interface Props {
  /**
   * 'light' = white SELECTED + orange ROOM (for dark/navy backgrounds)
   * 'dark'  = navy  SELECTED + orange ROOM (for white/light backgrounds)
   */
  variant?: 'light' | 'dark';
  /** CSS font-size, e.g. "18px" or "clamp(15px, 4.5vw, 22px)" */
  size?: string;
  /** If provided, the logo is wrapped in a Next.js Link */
  href?: string;
  className?: string;
  style?: React.CSSProperties;
}

export default function SiteLogo({
  variant = 'light',
  size,
  href,
  className,
  style,
}: Props) {
  const color1 = variant === 'light' ? BRAND.colors.light1 : BRAND.colors.dark1;

  const wordmark = (
    <span
      style={{
        fontFamily: BRAND.fontFamily,
        letterSpacing: BRAND.letterSpacing,
        lineHeight: 1,
        whiteSpace: 'nowrap',
        ...(size ? { fontSize: size } : {}),
      }}
    >
      <span style={{ fontWeight: BRAND.weight1, color: color1 }}>{BRAND.part1}</span>
      <span style={{ fontWeight: BRAND.weight2, color: BRAND.colors.accent }}>{BRAND.part2}</span>
    </span>
  );

  if (href) {
    return (
      <Link
        href={href}
        aria-label="SelectedRoom — Premium Hotels"
        className={`inline-flex items-baseline ${className ?? ''}`}
        style={{ textDecoration: 'none', ...style }}
      >
        {wordmark}
      </Link>
    );
  }

  return (
    <span className={`inline-flex items-baseline ${className ?? ''}`} style={style}>
      {wordmark}
    </span>
  );
}
