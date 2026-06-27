export const BOOKING_STATUS_STYLE: Record<string, { bg: string; text: string; dot: string; key: string }> = {
  upcoming:   { bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500',  key: 'partner.status.upcoming'   },
  confirmed:  { bg: 'bg-blue-50',   text: 'text-blue-700',  dot: 'bg-blue-500',  key: 'partner.status.confirmed'  },
  checked_in: { bg: 'bg-amber-50',  text: 'text-amber-700', dot: 'bg-amber-500', key: 'partner.status.checkedIn'  },
  completed:  { bg: 'bg-green-50',  text: 'text-green-700', dot: 'bg-green-500', key: 'partner.status.completed'  },
  cancelled:  { bg: 'bg-red-50',    text: 'text-red-600',   dot: 'bg-red-400',   key: 'partner.status.cancelled'  },
};

export function deriveStatus(b: { status: string; check_in: string; check_out: string }): string {
  if (b.status === 'cancelled') return 'cancelled';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const checkIn  = new Date(b.check_in);  checkIn.setHours(0, 0, 0, 0);
  const checkOut = new Date(b.check_out); checkOut.setHours(0, 0, 0, 0);
  if (checkOut < today)  return 'completed';
  if (checkIn <= today)  return 'checked_in';
  return b.status === 'confirmed' ? 'confirmed' : 'upcoming';
}
