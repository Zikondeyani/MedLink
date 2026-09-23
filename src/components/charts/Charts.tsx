import { useId } from "react";
import { mwkCompact } from "../../lib/format";

export interface ChartPoint {
  label: string;
  value: number;
}

function buildPath(points: ChartPoint[], w: number, h: number, pad: number, max: number): string {
  const step = (w - pad * 2) / (Math.max(points.length - 1, 1));
  return points
    .map((p, i) => {
      const x = pad + i * step;
      const y = h - pad - (p.value / max) * (h - pad * 2);
      return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(" ");
}

export function LineChart({
  data,
  height = 220,
  color = "#FFB74D",
  format = "compact",
}: {
  data: ChartPoint[];
  height?: number;
  color?: string;
  format?: "compact" | "plain";
}) {
  const gradId = useId();
  const w = 600;
  const h = height;
  const pad = 34;
  const max = Math.max(...data.map((d) => d.value)) * 1.15;
  const line = buildPath(data, w, h, pad, max);
  const area = `${line} L ${w - pad} ${h - pad} L ${pad} ${h - pad} Z`;

  const fmt = (v: number) => (format === "plain" ? String(v) : mwkCompact(v));

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Sales line chart">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.28" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad + t * (h - pad * 2);
          return (
            <g key={t}>
              <line x1={pad} x2={w - pad} y1={y} y2={y} stroke="#E4E6F2" strokeDasharray="3 5" />
            </g>
          );
        })}
        <path d={area} fill={`url(#${gradId})`} />
        <path d={line} fill="none" stroke={color} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        {data.map((p, i) => {
          const step = (w - pad * 2) / (Math.max(data.length - 1, 1));
          const x = pad + i * step;
          const y = h - pad - (p.value / max) * (h - pad * 2);
          return <circle key={i} cx={x} cy={y} r="3.4" fill="#fff" stroke={color} strokeWidth="2.4" />;
        })}
        {data.map((p, i) => {
          const step = (w - pad * 2) / (Math.max(data.length - 1, 1));
          const x = pad + i * step;
          return (
            <text key={i} x={x} y={h - 10} textAnchor="middle" fontSize="11" fill="#98A2B8">
              {p.label}
            </text>
          );
        })}
        {[...data].reverse().map((p, i) => {
          if (i === 0) return null;
          const y = h - pad - (p.value / max) * (h - pad * 2);
          return (
            <text key={i} x={pad - 8} y={y + 4} textAnchor="end" fontSize="10" fill="#98A2B8">
              {fmt(p.value)}
            </text>
          );
        })}
      </svg>
    </div>
  );
}

export function BarChart({
  data,
  height = 220,
  color = "#0B1120",
  format = "compact",
}: {
  data: ChartPoint[];
  height?: number;
  color?: string;
  format?: "compact" | "plain";
}) {
  const w = 600;
  const h = height;
  const pad = 30;
  const max = Math.max(...data.map((d) => d.value)) * 1.15;
  const step = (w - pad * 2) / data.length;
  const barW = Math.min(38, step * 0.55);
  const fmt = (v: number) => (format === "plain" ? String(v) : mwkCompact(v));

  return (
    <div className="chart">
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Bar chart">
        {[0, 0.25, 0.5, 0.75, 1].map((t) => {
          const y = pad + t * (h - pad * 2);
          return (
            <line key={t} x1={pad} x2={w - pad} y1={y} y2={y} stroke="#E4E6F2" strokeDasharray="3 5" />
          );
        })}
        {data.map((d, i) => {
          const x = pad + i * step + (step - barW) / 2;
          const barH = (d.value / max) * (h - pad * 2);
          const y = h - pad - barH;
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={6} fill={color} opacity={0.9}>
                <title>{`${d.label}: ${fmt(d.value)}`}</title>
              </rect>
              <text x={pad + i * step + step / 2} y={h - 10} textAnchor="middle" fontSize="11" fill="#98A2B8">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function DonutChart({
  data,
  size = 180,
  colors = ["#FFB74D", "#F59E0B", "#FB923C", "#C0B9A8"],
}: {
  data: { name: string; value: number }[];
  size?: number;
  colors?: string[];
}) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const r = 42;
  const c = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="donut">
      <svg width={size} height={size} viewBox="0 0 120 120" role="img" aria-label="Donut chart">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#EDEFF8" strokeWidth="17" />
        {data.map((d, i) => {
          const frac = d.value / total;
          const dash = frac * c;
          const el = (
            <circle
              key={d.name}
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={colors[i % colors.length]}
              strokeWidth="17"
              strokeDasharray={`${dash} ${c - dash}`}
              strokeDashoffset={-offset}
              strokeLinecap="butt"
              transform="rotate(-90 60 60)"
            >
              <title>{`${d.name}: ${d.value}%`}</title>
            </circle>
          );
          offset += dash;
          return el;
        })}
        <text x="60" y="56" textAnchor="middle" fontSize="15" fontWeight="700" fill="#0B1220">
          {total}%
        </text>
        <text x="60" y="70" textAnchor="middle" fontSize="9" fill="#667085">
          of sales
        </text>
      </svg>
      <div className="donut-legend">
        {data.map((d, i) => (
          <span key={d.name} className="donut-legend-item">
            <i style={{ background: colors[i % colors.length] }} />
            {d.name} <b>{d.value}%</b>
          </span>
        ))}
      </div>
    </div>
  );
}