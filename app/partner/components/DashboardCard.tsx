interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
  icon: React.ReactNode;
  accent?: 'blue' | 'gold' | 'green' | 'red';
}

const ACCENT_STYLES = {
  blue:  { iconBg: 'linear-gradient(135deg,#1E3A8A 0%,#2563EB 100%)', border: 'rgba(30,58,138,0.10)',  shadow: 'rgba(30,58,138,0.08)'  },
  gold:  { iconBg: 'linear-gradient(135deg,#B45309 0%,#D97706 100%)', border: 'rgba(180,83,9,0.15)',  shadow: 'rgba(180,83,9,0.06)'   },
  green: { iconBg: 'linear-gradient(135deg,#059669 0%,#10B981 100%)', border: 'rgba(5,150,105,0.12)', shadow: 'rgba(5,150,105,0.06)'  },
  red:   { iconBg: 'linear-gradient(135deg,#DC2626 0%,#EF4444 100%)', border: 'rgba(220,38,38,0.12)', shadow: 'rgba(220,38,38,0.06)'  },
};

export default function DashboardCard({ title, value, subtitle, trend, icon, accent = 'blue' }: DashboardCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div
      className="bg-white rounded-2xl p-5 shadow-sm hover:-translate-y-0.5 transition-all duration-200"
      style={{ border: `1.5px solid ${styles.border}`, boxShadow: `0 2px 12px ${styles.shadow}` }}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: styles.iconBg }}>
          {icon}
        </div>
        {trend && (
          <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${
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
        <div className="text-2xl font-bold text-gray-900 leading-none mb-1">{value}</div>
        <div className="text-sm font-medium text-gray-500">{title}</div>
        {subtitle && <div className="text-xs text-gray-400 mt-1">{subtitle}</div>}
      </div>
    </div>
  );
}
