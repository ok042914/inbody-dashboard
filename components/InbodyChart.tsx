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
  onDateSelect?: (date: string) => void;
  highlightDate?: string | null;
}

interface TooltipEntry {
  name: string;
  value: number | string;
  color: string;
  payload: Record<string, unknown>;
}

/** "2026-05-09T15:44:00" → ローカル時刻のタイムスタンプ */
function dateStrToTs(dateStr: string): number {
  const tIdx = dateStr.indexOf("T");
  if (tIdx === -1) {
    const [y, mo, d] = dateStr.slice(0, 10).split("-").map(Number);
    return new Date(y, mo - 1, d).getTime();
  }
  const [y, mo, d] = dateStr.slice(0, tIdx).split("-").map(Number);
  const [h, mi, s = 0] = dateStr.slice(tIdx + 1, tIdx + 9).split(":").map(Number);
  return new Date(y, mo - 1, d, h, mi, s).getTime();
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
  return { min: Math.min(...values), max: Math.max(...values) };
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

  const statsMap = Object.fromEntries(
    metrics.map((m) => [m, metricStats(records, m)])
  );

  const chartData = records.map((r) => {
    const row: Record<string, unknown> = {
      date: formatDate(r.date),
      __rawDate: r.date,
      dateTs: dateStrToTs(r.date),
    };
    for (const m of metrics) {
      const v = r[m];
      if (typeof v === "number" && isFinite(v)) {
        row[`${m}__orig`] = v;
        row[m] = isNormalized ? normalize(v, statsMap[m].min, statsMap[m].max) : v;
      } else {
        row[m] = null;
      }
    }
    return row;
  });

  // タイムスタンプ → 表示ラベルの対応表
  const tsLabelMap = new Map<number, string>(
    chartData.map((d) => [d.dateTs as number, d.date as string])
  );
  const tickTs = chartData.map((d) => d.dateTs as number);

  const leftDomain: [number, number] = isNormalized
    ? [0 - marginPct, 100 + marginPct]
    : calcDomain(records, [metrics[0]], marginPct);
  const rightDomain: [number, number] | undefined = twoAxes
    ? calcDomain(records, [metrics[1]], marginPct)
    : undefined;

  function CustomTooltip({
    active,
    payload,
    label,
  }: {
    active?: boolean;
    payload?: TooltipEntry[];
    label?: number;
  }) {
    if (!active || !payload?.length) return null;
    const dateLabel = typeof label === "number" ? (tsLabelMap.get(label) ?? "") : "";
    return (
      <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm max-w-xs">
        <p className="font-semibold mb-1">{dateLabel}</p>
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

  // 選択日付のタイムスタンプ（ReferenceLine用）
  const highlightTs = highlightDate
    ? (chartData.find((d) => d.__rawDate === highlightDate)?.dateTs as number | undefined)
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
            const idx = state?.activeIndex;
            if (typeof idx === "number" && chartData[idx]) {
              onDateSelect(chartData[idx].__rawDate as string);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="dateTs"
            type="number"
            scale="time"
            domain={["dataMin", "dataMax"]}
            ticks={tickTs}
            tickFormatter={(ts: number) => tsLabelMap.get(ts) ?? ""}
            tick={{ fontSize: 11 }}
            tickLine={false}
            interval="preserveStartEnd"
            minTickGap={60}
          />

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

          {highlightTs !== undefined && (
            <ReferenceLine
              x={highlightTs}
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
