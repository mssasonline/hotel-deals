export type RoomCategory =
  | 'standard'
  | 'deluxe'
  | 'suite'
  | 'junior suite'
  | 'presidential'
  | 'penthouse'
  | 'family'
  | 'twin'
  | 'economy';

export const ROOM_DEFAULT_IMAGES: Record<RoomCategory, string> = {
  standard:
    'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800&auto=format&fit=crop&q=80',
  deluxe:
    'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=800&auto=format&fit=crop&q=80',
  suite:
    'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800&auto=format&fit=crop&q=80',
  'junior suite':
    'https://images.unsplash.com/photo-1566665797739-167ff3a1a3a4?w=800&auto=format&fit=crop&q=80',
  presidential:
    'https://images.unsplash.com/photo-1631049421450-348ccd7f8949?w=800&auto=format&fit=crop&q=80',
  penthouse:
    'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=800&auto=format&fit=crop&q=80',
  family:
    'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=800&auto=format&fit=crop&q=80',
  twin:
    'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=800&auto=format&fit=crop&q=80',
  economy:
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=800&auto=format&fit=crop&q=80',
};

const CATEGORY_ALIASES: Record<string, RoomCategory> = {
  standard: 'standard',
  'standard room': 'standard',
  deluxe: 'deluxe',
  'deluxe room': 'deluxe',
  suite: 'suite',
  'junior suite': 'junior suite',
  presidential: 'presidential',
  'presidential suite': 'presidential',
  penthouse: 'penthouse',
  'penthouse suite': 'penthouse',
  family: 'family',
  'family room': 'family',
  twin: 'twin',
  'twin room': 'twin',
  economy: 'economy',
  'economy room': 'economy',
  single: 'economy',
  'single room': 'economy',
};

export function getRoomImage(room_type: string | null | undefined, image_url?: string | null): string {
  if (image_url) return image_url;
  const key = CATEGORY_ALIASES[room_type?.toLowerCase().trim() ?? ''] ?? 'standard';
  return ROOM_DEFAULT_IMAGES[key];
}
