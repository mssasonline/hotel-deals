interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
  icon: React.ReactNode;
  accent?: 'blue' | 'gold' | 'green' | 'red';
}

const ACCENT_STYLES = {
  blue: { icon: 'bg-brand-blue-light text-brand-blue', border: 'border-brand-blue/10' },
  gold: { icon: 'bg-brand-gold-light text-brand-gold', border: 'border-brand-gold/20' },
  green: { icon: 'bg-green-50 text-green-600', border: 'border-green-100' },
  red: { icon: 'bg-red-50 text-red-500', border: 'border-red-100' },
};

export default function DashboardCard({ title, value, subtitle, trend, icon, accent = 'blue' }: DashboardCardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div className={`bg-white rounded-2xl p-5 border ${styles.border} shadow-sm hover:shadow-md transition-shadow duration-200`}>
      <div className="flex items-start justify-between mb-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles.icon}`}>
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
