import Papa from "papaparse";
import type { ParsedCsvData, InbodyRecord } from "./types";

export function parseCsv(file: File): Promise<ParsedCsvData> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields ?? [];
        if (headers.length < 2) {
          reject(new Error("CSVには少なくとも2列（日付 + 指標）が必要です"));
          return;
        }

        const dateColumn = headers[0];
        const metricColumns = headers.slice(1);

        const records: InbodyRecord[] = (results.data as Record<string, string>[])
          .map((row) => {
            const record: InbodyRecord = { date: row[dateColumn] ?? "" };
            for (const col of metricColumns) {
              const raw = row[col]?.trim() ?? "";
              const num = parseFloat(raw);
              record[col] = isNaN(num) ? raw : num;
            }
            return record;
          })
          .filter((r) => r.date !== "");

        records.sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        resolve({ headers, dateColumn, metricColumns, records });
      },
      error: (err) => reject(new Error(err.message)),
    });
  });
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")}`;
}
