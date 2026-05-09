import { supabase } from "./supabase";
import { CSV_TO_DB, DB_TO_CSV, CSV_HEADERS, METRIC_HEADERS } from "./columnMap";
import type { InbodyRecord, ParsedCsvData } from "./types";

type DbRow = Record<string, number | string | null>;

function recordToRow(record: InbodyRecord): DbRow {
  const row: DbRow = {
    measured_at: record.date,
  };
  for (const csvCol of METRIC_HEADERS) {
    const dbCol = CSV_TO_DB[csvCol];
    if (dbCol) {
      const val = record[csvCol];
      row[dbCol] = typeof val === "number" ? val : null;
    }
  }
  return row;
}

function rowToRecord(row: DbRow): InbodyRecord {
  const record: InbodyRecord = {
    date: String(row.measured_at ?? ""),
  };
  for (const [dbCol, csvCol] of Object.entries(DB_TO_CSV)) {
    if (dbCol === "measured_at") continue;
    const val = row[dbCol];
    record[csvCol] = typeof val === "number" ? val : val != null ? Number(val) : 0;
  }
  return record;
}

export async function fetchAllMeasurements(): Promise<ParsedCsvData | null> {
  const { data, error } = await supabase
    .from("inbody_measurements")
    .select("*")
    .order("measured_at", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) return null;

  const records = (data as DbRow[]).map(rowToRecord);
  return {
    headers: CSV_HEADERS,
    dateColumn: CSV_HEADERS[0],
    metricColumns: METRIC_HEADERS,
    records,
  };
}

export async function upsertMeasurements(records: InbodyRecord[]): Promise<void> {
  const rows = records.map(recordToRow);
  const { error } = await supabase
    .from("inbody_measurements")
    .upsert(rows, { onConflict: "measured_at" });

  if (error) throw new Error(error.message);
}
