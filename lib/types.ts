export interface InbodyRecord {
  date: string;
  [key: string]: string | number;
}

export interface ParsedCsvData {
  headers: string[];
  dateColumn: string;
  metricColumns: string[];
  records: InbodyRecord[];
}
