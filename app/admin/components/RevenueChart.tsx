'use client';

import { useState } from 'react';
import { useAEDFormat } from '../../partner/components/AEDAmount';

const W = 600;
const H = 180;
const PAD = { top: 16, right: 16, bottom: 32, left: 56 };

export default function RevenueChart({ data }: { data: { month: string; revenue: number }[] }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const fmt = useAEDFormat();
  const maxRevenue = Math.max(...data.map((d) => d.revenue));
  const minRevenue = 0;
  const range = maxRevenue - minRevenue || 1;

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const step = innerW / (data.length - 1);

  const toX = (i: number) => PAD.left + i * step;
  const toY = (v: number) => PAD.top + innerH - ((v - minRevenue) / range) * innerH;

  const linePath = data
    .map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.revenue)}`)
    .join(' ');

  const areaPath = [
    ...data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.revenue)}`),
    `L${toX(data.length - 1)},${PAD.top + innerH}`,
    `L${PAD.left},${PAD.top + innerH}`,
    'Z',
  ].join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => minRevenue + t * range);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">Revenue Growth</h2>
          <p className="text-xs text-gray-400 mt-0.5">Last 6 months</p>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-brand-blue inline-block" />
          <span className="text-xs text-gray-500 font-medium">Monthly Revenue</span>
        </div>
      </div>

      <div className="px-6 py-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxHeight: H }}
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#003B95" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#003B95" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Y-axis grid lines & labels */}
          {yTicks.map((tick) => {
            const y = toY(tick);
            return (
              <g key={tick}>
                <line
                  x1={PAD.left}
                  y1={y}
                  x2={W - PAD.right}
                  y2={y}
                  stroke="#f1f5f9"
                  strokeWidth="1"
                />
                <text
                  x={PAD.left - 8}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize="10"
                  fill="#94a3b8"
                >
                  {fmt(tick)}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {data.map((d, i) => (
            <text
              key={d.month}
              x={toX(i)}
              y={PAD.top + innerH + 20}
              textAnchor="middle"
              fontSize="11"
              fill={hovered === i ? '#003B95' : '#94a3b8'}
              fontWeight={hovered === i ? '600' : '400'}
            >
              {d.month}
            </text>
          ))}

          {/* Area fill */}
          <path d={areaPath} fill="url(#revGrad)" />

          {/* Line */}
          <path
            d={linePath}
            fill="none"
            stroke="#003B95"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data points + hover targets */}
          {data.map((d, i) => (
            <g key={i}>
              <circle
                cx={toX(i)}
                cy={toY(d.revenue)}
                r={hovered === i ? 5 : 3.5}
                fill={hovered === i ? '#003B95' : 'white'}
                stroke="#003B95"
                strokeWidth="2"
                style={{ transition: 'r 0.1s' }}
              />
              {/* Hover tooltip */}
              {hovered === i && (
                <g>
                  <rect
                    x={toX(i) - 44}
                    y={toY(d.revenue) - 36}
                    width="88"
                    height="26"
                    rx="6"
                    fill="#003B95"
                  />
                  <text
                    x={toX(i)}
                    y={toY(d.revenue) - 18}
                    textAnchor="middle"
                    fontSize="11"
                    fill="white"
                    fontWeight="600"
                  >
                    {fmt(d.revenue)}
                  </text>
                </g>
              )}
              {/* Invisible hover target */}
              <rect
                x={toX(i) - step / 2}
                y={PAD.top}
                width={step}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
              />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}
