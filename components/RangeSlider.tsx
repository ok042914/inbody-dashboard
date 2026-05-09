"use client";

import { Slider } from "@/components/ui/slider";
import { formatDate } from "@/lib/csvParser";

interface Props {
  total: number;
  value: number;
  onChange: (n: number) => void;
  oldestDate: string;
  latestDate: string;
}

export function RangeSlider({ total, value, onChange, oldestDate, latestDate }: Props) {
  const min = Math.min(3, total);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">表示件数</span>
        <span className="text-sm text-muted-foreground">
          直近 <strong>{value}</strong> 回分
          {oldestDate && latestDate && (
            <span> （{formatDate(oldestDate)} 〜 {formatDate(latestDate)}）</span>
          )}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-muted-foreground whitespace-nowrap">直近{min}回</span>
        <Slider
          min={min}
          max={total}
          step={1}
          value={[value]}
          onValueChange={(v) => {
            const n = Array.isArray(v) ? v[0] : v;
            if (typeof n === "number") onChange(n);
          }}
          className="flex-1"
        />
        <span className="text-xs text-muted-foreground whitespace-nowrap">全{total}回</span>
      </div>
    </div>
  );
}
