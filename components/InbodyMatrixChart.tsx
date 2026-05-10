"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ReferenceArea,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import type { InbodyRecord } from "@/lib/types";
import { formatDate } from "@/lib/csvParser";

const BMI_COL = "BMI(kg/m2)";
const FAT_COL = "体脂肪率(%)";

// ─── ゾーン定義 ────────────────────────────────────────────────────────────
// X軸 (体脂肪率%): ドメイン [5, 25]  境界線: 10 / 15 / 20
// Y軸 (BMI)      : ドメイン [15, 30]  境界線: 18.5 / 22 / 25
//
// 11ゾーン（非均一グリッド）:
//   アスリート    : x=[5,15)  y=[25,30]   (BF<15, BMI≥25)
//   筋肉型        : x=[5,15)  y=[22,25)   (BF<15, 22≤BMI<25)
//   筋肉型スリム  : x=[5,10)  y=[18.5,22) (BF<10, 18.5≤BMI<22)
//   スリム        : x=[10,15) y=[18.5,22) (10≤BF<15, 18.5≤BMI<22)
//   痩せ          : x=[5,10)  y=[15,18.5) (BF<10, BMI<18.5)
//   やや痩せ      : x=[10,20) y=[15,18.5) (10≤BF<20, BMI<18.5)
//   適正          : x=[15,20) y=[18.5,25) (15≤BF<20, 18.5≤BMI<25) ←縦長
//   やや肥満      : x=[15,20) y=[25,30]   (15≤BF<20, BMI≥25)
//   肥満          : x=[20,25] y=[25,30]   (BF≥20, BMI≥25)
//   やや肥満      : x=[20,25] y=[22,25)   (BF≥20, 22≤BMI<25)
//   隠れ肥満      : x=[20,25] y=[15,22)   (BF≥20, BMI<22) ←縦長
const ZONES = [
  // ── 左ブロック (BF < 15) ──────────────────────────────────────
  { x1: 5,  x2: 15, y1: 25,   y2: 30,   label: "アスリート",   text: "#374151" },
  { x1: 5,  x2: 15, y1: 22,   y2: 25,   label: "筋肉型",       text: "#374151" },
  { x1: 5,  x2: 10, y1: 18.5, y2: 22,   label: "筋肉型スリム", text: "#374151" },
  { x1: 10, x2: 15, y1: 18.5, y2: 22,   label: "スリム",       text: "#374151" },
  { x1: 5,  x2: 10, y1: 15,   y2: 18.5, label: "痩せ",         text: "#374151" },
  // ── 中ブロック下段 / 下段広域 ────────────────────────────────
  { x1: 10, x2: 20, y1: 15,   y2: 18.5, label: "やや痩せ",     text: "#374151" },
  // ── 中ブロック (BF 15-20) ────────────────────────────────────
  { x1: 15, x2: 20, y1: 18.5, y2: 25,   label: "適正",         text: "#374151" },
  { x1: 15, x2: 20, y1: 25,   y2: 30,   label: "やや肥満",     text: "#374151" },
  // ── 右ブロック (BF ≥ 20) ─────────────────────────────────────
  { x1: 20, x2: 25, y1: 25,   y2: 30,   label: "肥満",         text: "#374151" },
  { x1: 20, x2: 25, y1: 22,   y2: 25,   label: "やや肥満",     text: "#374151" },
  { x1: 20, x2: 25, y1: 15,   y2: 22,   label: "隠れ肥満",     text: "#374151" },
];

type PlotPoint = { x: number; y: number; date: string };

type TooltipEntry = { payload: PlotPoint };
function CustomTooltip({ active, payload }: { active?: boolean; payload?: TooltipEntry[] }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-gray-200 rounded px-3 py-2 text-xs shadow-md">
      <p className="font-semibold mb-1">{formatDate(d.date)}</p>
      <p>BMI: <span className="font-medium">{d.y.toFixed(1)}</span></p>
      <p>体脂肪率: <span className="font-medium">{d.x.toFixed(1)}%</span></p>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderDot = (props: any) => {
  const { cx, cy } = props as { cx: number; cy: number };
  return (
    <circle
      key={`d-${cx}-${cy}`}
      cx={cx} cy={cy} r={5}
      fill="#1e293b" fillOpacity={0.5}
      stroke="white" strokeWidth={1}
    />
  );
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const renderStar = (props: any) => {
  const { cx, cy } = props as { cx: number; cy: number };
  return (
    <text
      key={`s-${cx}-${cy}`}
      x={cx} y={cy}
      textAnchor="middle" dominantBaseline="central"
      fontSize={26} fill="#f97316"
      stroke="white" strokeWidth={0.8}
      style={{ paintOrder: "stroke" } as React.CSSProperties}
    >
      ★
    </text>
  );
};

interface Props {
  records: InbodyRecord[];
  /** ★を置く日付。未指定時は最新レコード。折れ線グラフのスライダーと連動 */
  highlightDate?: string;
}

export function InbodyMatrixChart({ records, highlightDate }: Props) {
  const plotData: PlotPoint[] = records
    .filter((r) => r[BMI_COL] != null && r[FAT_COL] != null)
    .map((r) => ({
      x: r[FAT_COL] as number,
      y: r[BMI_COL] as number,
      date: r.date,
    }));

  if (plotData.length === 0) return null;

  const starIdx = highlightDate
    ? plotData.findIndex((p) => p.date === highlightDate)
    : -1;
  const effectiveStarIdx = starIdx >= 0 ? starIdx : plotData.length - 1;

  const starPoint = [plotData[effectiveStarIdx]];
  const otherPoints = plotData.filter((_, i) => i !== effectiveStarIdx);

  return (
    <ResponsiveContainer width="100%" height={440}>
      <ScatterChart margin={{ top: 10, right: 30, bottom: 40, left: 20 }}>
        {/* ゾーン境界線（塗りなし、枠線のみ） */}
        {ZONES.map((z, i) => (
          <ReferenceArea
            key={i}
            x1={z.x1} x2={z.x2}
            y1={z.y1} y2={z.y2}
            fill="transparent"
            stroke="#94a3b8" strokeOpacity={0.6}
            label={{ value: z.label, position: "center", fill: z.text, fontSize: 11 }}
          />
        ))}
        <XAxis
          type="number" dataKey="x"
          domain={[5, 25]} name="体脂肪率" unit="%"
          ticks={[5, 10, 15, 20, 25]}
          tickLine={false}
          label={{ value: "体脂肪率 (%)", position: "insideBottom", offset: -20 }}
        />
        <YAxis
          type="number" dataKey="y"
          domain={[15, 30]} name="BMI"
          ticks={[15, 18.5, 22, 25, 30]}
          tickLine={false}
          label={{ value: "BMI", angle: -90, position: "insideLeft", offset: 15 }}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: "3 3" }} />
        {otherPoints.length > 0 && (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Scatter name="履歴" data={otherPoints} shape={renderDot as any} />
        )}
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <Scatter name="選択中" data={starPoint} shape={renderStar as any} />
      </ScatterChart>
    </ResponsiveContainer>
  );
}
