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
  blue:   { icon: 'text-white',        iconBg: 'linear-gradient(135deg,#1E3A8A 0%,#2563EB 100%)', border: 'rgba(30,58,138,0.1)',  shadow: 'rgba(30,58,138,0.08)'  },
  gold:   { icon: 'text-white',        iconBg: 'linear-gradient(135deg,#B45309 0%,#D97706 100%)', border: 'rgba(180,83,9,0.15)',  shadow: 'rgba(180,83,9,0.06)'   },
  green:  { icon: 'text-white',        iconBg: 'linear-gradient(135deg,#059669 0%,#10B981 100%)', border: 'rgba(5,150,105,0.12)', shadow: 'rgba(5,150,105,0.06)'  },
  purple: { icon: 'text-white',        iconBg: 'linear-gradient(135deg,#6D28D9 0%,#8B5CF6 100%)', border: 'rgba(109,40,217,0.12)',shadow: 'rgba(109,40,217,0.06)' },
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
    <div className="bg-white rounded-2xl p-5 flex flex-col gap-3 transition-all duration-200 hover:-translate-y-0.5" style={{ border: `1px solid ${styles.border}`, boxShadow: `0 2px 12px ${styles.shadow}` }}>
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${styles.icon}`} style={{ background: styles.iconBg }}>
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
