interface StatusBadgeProps {
  status: string;
  variant?: 'hotel' | 'partner' | 'user' | 'booking' | 'deal' | 'payment';
}

type ColorMap = Record<string, string>;

const HOTEL_COLORS: ColorMap = {
  approved: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  suspended: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

const BOOKING_COLORS: ColorMap = {
  upcoming:  'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200',
  confirmed: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  pending:   'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  cancelled: 'bg-red-50 text-red-600 ring-1 ring-red-200',
  completed: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
};

const DEAL_COLORS: ColorMap = {
  active: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  paused: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  ended: 'bg-gray-100 text-gray-500 ring-1 ring-gray-200',
};

const PAYMENT_COLORS: ColorMap = {
  paid: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
  pending: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
  refunded: 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  failed: 'bg-red-50 text-red-700 ring-1 ring-red-200',
};

const DOT_COLORS: ColorMap = {
  approved:  'bg-emerald-500',
  active:    'bg-emerald-500',
  paid:      'bg-emerald-500',
  upcoming:  'bg-indigo-500',
  confirmed: 'bg-blue-500',
  completed: 'bg-emerald-500',
  pending:   'bg-amber-500',
  paused:    'bg-amber-500',
  suspended: 'bg-red-500',
  cancelled: 'bg-red-500',
  failed:    'bg-red-500',
  ended:     'bg-gray-400',
  refunded:  'bg-purple-500',
};

function getColorClass(status: string, variant?: StatusBadgeProps['variant']): string {
  switch (variant) {
    case 'booking': return BOOKING_COLORS[status] ?? 'bg-gray-100 text-gray-500';
    case 'deal': return DEAL_COLORS[status] ?? 'bg-gray-100 text-gray-500';
    case 'payment': return PAYMENT_COLORS[status] ?? 'bg-gray-100 text-gray-500';
    default: return HOTEL_COLORS[status] ?? 'bg-gray-100 text-gray-500';
  }
}

export default function StatusBadge({ status, variant }: StatusBadgeProps) {
  const colorClass = getColorClass(status, variant);
  const dotColor = DOT_COLORS[status] ?? 'bg-gray-400';
  const label = status.charAt(0).toUpperCase() + status.slice(1).replace(/-/g, ' ');

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
      {label}
    </span>
  );
}
