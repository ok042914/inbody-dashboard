"use client";

import { Slider } from "@/components/ui/slider";
import { formatDate } from "@/lib/csvParser";

interface Props {
  total: number;
  /** [startIndex, endIndex] — 0-based, inclusive */
  value: [number, number];
  onChange: (range: [number, number]) => void;
  startDate: string;
  endDate: string;
}

export function RangeSlider({ total, value, onChange, startDate, endDate }: Props) {
  const count = value[1] - value[0] + 1;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">表示範囲</span>
        <span className="text-sm text-muted-foreground">
          <strong>{count}</strong> 回分
          {startDate && endDate && (
            <span> （{formatDate(startDate)} 〜 {formatDate(endDate)}）</span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">最古</span>
        <Slider
          min={0}
          max={total - 1}
          step={1}
          value={[value[0], value[1]]}
          onValueChange={(v) => {
            const arr = Array.isArray(v) ? v : [v, v];
            const s = typeof arr[0] === "number" ? arr[0] : value[0];
            const e = typeof arr[1] === "number" ? arr[1] : value[1];
            if (s <= e) onChange([s, e]);
          }}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">最新</span>
      </div>
    </div>
  );
}
