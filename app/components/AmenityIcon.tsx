/**
 * Professional SVG amenity icons mapped from keyword matching.
 * Style: 24×24 viewBox, stroke-based, consistent with booking.com icon language.
 */

interface IconProps {
  className?: string;
}

// ── Individual icon components ──────────────────────────────────────────────

function PoolIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12c1.5 0 1.5-1.5 3-1.5S7.5 12 9 12s1.5-1.5 3-1.5S13.5 12 15 12s1.5-1.5 3-1.5S20.5 12 22 12" />
      <path d="M2 17c1.5 0 1.5-1.5 3-1.5S7.5 17 9 17s1.5-1.5 3-1.5S13.5 17 15 17s1.5-1.5 3-1.5S20.5 17 22 17" />
      <path d="M7 8V5l3-3 3 3v3" />
      <path d="M13 8H7" />
    </svg>
  );
}

function BeachIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M17.5 8a6.5 6.5 0 01-11.5 4.15" />
      <path d="M6 12.15L3 21" />
      <path d="M10.5 7.5L3.5 18" />
      <path d="M3 21h18" />
      <circle cx="17" cy="5" r="2" />
    </svg>
  );
}

function RestaurantIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2" />
      <path d="M7 2v20" />
      <path d="M21 15V2a5 5 0 00-5 5v6h5z" />
      <path d="M21 15v7" />
    </svg>
  );
}

function SpaIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22c-4 0-7-3.134-7-7 0-1.843.84-4.388 2.52-7.636C8.897 5.241 10.386 3.29 12 2c1.614 1.29 3.103 3.241 4.48 5.364C18.16 10.612 19 13.157 19 15c0 3.866-3 7-7 7z" />
      <path d="M12 22V11" />
    </svg>
  );
}

function GymIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M6.5 6.5h11" />
      <path d="M6.5 17.5h11" />
      <path d="M3 9.5v5" />
      <path d="M21 9.5v5" />
      <path d="M3 12h18" />
      <rect x="1" y="9" width="3" height="6" rx="1" />
      <rect x="20" y="9" width="3" height="6" rx="1" />
      <rect x="5" y="5" width="2" height="14" rx="1" />
      <rect x="17" y="5" width="2" height="14" rx="1" />
    </svg>
  );
}

function WifiIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 12.55a11 11 0 0114.08 0" />
      <path d="M1.42 9a16 16 0 0121.16 0" />
      <path d="M8.53 16.11a6 6 0 016.95 0" />
      <circle cx="12" cy="20" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function ParkingIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 17V7h4a3 3 0 010 6H9" />
    </svg>
  );
}

function RoomServiceIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8h1a4 4 0 010 8h-1" />
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
}

function ConciergeIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 20V10" />
      <path d="M12 20V4" />
      <path d="M6 20v-6" />
      <path d="M3 20h18" />
      <path d="M2 10h20" />
      <path d="M12 4C12 4 7 6 7 10h10c0-4-5-6-5-6z" />
    </svg>
  );
}

function JacuzziIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h16a2 2 0 012 2v3" />
      <rect x="11" y="11" width="10" height="10" rx="2" />
      <path d="M14 15v2" />
      <path d="M17 13v4" />
    </svg>
  );
}

function BarIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8 22h8" />
      <path d="M12 11v11" />
      <path d="M20 2H4l6.5 8.5A2 2 0 0112 12a2 2 0 011.5-.5L20 2z" />
    </svg>
  );
}

function RooftopIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 21h18" />
      <path d="M5 21V9.5L12 4l7 5.5V21" />
      <path d="M9 21v-6h6v6" />
      <path d="M12 4V2" />
    </svg>
  );
}

function BreakfastIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 8h1a4 4 0 010 8h-1" />
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  );
}

function BusinessIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="7" width="20" height="14" rx="2" />
      <path d="M16 21V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v16" />
    </svg>
  );
}

function EventHallIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
      <path d="M9 22V12h6v10" />
      <path d="M3 9h18" />
    </svg>
  );
}

function GardenIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 22V12" />
      <path d="M5 12C5 8.686 8.134 6 12 6s7 2.686 7 6H5z" />
      <path d="M5 12c-2 0-3 1-3 3s1 3 3 3h14c2 0 3-1 3-3s-1-3-3-3" />
    </svg>
  );
}

function MarinIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 20h20" />
      <path d="M5 20V8l7-5 7 5v12" />
      <circle cx="12" cy="11" r="2" />
      <path d="M12 8V7" />
    </svg>
  );
}

function WaterSportsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 16.5c2.5 0 2.5-2 5-2s2.5 2 5 2 2.5-2 5-2 2.5 2 5 2" />
      <path d="M17 6l-5 5.5L9 8l-4 5" />
      <circle cx="17" cy="4" r="2" />
    </svg>
  );
}

function SeaViewIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 12h20" />
      <path d="M12 2a10 10 0 000 20" />
      <path d="M2 12c1.5 0 1.5-2 3-2s1.5 2 3 2 1.5-2 3-2" />
      <path d="M17 5l3 3-3 3" />
    </svg>
  );
}

function FireIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M8.5 14.5A2.5 2.5 0 0011 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 11-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 002.5 2.5z" />
    </svg>
  );
}

function CulturalIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M2 18l6-6 4 4 4-4 6 6" />
      <path d="M6 22V10l6-8 6 8v12" />
    </svg>
  );
}

function ScissorsIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="6" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <line x1="20" y1="4" x2="8.12" y2="15.88" />
      <line x1="14.47" y1="14.48" x2="20" y2="20" />
      <line x1="8.12" y1="8.12" x2="12" y2="12" />
    </svg>
  );
}

function DesertIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="9" r="4" />
      <path d="M12 3V1" />
      <path d="M12 17v-4" />
      <path d="M4.22 4.22l1.42 1.42" />
      <path d="M18.36 18.36l1.42 1.42" />
      <path d="M1 12h2" />
      <path d="M21 12h2" />
      <path d="M4.22 19.78l1.42-1.42" />
      <path d="M18.36 5.64l1.42-1.42" />
      <path d="M3 22h18" />
    </svg>
  );
}

function AirConditioningIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="1" y="3" width="22" height="8" rx="2" />
      <path d="M7 15c0 2 1 4 5 4s5-2 5-4" />
      <path d="M8 19l-2 2" />
      <path d="M16 19l2 2" />
      <path d="M12 11v8" />
    </svg>
  );
}

function PetIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M10 5.172C10 3.782 8.423 2.679 6.5 3c-2.823.47-4.113 6.006-4 7 .08.703 1.725 1.722 3.656 1 1.261-.472 1.96-1.45 2.344-2.5" />
      <path d="M14.267 5.172c0-1.39 1.577-2.493 3.5-2.172 2.823.47 4.113 6.006 4 7-.08.703-1.725 1.722-3.656 1-1.261-.472-1.855-1.45-2.239-2.5" />
      <path d="M8 14v.5" />
      <path d="M16 14v.5" />
      <path d="M11.25 16.25h1.5L12 17l-.75-.75z" />
      <path d="M4.42 11.247A13.152 13.152 0 004 14.556C4 18.728 7.582 21 12 21s8-2.272 8-6.444c0-1.061-.162-2.2-.493-3.309" />
    </svg>
  );
}

function NoSmokingIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <line x1="2" y1="2" x2="22" y2="22" />
      <path d="M12 12H2v4h10.34" />
      <path d="M22 12v4h-2" />
      <path d="M18 12h-.34" />
      <path d="M14 12h-2" />
      <path d="M22 8c0-2.5-2-2.5-2-5" />
      <path d="M18 10c0-2.5-2-2.5-2-5" />
    </svg>
  );
}

function ConferenceIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 8h10" />
      <path d="M7 11h6" />
    </svg>
  );
}

function GolfIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 18v-6" />
      <path d="M12 12l6-3-6-3V12z" fill="currentColor" stroke="none" />
      <circle cx="12" cy="20" r="2" />
      <path d="M3 21c3-2 6-3 9-3s6 1 9 3" />
    </svg>
  );
}

function DefaultAmenityIcon({ className }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

// ── Keyword map ─────────────────────────────────────────────────────────────

type IconComponent = (props: IconProps) => React.ReactElement;

const KEYWORD_MAP: [string[], IconComponent][] = [
  [['pool', 'swim', 'jacuzzi', 'hot tub', 'bathtub', 'infinity bath'], PoolIcon],
  [['beach', 'private beach', 'beach club', 'beach access', 'beachfront', 'sea view', 'canal view', 'ocean', 'seaside'], BeachIcon],
  [['spa', 'wellness', 'massage', 'sauna', 'hammam', 'treatment'], SpaIcon],
  [['gym', 'fitness', 'workout', 'exercise'], GymIcon],
  [['wifi', 'wi-fi', 'internet', 'wireless'], WifiIcon],
  [['parking', 'valet', 'garage', 'car park'], ParkingIcon],
  [['room service', 'butler', 'in-room dining'], RoomServiceIcon],
  [['concierge', 'reception', 'front desk', 'bell'], ConciergeIcon],
  [['bar', 'lounge', 'pub', 'cocktail', 'whiskey', 'cigar', 'nightclub', 'dune bar', 'sky bar', 'pool bar', 'beach bar', 'rooftop bar'], BarIcon],
  [['restaurant', 'dining', 'bistro', 'cuisine', 'buffet', 'grill', 'bbq', 'brasserie', 'fine dining', 'waterfront restaurant'], RestaurantIcon],
  [['breakfast', 'brunch', 'coffee', 'café', 'cafe', 'tea', 'meal', 'lunch', 'dinner', 'food'], BreakfastIcon],
  [['conference', 'meeting', 'boardroom', 'seminar'], ConferenceIcon],
  [['business', 'center', 'office', 'co-work'], BusinessIcon],
  [['ballroom', 'event', 'banquet', 'wedding', 'hall', 'function'], EventHallIcon],
  [['golf', 'putting', 'course'], GolfIcon],
  [['garden', 'landscape', 'park', 'lawn', 'meditation garden', 'green'], GardenIcon],
  [['marina', 'yacht', 'boat', 'dock', 'port', 'sailing'], MarinIcon],
  [['water sport', 'surf', 'dive', 'snorkel', 'kayak', 'paddle', 'jet ski'], WaterSportsIcon],
  [['rooftop', 'sky deck', 'terrace view', 'city view', 'skyline'], RooftopIcon],
  [['air condition', 'cooling', 'ac', 'climate control'], AirConditioningIcon],
  [['pet', 'dog', 'cat', 'animal', 'pet friendly'], PetIcon],
  [['smoking', 'no smoking', 'non-smoking', 'smoke-free'], NoSmokingIcon],
  [['fire pit', 'bonfire', 'fireplace', 'campfire'], FireIcon],
  [['cultural', 'performance', 'theater', 'theatre', 'show', 'entertainment'], CulturalIcon],
  [['desert', 'camel', 'safari', 'dune', 'falconry', 'falcon', 'sunrise tour', 'desert tour'], DesertIcon],
  [['salon', 'barber', 'beauty', 'hair', 'nail', 'grooming'], ScissorsIcon],
  [['sea view', 'ocean view', 'lake view', 'river view', 'view room'], SeaViewIcon],
];

function resolveIcon(label: string): IconComponent {
  const lower = label.toLowerCase();
  for (const [keywords, Icon] of KEYWORD_MAP) {
    if (keywords.some((k) => lower.includes(k))) return Icon;
  }
  return DefaultAmenityIcon;
}

// ── Public component ────────────────────────────────────────────────────────

interface AmenityIconProps {
  label: string;
  className?: string;
}

export default function AmenityIcon({ label, className = 'w-5 h-5' }: AmenityIconProps) {
  const Icon = resolveIcon(label);
  return <Icon className={className} />;
}
