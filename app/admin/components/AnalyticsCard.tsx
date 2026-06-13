interface AnalyticsCardProps {
  title: string;
  value: React.ReactNode;
  change?: string;
  positive?: boolean;
  description?: string;
}

export default function AnalyticsCard({
  title,
  value,
  change,
  positive = true,
  description,
}: AnalyticsCardProps) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      <div className="flex items-center gap-2 mt-2">
        {change && (
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
              positive
                ? 'bg-emerald-50 text-emerald-700'
                : 'bg-red-50 text-red-600'
            }`}
          >
            {positive ? '↑' : '↓'} {change}
          </span>
        )}
        {description && <p className="text-gray-400 text-xs">{description}</p>}
      </div>
    </div>
  );
}
