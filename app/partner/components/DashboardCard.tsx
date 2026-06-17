interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
  icon: React.ReactNode;
  accent?: 'blue' | 'gold' | 'green' | 'red';
  onClick?: () => void;
}

const ACCENT_STYLES = {
  blue:  {
    iconBg: 'linear-gradient(135deg,#1E3A8A 0%,#2563EB 100%)',
    glow: 'rgba(37,99,235,0.18)',
    border: 'rgba(30,58,138,0.12)',
    badge: '#EEF4FF',
    badgeText: '#1E3A8A',
    strip: 'linear-gradient(135deg,#1E3A8A,#2563EB)',
  },
  gold:  {
    iconBg: 'linear-gradient(135deg,#B45309 0%,#D97706 100%)',
    glow: 'rgba(180,83,9,0.15)',
    border: 'rgba(180,83,9,0.15)',
    badge: '#FEF3C7',
    badgeText: '#B45309',
    strip: 'linear-gradient(135deg,#B45309,#D97706)',
  },
  green: {
    iconBg: 'linear-gradient(135deg,#059669 0%,#10B981 100%)',
    glow: 'rgba(5,150,105,0.15)',
    border: 'rgba(5,150,105,0.15)',
    badge: '#ECFDF5',
    badgeText: '#059669',
    strip: 'linear-gradient(135deg,#059669,#10B981)',
  },
  red:   {
    iconBg: 'linear-gradient(135deg,#DC2626 0%,#EF4444 100%)',
    glow: 'rgba(220,38,38,0.15)',
    border: 'rgba(220,38,38,0.12)',
    badge: '#FEF2F2',
    badgeText: '#DC2626',
    strip: 'linear-gradient(135deg,#DC2626,#EF4444)',
  },
};

export default function DashboardCard({ title, value, subtitle, trend, icon, accent = 'blue', onClick }: DashboardCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      onClick={onClick}
      className={`relative bg-white rounded-2xl p-5 overflow-hidden group transition-all duration-300 hover:-translate-y-1 ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
      style={{
        border: `1px solid ${styles.border}`,
        boxShadow: `0 2px 8px ${styles.glow}, 0 1px 3px rgba(0,0,0,0.04)`,
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 28px ${styles.glow}, 0 2px 8px rgba(0,0,0,0.06)`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.boxShadow = `0 2px 8px ${styles.glow}, 0 1px 3px rgba(0,0,0,0.04)`;
      }}
    >
      {/* Top accent strip */}
      <div className="absolute top-0 left-0 right-0 h-0.5 rounded-t-2xl" style={{ background: styles.strip }} />

      {/* Background shimmer */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" style={{
        background: `radial-gradient(circle at top left, ${styles.glow} 0%, transparent 60%)`,
      }} />

      <div className="relative">
        <div className="flex items-start justify-between mb-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center text-white shrink-0"
            style={{ background: styles.iconBg, boxShadow: `0 4px 12px ${styles.glow}` }}
          >
            {icon}
          </div>
          {trend && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${
              trend.positive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
            }`}>
              <svg className={`w-3 h-3 ${trend.positive ? '' : 'rotate-180'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              {trend.value}
            </span>
          )}
        </div>
        <div>
          <div className="text-2xl font-bold leading-none mb-1.5" style={{ color: '#0F172A' }}>{value}</div>
          <div className="text-sm font-semibold" style={{ color: '#334155' }}>{title}</div>
          {subtitle && <div className="text-xs mt-1" style={{ color: '#94A3B8' }}>{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}
