export type RoomType = 'Standard' | 'Deluxe' | 'Suite' | 'Penthouse';
export type DealStatus = 'active' | 'expiring-soon' | 'expired';
export type BookingStatus = 'Confirmed' | 'Checked In' | 'Completed' | 'Cancelled';

export interface PartnerHotel {
  id: string;
  name: string;
  city: string;
  address: string;
  rating: number;
  description: string;
  images: string[];
}

export interface PartnerRoom {
  id: string;
  hotelId: string;
  hotelName: string;
  name: string;
  type: RoomType;
  capacity: number;
  /** Original rack rate — strikethrough price */
  base_price: number;
  /** Discounted selling price — the active payable price */
  price_per_night: number;
  availableRooms: number;
  quantity_total: number;
  quantity_available: number;
}

export interface PartnerDeal {
  id: string;
  hotelId: string;
  hotelName: string;
  roomName: string;
  discount: number;
  expiresAt: string;
  status: DealStatus;
  base_price: number;
  dealPrice: number;
  isActive: boolean;
}

export interface PartnerBooking {
  id: string;
  guestName: string;
  hotelName: string;
  roomName: string;
  checkIn: string;
  checkOut: string;
  status: BookingStatus;
  totalAmount: number;
}

export const MOCK_HOTELS: PartnerHotel[] = [
  {
    id: 'h1',
    name: 'Atlantis Tower Suites',
    city: 'Dubai',
    address: 'The Palm Jumeirah, Crescent Road, Dubai, UAE',
    rating: 4.9,
    description: 'Ultra-luxury oceanfront suites with breathtaking views of the Arabian Gulf and private beach access.',
    images: [],
  },
  {
    id: 'h2',
    name: 'Burj Al Arab Residences',
    city: 'Dubai',
    address: 'Jumeirah Beach Road, Dubai, UAE',
    rating: 4.8,
    description: 'Iconic sail-shaped hotel offering world-class luxury experiences on the Dubai coastline.',
    images: [],
  },
  {
    id: 'h3',
    name: 'DIFC Grand Hotel',
    city: 'Dubai',
    address: 'Gate Avenue, DIFC, Dubai, UAE',
    rating: 4.7,
    description: "Business luxury hotel in the heart of Dubai's financial district with state-of-the-art facilities.",
    images: [],
  },
];

export const MOCK_ROOMS: PartnerRoom[] = [
  { id: 'r1', hotelId: 'h1', hotelName: 'Atlantis Tower Suites', name: 'Ocean View Suite', type: 'Suite', capacity: 2, base_price: 500, price_per_night:250, availableRooms: 3, quantity_total: 3, quantity_available: 3 },
  { id: 'r2', hotelId: 'h1', hotelName: 'Atlantis Tower Suites', name: 'Palm Premier Room', type: 'Deluxe', capacity: 2, base_price: 350, price_per_night:175, availableRooms: 5, quantity_total: 5, quantity_available: 5 },
  { id: 'r3', hotelId: 'h1', hotelName: 'Atlantis Tower Suites', name: 'Royal Penthouse', type: 'Penthouse', capacity: 4, base_price: 1200, price_per_night:600, availableRooms: 1, quantity_total: 1, quantity_available: 1 },
  { id: 'r4', hotelId: 'h2', hotelName: 'Burj Al Arab Residences', name: 'Deluxe Suite', type: 'Suite', capacity: 2, base_price: 780, price_per_night:390, availableRooms: 2, quantity_total: 2, quantity_available: 2 },
  { id: 'r5', hotelId: 'h2', hotelName: 'Burj Al Arab Residences', name: 'Sea View Room', type: 'Deluxe', capacity: 2, base_price: 560, price_per_night:280, availableRooms: 4, quantity_total: 4, quantity_available: 4 },
  { id: 'r6', hotelId: 'h3', hotelName: 'DIFC Grand Hotel', name: 'Executive Room', type: 'Standard', capacity: 1, base_price: 290, price_per_night:145, availableRooms: 6, quantity_total: 6, quantity_available: 6 },
  { id: 'r7', hotelId: 'h3', hotelName: 'DIFC Grand Hotel', name: 'Business Suite', type: 'Suite', capacity: 2, base_price: 420, price_per_night:210, availableRooms: 3, quantity_total: 3, quantity_available: 3 },
];

export const MOCK_DEALS: PartnerDeal[] = [
  { id: 'd1', hotelId: 'h1', hotelName: 'Atlantis Tower Suites', roomName: 'Ocean View Suite', discount: 63, expiresAt: '2026-05-31T18:00:00', status: 'expiring-soon', base_price: 500, dealPrice: 185, isActive: true },
  { id: 'd2', hotelId: 'h1', hotelName: 'Atlantis Tower Suites', roomName: 'Palm Premier Room', discount: 60, expiresAt: '2026-05-31T20:00:00', status: 'active', base_price: 350, dealPrice: 140, isActive: true },
  { id: 'd3', hotelId: 'h1', hotelName: 'Atlantis Tower Suites', roomName: 'Royal Penthouse', discount: 55, expiresAt: '2026-05-31T22:00:00', status: 'active', base_price: 1200, dealPrice: 540, isActive: true },
  { id: 'd4', hotelId: 'h2', hotelName: 'Burj Al Arab Residences', roomName: 'Deluxe Suite', discount: 60, expiresAt: '2026-05-31T14:00:00', status: 'expired', base_price: 780, dealPrice: 312, isActive: false },
  { id: 'd5', hotelId: 'h2', hotelName: 'Burj Al Arab Residences', roomName: 'Sea View Room', discount: 65, expiresAt: '2026-05-31T19:30:00', status: 'active', base_price: 560, dealPrice: 196, isActive: true },
];

export const MOCK_BOOKINGS: PartnerBooking[] = [
  { id: 'SR-001', guestName: 'James Carter', hotelName: 'Atlantis Tower Suites', roomName: 'Ocean View Suite', checkIn: '2026-05-31', checkOut: '2026-06-02', status: 'Confirmed', totalAmount: 370 },
  { id: 'SR-002', guestName: 'Sarah Mitchell', hotelName: 'Burj Al Arab Residences', roomName: 'Deluxe Suite', checkIn: '2026-05-30', checkOut: '2026-06-01', status: 'Checked In', totalAmount: 624 },
  { id: 'SR-003', guestName: 'Ahmad Al Farsi', hotelName: 'DIFC Grand Hotel', roomName: 'Executive Room', checkIn: '2026-05-28', checkOut: '2026-05-31', status: 'Completed', totalAmount: 783 },
  { id: 'SR-004', guestName: 'Emma Rodriguez', hotelName: 'Atlantis Tower Suites', roomName: 'Palm Premier Room', checkIn: '2026-05-31', checkOut: '2026-06-03', status: 'Confirmed', totalAmount: 420 },
  { id: 'SR-005', guestName: 'David Chen', hotelName: 'Burj Al Arab Residences', roomName: 'Sea View Room', checkIn: '2026-05-29', checkOut: '2026-05-31', status: 'Cancelled', totalAmount: 0 },
  { id: 'SR-006', guestName: 'Fatima Al Hassan', hotelName: 'DIFC Grand Hotel', roomName: 'Business Suite', checkIn: '2026-05-31', checkOut: '2026-06-01', status: 'Confirmed', totalAmount: 756 },
  { id: 'SR-007', guestName: 'Michael Thompson', hotelName: 'Atlantis Tower Suites', roomName: 'Royal Penthouse', checkIn: '2026-05-31', checkOut: '2026-06-04', status: 'Checked In', totalAmount: 2160 },
  { id: 'SR-008', guestName: 'Aisha Patel', hotelName: 'Burj Al Arab Residences', roomName: 'Deluxe Suite', checkIn: '2026-05-31', checkOut: '2026-06-02', status: 'Confirmed', totalAmount: 624 },
];
