"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
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
}

interface TooltipPayload {
  name: string;
  value: number | string;
  color: string;
}

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}:{" "}
          <strong>
            {typeof entry.value === "number" ? entry.value.toFixed(1) : entry.value}
          </strong>
        </p>
      ))}
    </div>
  );
}

export function InbodyChart({ records, selectedMetrics, dateColumn }: Props) {
  if (selectedMetrics.size === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
        表示する指標を選択してください
      </div>
    );
  }

  const metrics = Array.from(selectedMetrics);
  const chartData = records.map((r) => ({
    ...r,
    date: formatDate(r[dateColumn] as string),
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart data={chartData} margin={{ top: 8, right: 24, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11 }}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={48} />
        <Tooltip content={<CustomTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        {metrics.map((metric, i) => (
          <Line
            key={metric}
            type="monotone"
            dataKey={(row: Record<string, unknown>) => {
              const v = row[metric];
              return typeof v === "number" ? v : null;
            }}
            name={metric}
            stroke={COLORS[i % COLORS.length]}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
