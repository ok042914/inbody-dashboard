"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import type { InbodyRecord } from "@/lib/types";
import { formatDate } from "@/lib/csvParser";

const COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706", "#9333ea",
  "#0891b2", "#db2777", "#65a30d", "#ea580c", "#7c3aed",
  "#0d9488", "#be185d", "#b45309", "#1d4ed8", "#15803d",
];

interface Props {
  records: InbodyRecord[];
  selectedMetrics: Set<string>;
  dateColumn: string;
  marginPct?: number;
  /** クリックされた日付を生の date 文字列で通知 */
  onDateSelect?: (date: string) => void;
  /** 選択中の生 date 文字列（縦線を描画） */
  highlightDate?: string | null;
}

interface TooltipEntry {
  name: string;
  value: number | string;
  color: string;
  payload: Record<string, unknown>;
}

function calcDomain(
  records: InbodyRecord[],
  metrics: string[],
  marginPct = 10
): [number, number] {
  const values = records
    .flatMap((r) => metrics.map((m) => r[m]))
    .filter((v): v is number => typeof v === "number" && isFinite(v));
  if (values.length === 0) return [0, 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || Math.abs(min) || 1;
  const pad = range * (marginPct / 100);
  return [
    parseFloat((min - pad).toFixed(3)),
    parseFloat((max + pad).toFixed(3)),
  ];
}

function metricStats(records: InbodyRecord[], metric: string) {
  const values = records
    .map((r) => r[metric])
    .filter((v): v is number => typeof v === "number" && isFinite(v));
  if (values.length === 0) return { min: 0, max: 1 };
  const min = Math.min(...values);
  const max = Math.max(...values);
  return { min, max };
}

function normalize(v: number, min: number, max: number): number {
  return max === min ? 50 : ((v - min) / (max - min)) * 100;
}

export function InbodyChart({ records, selectedMetrics, marginPct = 10, onDateSelect, highlightDate }: Props) {
  if (selectedMetrics.size === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        表示する指標を選択してください
      </div>
    );
  }

  const metrics = Array.from(selectedMetrics);
  const twoAxes = metrics.length === 2;
  const isNormalized = metrics.length >= 3;

  // 各指標の実値min/max
  const statsMap = Object.fromEntries(
    metrics.map((m) => [m, metricStats(records, m)])
  );

  // chartDataには実値(__orig)・生date(__rawDate)・描画値を持たせる
  const chartData = records.map((r) => {
    const row: Record<string, unknown> = { date: formatDate(r.date), __rawDate: r.date };
    for (const m of metrics) {
      const v = r[m];
      if (typeof v === "number" && isFinite(v)) {
        row[`${m}__orig`] = v;
        row[m] = isNormalized
          ? normalize(v, statsMap[m].min, statsMap[m].max)
          : v;
      } else {
        row[m] = null;
      }
    }
    return row;
  });

  // Y軸ドメイン（正規化モードはmarginPctを%として適用）
  const leftDomain: [number, number] = isNormalized
    ? [0 - marginPct, 100 + marginPct]
    : calcDomain(records, [metrics[0]], marginPct);
  const rightDomain: [number, number] | undefined = twoAxes
    ? calcDomain(records, [metrics[1]], marginPct)
    : undefined;

  // ツールチップ：常に実値を表示
  function CustomTooltip({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: string;
  }) {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm max-w-xs">
        <p className="font-semibold mb-1">{label}</p>
        {payload.map((entry) => {
          const orig = entry.payload[`${entry.name}__orig`];
          const displayVal =
            orig != null
              ? Number(orig).toFixed(2)
              : typeof entry.value === "number"
              ? entry.value.toFixed(2)
              : String(entry.value);
          return (
            <p key={entry.name} style={{ color: entry.color }}>
              {entry.name}: <strong>{displayVal}</strong>
            </p>
          );
        })}
      </div>
    );
  }

  // 選択中の生dateをフォーマット済みlabelに変換（ReferenceLine用）
  const highlightLabel = highlightDate
    ? (chartData.find((d) => d.__rawDate === highlightDate)?.date as string | undefined)
    : undefined;

  return (
    <div>
      {isNormalized && (
        <p className="text-xs text-muted-foreground mb-2 text-right">
          3項目以上のため、各指標を最小0% ・最大100%に正規化して表示しています
        </p>
      )}
      <ResponsiveContainer width="100%" height={400}>
        <LineChart
          data={chartData}
          margin={{ top: 8, right: twoAxes ? 64 : 24, left: 0, bottom: 8 }}
          style={{ cursor: onDateSelect ? "pointer" : undefined }}
          onClick={(state) => {
            if (!onDateSelect) return;
            const label = state?.activeLabel as string | undefined;
            if (label) {
              const found = chartData.find((d) => d.date === label);
              if (found) { onDateSelect(found.__rawDate as string); return; }
            }
            const idx = state?.activeIndex;
            if (typeof idx === "number" && chartData[idx]) {
              onDateSelect(chartData[idx].__rawDate as string);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11 }}
            tickLine={false}
            interval="preserveStartEnd"
          />

          {/* 左軸 */}
          <YAxis
            yAxisId="left"
            domain={leftDomain}
            tick={{ fontSize: 11, fill: twoAxes ? COLORS[0] : "#6b7280" }}
            tickLine={false}
            axisLine={false}
            width={isNormalized ? 40 : 56}
            tickCount={5}
            tickFormatter={isNormalized ? (v: number) => `${Math.round(v)}%` : undefined}
          />

          {/* 右軸（2項目時のみ） */}
          {twoAxes && (
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={rightDomain}
              tick={{ fontSize: 11, fill: COLORS[1] }}
              tickLine={false}
              axisLine={false}
              width={56}
              tickCount={5}
            />
          )}

          <Tooltip content={<CustomTooltip />} />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />

          {/* 選択中の日付を示す縦ライン */}
          {highlightLabel && (
            <ReferenceLine
              x={highlightLabel}
              yAxisId="left"
              stroke="#f97316"
              strokeWidth={2}
              strokeDasharray="5 3"
            />
          )}

          {metrics.map((metric, i) => (
            <Line
              key={metric}
              type="monotone"
              dataKey={metric}
              name={metric}
              yAxisId={twoAxes && i === 1 ? "right" : "left"}
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
              connectNulls
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
