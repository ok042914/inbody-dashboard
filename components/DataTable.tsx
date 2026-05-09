"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { InbodyRecord } from "@/lib/types";
import { formatDate } from "@/lib/csvParser";

interface Props {
  records: InbodyRecord[];
  headers: string[];
  dateColumn: string;
}

export function DataTable({ records, headers, dateColumn }: Props) {
  const displayed = [...records].reverse();

  return (
    <div className="overflow-auto max-h-72 rounded-md border">
      <Table>
        <TableHeader className="sticky top-0 bg-muted/80 backdrop-blur-sm">
          <TableRow>
            {headers.map((h) => (
              <TableHead key={h} className="whitespace-nowrap text-xs">
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {displayed.map((row, i) => (
            <TableRow key={i}>
              {headers.map((h) => (
                <TableCell key={h} className="text-sm whitespace-nowrap">
                  {h === dateColumn
                    ? formatDate(row.date)
                    : typeof row[h] === "number"
                    ? (row[h] as number).toFixed(1)
                    : String(row[h])}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
