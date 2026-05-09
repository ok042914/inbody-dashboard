"use client";

import { useState } from "react";
import type { InbodyRecord } from "@/lib/types";
import { formatDate } from "@/lib/csvParser";

interface Props {
  records: InbodyRecord[];
  headers: string[];
  dateColumn: string;
}

export function DataTable({ records, headers, dateColumn }: Props) {
  const [sortAsc, setSortAsc] = useState(false); // false = 降順（新しい順）

  const displayed = sortAsc ? [...records] : [...records].reverse();

  function cellValue(row: InbodyRecord, h: string): string {
    if (h === dateColumn) return formatDate(row.date);
    const v = row[h];
    if (v == null) return "—";
    if (typeof v === "number") return v.toFixed(1);
    return String(v);
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <button
          onClick={() => setSortAsc((prev) => !prev)}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded border border-border bg-background hover:bg-muted transition-colors"
        >
          {sortAsc ? "↑ 昇順（古い順）" : "↓ 降順（新しい順）"}
        </button>
      </div>
      <div className="overflow-auto max-h-72 rounded-md border">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr>
              {headers.map((h) => (
                <th
                  key={h}
                  className="sticky top-0 z-10 bg-muted/90 backdrop-blur-sm px-2 py-2 text-left text-xs font-medium whitespace-nowrap border-b border-border"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.map((row, i) => (
              <tr
                key={i}
                className="border-b border-border last:border-0 hover:bg-muted/40 transition-colors"
              >
                {headers.map((h) => (
                  <td key={h} className="px-2 py-1.5 whitespace-nowrap">
                    {cellValue(row, h)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
