interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: { value: string; positive: boolean };
  icon: React.ReactNode;
  accent?: 'blue' | 'gold' | 'green' | 'purple';
  sparkline?: number[];
}

const ACCENT_STYLES = {
  blue: { icon: 'bg-blue-50 text-brand-blue', border: 'border-blue-100' },
  gold: { icon: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
  green: { icon: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
  purple: { icon: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
};

function Sparkline({ data, positive }: { data: number[]; positive: boolean }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 64;
  const h = 28;
  const step = w / (data.length - 1);

  const points = data
    .map((v, i) => `${i * step},${h - ((v - min) / range) * h}`)
    .join(' ');

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={positive ? '#10b981' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function KPICard({
  title,
  value,
  subtitle,
  trend,
  icon,
  accent = 'blue',
  sparkline,
}: KPICardProps) {
  const styles = ACCENT_STYLES[accent];

  return (
    <div className={`bg-white rounded-2xl border ${styles.border} shadow-sm p-5 flex flex-col gap-3`}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles.icon}`}>
          {icon}
        </div>
        {sparkline && trend && (
          <Sparkline data={sparkline} positive={trend.positive} />
        )}
      </div>

      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </p>
        <p className="text-gray-500 text-xs font-medium mt-1">{title}</p>
      </div>

      <div className="flex items-center justify-between">
        {subtitle && <p className="text-gray-400 text-xs">{subtitle}</p>}
        {trend && (
          <span
            className={`text-xs font-semibold ${
              trend.positive ? 'text-emerald-600' : 'text-red-500'
            }`}
          >
            {trend.positive ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
    </div>
  );
}
