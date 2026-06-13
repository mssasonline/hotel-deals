export type DealStatus = 'LOW_DEMAND' | 'MEDIUM_DEMAND' | 'HIGH_DEMAND' | 'CRITICAL';

export interface UrgencyConfig {
  status: DealStatus;
  label: string;
  dealBadge: string;
  discountPercent: number;
  badgeBg: string;
  badgeText: string;
  dotColor: string;
  urgencyBg: string;
  urgencyBorder: string;
  urgencyText: string;
}

export function calculateDiscount(timeLeft: number): number {
  if (timeLeft > 12) return 20;
  if (timeLeft >= 6) return 35;
  if (timeLeft >= 2) return 55;
  return 70;
}

export function getDealStatus(timeLeft: number): DealStatus {
  if (timeLeft > 12) return 'LOW_DEMAND';
  if (timeLeft >= 6) return 'MEDIUM_DEMAND';
  if (timeLeft >= 2) return 'HIGH_DEMAND';
  return 'CRITICAL';
}

export function calculateFinalPrice(originalPrice: number, timeLeft: number): number {
  return Math.round(originalPrice * (1 - calculateDiscount(timeLeft) / 100));
}

export function getUrgencyConfig(timeLeft: number): UrgencyConfig {
  const status = getDealStatus(timeLeft);
  const discountPercent = calculateDiscount(timeLeft);

  switch (status) {
    case 'LOW_DEMAND':
      return {
        status, discountPercent,
        label: 'Low Demand',
        dealBadge: 'Early Bird Deal',
        badgeBg: 'bg-sky-100',
        badgeText: 'text-sky-700',
        dotColor: 'bg-sky-500',
        urgencyBg: 'bg-sky-50',
        urgencyBorder: 'border-sky-200',
        urgencyText: 'text-sky-700',
      };
    case 'MEDIUM_DEMAND':
      return {
        status, discountPercent,
        label: 'Last Minute Deal',
        dealBadge: 'Last Minute Deal',
        badgeBg: 'bg-amber-100',
        badgeText: 'text-amber-700',
        dotColor: 'bg-amber-500',
        urgencyBg: 'bg-amber-50',
        urgencyBorder: 'border-amber-200',
        urgencyText: 'text-amber-700',
      };
    case 'HIGH_DEMAND':
      return {
        status, discountPercent,
        label: 'Almost Gone',
        dealBadge: 'Almost Gone',
        badgeBg: 'bg-orange-500',
        badgeText: 'text-white',
        dotColor: 'bg-white',
        urgencyBg: 'bg-orange-50',
        urgencyBorder: 'border-orange-200',
        urgencyText: 'text-orange-700',
      };
    case 'CRITICAL':
      return {
        status, discountPercent,
        label: 'Almost Gone',
        dealBadge: 'Flash Sale',
        badgeBg: 'bg-red-500',
        badgeText: 'text-white',
        dotColor: 'bg-white',
        urgencyBg: 'bg-red-50',
        urgencyBorder: 'border-red-200',
        urgencyText: 'text-red-700',
      };
  }
}
