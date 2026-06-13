import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { calcRoomPrice } from '@/lib/pricingEngine';
import type { RoomCategory } from '@/lib/roomImages';

export interface SelectedHotel {
  id: number;
  name: string;
  location: string;
  address: string;
  city: string;
  stars: number;
  rating: number;
}

export interface SelectedRoom {
  id: string;
  name: string;
  room_type: RoomCategory;
  image_url?: string;
  bedType: string;
  sizeM2: number;
  maxGuests: number;
  /** Original rack rate — shown as strikethrough price */
  basePrice: number;
  /** Discounted selling price — the active payable price */
  pricePerNight: number;
  features: string[];
  quantity: number;
  quantity_available?: number;
}

export interface SavedBooking {
  bookingId: string;
  hotelId: number;
  hotelName: string;
  location: string;
  address: string;
  city: string;
  roomType: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  nights: number;
  /** Price locked at booking time (before taxes) */
  lockedPrice: number;
  totalPrice: number;
  status: 'confirmed' | 'completed' | 'cancelled';
  bookedAt: string;
}

interface BookingStore {
  selectedHotel: SelectedHotel | null;
  selectedRoom: SelectedRoom | null;
  checkInDate: string;
  checkOutDate: string;
  guests: number;
  totalPrice: number;
  bookings: SavedBooking[];

  setSelectedHotel: (hotel: SelectedHotel) => void;
  setRoom: (room: SelectedRoom | null) => void;
  setDates: (checkIn: string, checkOut: string) => void;
  setGuests: (guests: number) => void;
  calculateTotalPrice: () => number;
  confirmBooking: () => string;
  resetBooking: () => void;
}

function parseFormattedDate(s: string): number {
  const months: Record<string, number> = {
    Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
    Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
  };
  const m = s.match(/\w{3},\s+(\w{3})\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return Date.parse(s);
  return Date.UTC(Number(m[3]), months[m[1]] ?? 0, Number(m[2]));
}

function calcNights(checkIn: string, checkOut: string): number {
  return Math.max(1, Math.ceil((parseFormattedDate(checkOut) - parseFormattedDate(checkIn)) / 86_400_000));
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function defaultCheckIn() {
  return formatDate(new Date());
}

function defaultCheckOut() {
  return formatDate(new Date(Date.now() + 86_400_000));
}

export const useBookingStore = create<BookingStore>()(
  persist(
    (set, get) => ({
      selectedHotel: null,
      selectedRoom: null,
      checkInDate: defaultCheckIn(),
      checkOutDate: defaultCheckOut(),
      guests: 2,
      totalPrice: 0,
      bookings: [],

      setSelectedHotel: (hotel) => set({ selectedHotel: hotel }),

      setRoom: (room) => {
        set({ selectedRoom: room });
        if (room) {
          const { currentPrice } = calcRoomPrice(room.basePrice, room.pricePerNight);
          const taxes = Math.round(currentPrice * 0.15);
          set({ totalPrice: currentPrice + taxes });
        }
      },

      setDates: (checkIn, checkOut) =>
        set({ checkInDate: checkIn, checkOutDate: checkOut }),

      setGuests: (guests) => set({ guests }),

      calculateTotalPrice: () => {
        const { selectedRoom, checkInDate, checkOutDate } = get();
        if (!selectedRoom) { set({ totalPrice: 0 }); return 0; }
        const nights = calcNights(checkInDate, checkOutDate);
        const price = calcRoomPrice(selectedRoom.basePrice, selectedRoom.pricePerNight).currentPrice;
        const subtotal = price * nights * Math.max(1, selectedRoom.quantity ?? 1);
        const taxes = Math.round(subtotal * 0.15);
        const total = subtotal + taxes;
        set({ totalPrice: total });
        return total;
      },

      confirmBooking: () => {
        const { selectedHotel, selectedRoom, checkInDate, checkOutDate, guests } = get();
        const bookingId = `SR-${Date.now().toString().slice(-8)}`;

        if (selectedHotel) {
          const nights = calcNights(checkInDate, checkOutDate);
          const lockedPrice = selectedRoom
            ? calcRoomPrice(selectedRoom.basePrice, selectedRoom.pricePerNight).currentPrice
            : 0;
          const roomCount = Math.max(1, selectedRoom?.quantity ?? 1);
          const subtotal = lockedPrice * nights * roomCount;
          const taxes = Math.round(subtotal * 0.15);
          const totalPrice = subtotal + taxes;

          const newBooking: SavedBooking = {
            bookingId,
            hotelId: selectedHotel.id,
            hotelName: selectedHotel.name,
            location: selectedHotel.location,
            address: selectedHotel.address,
            city: selectedHotel.city,
            roomType: selectedRoom?.name ?? 'Standard Room',
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests,
            nights,
            lockedPrice,
            totalPrice,
            status: 'confirmed',
            bookedAt: new Date().toISOString(),
          };

          set((state) => ({ bookings: [newBooking, ...state.bookings] }));
        }

        return bookingId;
      },

      resetBooking: () =>
        set({
          selectedHotel: null,
          selectedRoom: null,
          checkInDate: defaultCheckIn(),
          checkOutDate: defaultCheckOut(),
          guests: 2,
          totalPrice: 0,
        }),
    }),
    {
      name: 'sr-booking-store',
      partialize: (state) => ({
        selectedHotel: state.selectedHotel,
        selectedRoom: state.selectedRoom,
        checkInDate: state.checkInDate,
        checkOutDate: state.checkOutDate,
        guests: state.guests,
        totalPrice: state.totalPrice,
        bookings: state.bookings,
      }),
    }
  )
);
