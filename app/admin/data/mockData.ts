// ─── Types ──────────────────────────────────────────────────────────────────

export type HotelStatus = 'approved' | 'pending' | 'suspended';
export type PartnerStatus = 'active' | 'suspended' | 'pending';
export type UserStatus = 'active' | 'suspended';
export type BookingStatus = 'confirmed' | 'pending' | 'cancelled' | 'completed';
export type DealStatus = 'active' | 'paused' | 'ended';
export type PaymentStatus = 'paid' | 'pending' | 'refunded' | 'failed';
export type PaymentMethod = 'apple_pay' | 'google_pay' | 'credit_card' | 'debit_card';

export interface AdminHotel {
  id: string;
  name: string;
  city: string;
  country: string;
  partner: string;
  partnerId: string;
  rating: number;
  status: HotelStatus;
  rooms: number;
  totalBookings: number;
  revenue: number;
  createdAt: string;
}

export interface AdminPartner {
  id: string;
  name: string;
  email: string;
  company: string;
  country: string;
  status: PartnerStatus;
  hotels: number;
  totalBookings: number;
  revenue: number;
  joinedAt: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  country: string;
  totalBookings: number;
  totalSpent: number;
  status: UserStatus;
  joinedAt: string;
  lastLogin: string;
}

export interface AdminBooking {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  hotelName: string;
  roomName: string;
  city: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  bookingDate: string;
  status: BookingStatus;
  amount: number;
}

export interface AdminDeal {
  id: string;
  hotelName: string;
  city: string;
  partnerId: string;
  partnerName: string;
  roomName: string;
  discount: number;
  /** Original rack rate — strikethrough price */
  base_price: number;
  /** Discounted selling price — the active payable price */
  price_per_night: number;
  /** Current deal price (alias for price_per_night — shown for monitoring) */
  dealPrice: number;
  startTime: string;
  expiryTime: string;
  status: DealStatus;
  bookingCount: number;
}

export interface AdminPayment {
  id: string;
  bookingId: string;
  userName: string;
  userEmail: string;
  hotelName: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  processedAt: string;
  currency: string;
}

// ─── KPI & Analytics ────────────────────────────────────────────────────────

export interface KPIData {
  totalHotels: number;
  totalPartners: number;
  totalUsers: number;
  totalBookings: number;
  activeDeals: number;
  totalRevenue: number;
  revenueToday: number;
  platformGrowth: number;
}

export interface RevenuePoint {
  month: string;
  revenue: number;
  bookings: number;
}

export interface CityData {
  city: string;
  bookings: number;
  revenue: number;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

export const ADMIN_KPIS: KPIData = {
  totalHotels: 147,
  totalPartners: 62,
  totalUsers: 8941,
  totalBookings: 3284,
  activeDeals: 89,
  totalRevenue: 2847600,
  revenueToday: 18420,
  platformGrowth: 23.4,
};

export const ADMIN_HOTELS: AdminHotel[] = [
  { id: 'ah1', name: 'Atlantis Tower Suites', city: 'Dubai', country: 'UAE', partner: 'Gulf Hospitality Group', partnerId: 'p1', rating: 4.9, status: 'approved', rooms: 84, totalBookings: 312, revenue: 487200, createdAt: '2025-01-15' },
  { id: 'ah2', name: 'Burj Al Arab Residences', city: 'Dubai', country: 'UAE', partner: 'Gulf Hospitality Group', partnerId: 'p1', rating: 4.8, status: 'approved', rooms: 202, totalBookings: 289, revenue: 621500, createdAt: '2025-01-20' },
  { id: 'ah3', name: 'Le Grand Paris Hôtel', city: 'Paris', country: 'France', partner: 'European Stays Ltd', partnerId: 'p2', rating: 4.7, status: 'approved', rooms: 128, totalBookings: 445, revenue: 312800, createdAt: '2025-02-03' },
  { id: 'ah4', name: 'The Shard Residences', city: 'London', country: 'UK', partner: 'European Stays Ltd', partnerId: 'p2', rating: 4.6, status: 'approved', rooms: 95, totalBookings: 267, revenue: 298400, createdAt: '2025-02-18' },
  { id: 'ah5', name: 'Marina Bay Suites', city: 'Singapore', country: 'Singapore', partner: 'Asia Pacific Hotels', partnerId: 'p3', rating: 4.8, status: 'approved', rooms: 156, totalBookings: 501, revenue: 394600, createdAt: '2025-03-01' },
  { id: 'ah6', name: 'Shinjuku Grand Hotel', city: 'Tokyo', country: 'Japan', partner: 'Asia Pacific Hotels', partnerId: 'p3', rating: 4.7, status: 'approved', rooms: 210, totalBookings: 388, revenue: 276300, createdAt: '2025-03-12' },
  { id: 'ah7', name: 'Central Park Loft', city: 'New York', country: 'USA', partner: 'Americas Collection', partnerId: 'p4', rating: 4.5, status: 'pending', rooms: 73, totalBookings: 0, revenue: 0, createdAt: '2026-05-28' },
  { id: 'ah8', name: 'Copacabana Palace', city: 'Rio de Janeiro', country: 'Brazil', partner: 'Americas Collection', partnerId: 'p4', rating: 4.4, status: 'pending', rooms: 118, totalBookings: 0, revenue: 0, createdAt: '2026-05-30' },
  { id: 'ah9', name: 'Palm Beach Villas', city: 'Miami', country: 'USA', partner: 'Americas Collection', partnerId: 'p4', rating: 4.2, status: 'suspended', rooms: 60, totalBookings: 82, revenue: 54300, createdAt: '2025-04-10' },
  { id: 'ah10', name: 'Dunes Resort & Spa', city: 'Marrakech', country: 'Morocco', partner: 'Africa & Middle East Hotels', partnerId: 'p5', rating: 4.3, status: 'suspended', rooms: 45, totalBookings: 31, revenue: 18700, createdAt: '2025-05-22' },
];

export const ADMIN_PARTNERS: AdminPartner[] = [
  { id: 'p1', name: 'Khalid Al Mansouri', email: 'khalid@gulhospitality.com', company: 'Gulf Hospitality Group', country: 'UAE', status: 'active', hotels: 24, totalBookings: 1842, revenue: 2.4e6, joinedAt: '2025-01-10' },
  { id: 'p2', name: 'Sophie Beaumont', email: 'sophie@europeanstays.com', company: 'European Stays Ltd', country: 'France', status: 'active', hotels: 18, totalBookings: 1201, revenue: 1.1e6, joinedAt: '2025-02-01' },
  { id: 'p3', name: 'Wei Liang', email: 'wei@asiapacifichotels.com', company: 'Asia Pacific Hotels', country: 'Singapore', status: 'active', hotels: 15, totalBookings: 987, revenue: 840000, joinedAt: '2025-03-05' },
  { id: 'p4', name: 'Carlos Reyes', email: 'carlos@americascollection.com', company: 'Americas Collection', country: 'USA', status: 'pending', hotels: 8, totalBookings: 0, revenue: 0, joinedAt: '2026-05-20' },
  { id: 'p5', name: 'Fatima Zahra', email: 'fatima@afmehotels.com', company: 'Africa & Middle East Hotels', country: 'Morocco', status: 'suspended', hotels: 3, totalBookings: 124, revenue: 67000, joinedAt: '2025-05-15' },
  { id: 'p6', name: 'Priya Sharma', email: 'priya@indialuxury.com', company: 'India Luxury Stays', country: 'India', status: 'active', hotels: 11, totalBookings: 654, revenue: 421000, joinedAt: '2025-04-02' },
];

export const ADMIN_USERS: AdminUser[] = [
  { id: 'u1', name: 'James Carter', email: 'james.carter@email.com', country: 'United States', totalBookings: 12, totalSpent: 8640, status: 'active', joinedAt: '2025-02-14', lastLogin: '2026-05-31' },
  { id: 'u2', name: 'Sarah Mitchell', email: 'sarah.mitchell@email.com', country: 'United Kingdom', totalBookings: 8, totalSpent: 5920, status: 'active', joinedAt: '2025-03-02', lastLogin: '2026-05-30' },
  { id: 'u3', name: 'Ahmad Al Farsi', email: 'ahmad.farsi@email.com', country: 'UAE', totalBookings: 21, totalSpent: 34200, status: 'active', joinedAt: '2025-01-18', lastLogin: '2026-05-31' },
  { id: 'u4', name: 'Emma Rodriguez', email: 'emma.rodriguez@email.com', country: 'Spain', totalBookings: 5, totalSpent: 3100, status: 'active', joinedAt: '2025-04-08', lastLogin: '2026-05-28' },
  { id: 'u5', name: 'David Chen', email: 'david.chen@email.com', country: 'Singapore', totalBookings: 15, totalSpent: 12400, status: 'active', joinedAt: '2025-03-20', lastLogin: '2026-05-29' },
  { id: 'u6', name: 'Fatima Al Hassan', email: 'fatima.hassan@email.com', country: 'Saudi Arabia', totalBookings: 9, totalSpent: 7800, status: 'active', joinedAt: '2025-02-27', lastLogin: '2026-05-31' },
  { id: 'u7', name: 'Michael Thompson', email: 'michael.t@email.com', country: 'Canada', totalBookings: 3, totalSpent: 4300, status: 'active', joinedAt: '2025-05-10', lastLogin: '2026-05-25' },
  { id: 'u8', name: 'Aisha Patel', email: 'aisha.patel@email.com', country: 'India', totalBookings: 7, totalSpent: 5100, status: 'active', joinedAt: '2025-04-15', lastLogin: '2026-05-30' },
  { id: 'u9', name: 'Lars Eriksson', email: 'lars.eriksson@email.com', country: 'Sweden', totalBookings: 2, totalSpent: 1240, status: 'suspended', joinedAt: '2026-01-05', lastLogin: '2026-03-14' },
  { id: 'u10', name: 'Yuki Tanaka', email: 'yuki.tanaka@email.com', country: 'Japan', totalBookings: 18, totalSpent: 14600, status: 'active', joinedAt: '2025-02-01', lastLogin: '2026-05-31' },
];

export const ADMIN_BOOKINGS: AdminBooking[] = [
  { id: 'SR-1001', userId: 'u3', userName: 'Ahmad Al Farsi', userEmail: 'ahmad.farsi@email.com', hotelName: 'Atlantis Tower Suites', roomName: 'Ocean View Suite', city: 'Dubai', checkIn: '2026-05-31', checkOut: '2026-06-03', nights: 3, bookingDate: '2026-05-29', status: 'confirmed', amount: 555 },
  { id: 'SR-1002', userId: 'u2', userName: 'Sarah Mitchell', userEmail: 'sarah.mitchell@email.com', hotelName: 'The Shard Residences', roomName: 'City View Deluxe', city: 'London', checkIn: '2026-05-30', checkOut: '2026-06-02', nights: 3, bookingDate: '2026-05-28', status: 'confirmed', amount: 780 },
  { id: 'SR-1003', userId: 'u1', userName: 'James Carter', userEmail: 'james.carter@email.com', hotelName: 'Marina Bay Suites', roomName: 'Harbour Suite', city: 'Singapore', checkIn: '2026-05-28', checkOut: '2026-05-31', nights: 3, bookingDate: '2026-05-25', status: 'completed', amount: 1020 },
  { id: 'SR-1004', userId: 'u10', userName: 'Yuki Tanaka', userEmail: 'yuki.tanaka@email.com', hotelName: 'Shinjuku Grand Hotel', roomName: 'Executive Room', city: 'Tokyo', checkIn: '2026-06-01', checkOut: '2026-06-04', nights: 3, bookingDate: '2026-05-31', status: 'confirmed', amount: 420 },
  { id: 'SR-1005', userId: 'u5', userName: 'David Chen', userEmail: 'david.chen@email.com', hotelName: 'Burj Al Arab Residences', roomName: 'Royal Suite', city: 'Dubai', checkIn: '2026-05-25', checkOut: '2026-05-28', nights: 3, bookingDate: '2026-05-22', status: 'completed', amount: 2400 },
  { id: 'SR-1006', userId: 'u4', userName: 'Emma Rodriguez', userEmail: 'emma.rodriguez@email.com', hotelName: 'Le Grand Paris Hôtel', roomName: 'Classic Room', city: 'Paris', checkIn: '2026-06-05', checkOut: '2026-06-08', nights: 3, bookingDate: '2026-05-31', status: 'pending', amount: 390 },
  { id: 'SR-1007', userId: 'u6', userName: 'Fatima Al Hassan', userEmail: 'fatima.hassan@email.com', hotelName: 'Atlantis Tower Suites', roomName: 'Palm Premier Room', city: 'Dubai', checkIn: '2026-05-29', checkOut: '2026-06-01', nights: 3, bookingDate: '2026-05-27', status: 'confirmed', amount: 420 },
  { id: 'SR-1008', userId: 'u8', userName: 'Aisha Patel', userEmail: 'aisha.patel@email.com', hotelName: 'Marina Bay Suites', roomName: 'Garden View Room', city: 'Singapore', checkIn: '2026-05-20', checkOut: '2026-05-23', nights: 3, bookingDate: '2026-05-18', status: 'completed', amount: 600 },
  { id: 'SR-1009', userId: 'u7', userName: 'Michael Thompson', userEmail: 'michael.t@email.com', hotelName: 'Le Grand Paris Hôtel', roomName: 'Deluxe Suite', city: 'Paris', checkIn: '2026-04-12', checkOut: '2026-04-15', nights: 3, bookingDate: '2026-04-10', status: 'cancelled', amount: 0 },
  { id: 'SR-1010', userId: 'u1', userName: 'James Carter', userEmail: 'james.carter@email.com', hotelName: 'Burj Al Arab Residences', roomName: 'Sea View Room', city: 'Dubai', checkIn: '2026-05-31', checkOut: '2026-06-02', nights: 2, bookingDate: '2026-05-30', status: 'confirmed', amount: 392 },
  { id: 'SR-1011', userId: 'u9', userName: 'Lars Eriksson', userEmail: 'lars.eriksson@email.com', hotelName: 'The Shard Residences', roomName: 'Standard Room', city: 'London', checkIn: '2026-03-10', checkOut: '2026-03-12', nights: 2, bookingDate: '2026-03-08', status: 'cancelled', amount: 0 },
  { id: 'SR-1012', userId: 'u10', userName: 'Yuki Tanaka', userEmail: 'yuki.tanaka@email.com', hotelName: 'Shinjuku Grand Hotel', roomName: 'Deluxe Twin', city: 'Tokyo', checkIn: '2026-05-10', checkOut: '2026-05-14', nights: 4, bookingDate: '2026-05-08', status: 'completed', amount: 640 },
];

export const ADMIN_DEALS: AdminDeal[] = [
  { id: 'dl1', hotelName: 'Atlantis Tower Suites', city: 'Dubai', partnerId: 'p1', partnerName: 'Gulf Hospitality Group', roomName: 'Ocean View Suite', discount: 50, base_price: 500, price_per_night:250, dealPrice: 250, startTime: '2026-06-03T10:00:00', expiryTime: '2026-06-03T23:59:00', status: 'active', bookingCount: 7 },
  { id: 'dl2', hotelName: 'Atlantis Tower Suites', city: 'Dubai', partnerId: 'p1', partnerName: 'Gulf Hospitality Group', roomName: 'Palm Premier Room', discount: 50, base_price: 350, price_per_night:175, dealPrice: 175, startTime: '2026-06-03T12:00:00', expiryTime: '2026-06-03T23:59:00', status: 'active', bookingCount: 12 },
  { id: 'dl3', hotelName: 'Burj Al Arab Residences', city: 'Dubai', partnerId: 'p1', partnerName: 'Gulf Hospitality Group', roomName: 'Deluxe Suite', discount: 50, base_price: 780, price_per_night:390, dealPrice: 390, startTime: '2026-06-03T08:00:00', expiryTime: '2026-06-03T23:59:00', status: 'ended', bookingCount: 4 },
  { id: 'dl4', hotelName: 'Le Grand Paris Hôtel', city: 'Paris', partnerId: 'p2', partnerName: 'European Stays Ltd', roomName: 'Classic Room', discount: 50, base_price: 280, price_per_night:140, dealPrice: 140, startTime: '2026-06-03T09:00:00', expiryTime: '2026-06-03T23:59:00', status: 'active', bookingCount: 18 },
  { id: 'dl5', hotelName: 'The Shard Residences', city: 'London', partnerId: 'p2', partnerName: 'European Stays Ltd', roomName: 'City View Deluxe', discount: 50, base_price: 460, price_per_night:230, dealPrice: 230, startTime: '2026-06-03T11:00:00', expiryTime: '2026-06-03T23:59:00', status: 'paused', bookingCount: 9 },
  { id: 'dl6', hotelName: 'Marina Bay Suites', city: 'Singapore', partnerId: 'p3', partnerName: 'Asia Pacific Hotels', roomName: 'Harbour Suite', discount: 50, base_price: 680, price_per_night:340, dealPrice: 340, startTime: '2026-06-03T07:00:00', expiryTime: '2026-06-03T23:59:00', status: 'active', bookingCount: 23 },
  { id: 'dl7', hotelName: 'Shinjuku Grand Hotel', city: 'Tokyo', partnerId: 'p3', partnerName: 'Asia Pacific Hotels', roomName: 'Executive Room', discount: 50, base_price: 350, price_per_night:175, dealPrice: 175, startTime: '2026-06-02T10:00:00', expiryTime: '2026-06-02T23:59:00', status: 'ended', bookingCount: 14 },
  { id: 'dl8', hotelName: 'Marina Bay Suites', city: 'Singapore', partnerId: 'p3', partnerName: 'Asia Pacific Hotels', roomName: 'Garden View Room', discount: 50, base_price: 400, price_per_night:200, dealPrice: 200, startTime: '2026-06-03T00:00:00', expiryTime: '2026-06-03T23:59:00', status: 'paused', bookingCount: 0 },
];

export const ADMIN_PAYMENTS: AdminPayment[] = [
  { id: 'TXN-8801', bookingId: 'SR-1001', userName: 'Ahmad Al Farsi', userEmail: 'ahmad.farsi@email.com', hotelName: 'Atlantis Tower Suites', amount: 555, method: 'credit_card', status: 'paid', processedAt: '2026-05-29T14:22:00', currency: 'USD' },
  { id: 'TXN-8802', bookingId: 'SR-1002', userName: 'Sarah Mitchell', userEmail: 'sarah.mitchell@email.com', hotelName: 'The Shard Residences', amount: 780, method: 'apple_pay', status: 'paid', processedAt: '2026-05-28T10:05:00', currency: 'USD' },
  { id: 'TXN-8803', bookingId: 'SR-1003', userName: 'James Carter', userEmail: 'james.carter@email.com', hotelName: 'Marina Bay Suites', amount: 1020, method: 'google_pay', status: 'paid', processedAt: '2026-05-25T16:44:00', currency: 'USD' },
  { id: 'TXN-8804', bookingId: 'SR-1004', userName: 'Yuki Tanaka', userEmail: 'yuki.tanaka@email.com', hotelName: 'Shinjuku Grand Hotel', amount: 420, method: 'credit_card', status: 'paid', processedAt: '2026-05-31T08:11:00', currency: 'USD' },
  { id: 'TXN-8805', bookingId: 'SR-1005', userName: 'David Chen', userEmail: 'david.chen@email.com', hotelName: 'Burj Al Arab Residences', amount: 2400, method: 'debit_card', status: 'paid', processedAt: '2026-05-22T12:30:00', currency: 'USD' },
  { id: 'TXN-8806', bookingId: 'SR-1006', userName: 'Emma Rodriguez', userEmail: 'emma.rodriguez@email.com', hotelName: 'Le Grand Paris Hôtel', amount: 390, method: 'apple_pay', status: 'pending', processedAt: '2026-05-31T09:58:00', currency: 'USD' },
  { id: 'TXN-8807', bookingId: 'SR-1007', userName: 'Fatima Al Hassan', userEmail: 'fatima.hassan@email.com', hotelName: 'Atlantis Tower Suites', amount: 420, method: 'credit_card', status: 'paid', processedAt: '2026-05-27T17:20:00', currency: 'USD' },
  { id: 'TXN-8808', bookingId: 'SR-1008', userName: 'Aisha Patel', userEmail: 'aisha.patel@email.com', hotelName: 'Marina Bay Suites', amount: 600, method: 'google_pay', status: 'paid', processedAt: '2026-05-18T11:05:00', currency: 'USD' },
  { id: 'TXN-8809', bookingId: 'SR-1009', userName: 'Michael Thompson', userEmail: 'michael.t@email.com', hotelName: 'Le Grand Paris Hôtel', amount: 450, method: 'debit_card', status: 'refunded', processedAt: '2026-04-10T14:00:00', currency: 'USD' },
  { id: 'TXN-8810', bookingId: 'SR-1010', userName: 'James Carter', userEmail: 'james.carter@email.com', hotelName: 'Burj Al Arab Residences', amount: 392, method: 'apple_pay', status: 'paid', processedAt: '2026-05-30T19:42:00', currency: 'USD' },
  { id: 'TXN-8811', bookingId: 'SR-1011', userName: 'Lars Eriksson', userEmail: 'lars.eriksson@email.com', hotelName: 'The Shard Residences', amount: 260, method: 'credit_card', status: 'refunded', processedAt: '2026-03-08T09:00:00', currency: 'USD' },
  { id: 'TXN-8812', bookingId: 'SR-1012', userName: 'Yuki Tanaka', userEmail: 'yuki.tanaka@email.com', hotelName: 'Shinjuku Grand Hotel', amount: 640, method: 'google_pay', status: 'paid', processedAt: '2026-05-08T13:25:00', currency: 'USD' },
];

export const REVENUE_TREND: RevenuePoint[] = [
  { month: 'Dec', revenue: 142000, bookings: 210 },
  { month: 'Jan', revenue: 168000, bookings: 248 },
  { month: 'Feb', revenue: 195000, bookings: 290 },
  { month: 'Mar', revenue: 221000, bookings: 328 },
  { month: 'Apr', revenue: 248000, bookings: 371 },
  { month: 'May', revenue: 284760, bookings: 412 },
];

export const TOP_CITIES: CityData[] = [
  { city: 'Dubai', bookings: 1240, revenue: 1120000 },
  { city: 'Singapore', bookings: 890, revenue: 678000 },
  { city: 'Paris', bookings: 720, revenue: 424000 },
  { city: 'London', bookings: 650, revenue: 398000 },
  { city: 'Tokyo', bookings: 580, revenue: 312000 },
];
