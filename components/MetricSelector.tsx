"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";

interface Props {
  metrics: string[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

export function MetricSelector({ metrics, selected, onChange }: Props) {
  function toggle(metric: string) {
    const next = new Set(selected);
    if (next.has(metric)) {
      next.delete(metric);
    } else {
      next.add(metric);
    }
    onChange(next);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium">表示する指標</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(new Set(metrics))}
        >
          全選択
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onChange(new Set())}
        >
          全解除
        </Button>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        {metrics.map((metric) => (
          <label
            key={metric}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <Checkbox
              checked={selected.has(metric)}
              onCheckedChange={() => toggle(metric)}
            />
            <span className="text-sm">{metric}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
