"use client";

import { useState, useCallback } from "react";
import { CsvUploader } from "@/components/CsvUploader";
import { MetricSelector } from "@/components/MetricSelector";
import { RangeSlider } from "@/components/RangeSlider";
import { InbodyChart } from "@/components/InbodyChart";
import { DataTable } from "@/components/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseCsv } from "@/lib/csvParser";
import type { ParsedCsvData } from "@/lib/types";

export default function Home() {
  const [csvData, setCsvData] = useState<ParsedCsvData | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(new Set());
  const [displayCount, setDisplayCount] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await parseCsv(file);
      setCsvData(data);
      setSelectedMetrics(new Set(data.metricColumns));
      setDisplayCount(data.records.length);
    } catch (e) {
      setError(e instanceof Error ? e.message : "読み込みに失敗しました");
    } finally {
      setIsLoading(false);
    }
  }, []);

  const visibleRecords = csvData ? csvData.records.slice(-displayCount) : [];
  const oldestRecord = visibleRecords[0];
  const latestRecord = visibleRecords[visibleRecords.length - 1];

  return (
    <main className="min-h-screen bg-muted/30 p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inbody データダッシュボード</h1>
          <p className="text-sm text-muted-foreground mt-1">体組成計の測定データを可視化します</p>
        </div>

        <CsvUploader onParsed={handleFile} isLoading={isLoading} error={error} />

        {csvData && (
          <>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">表示設定</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <MetricSelector
                  metrics={csvData.metricColumns}
                  selected={selectedMetrics}
                  onChange={setSelectedMetrics}
                />
                <RangeSlider
                  total={csvData.records.length}
                  value={displayCount}
                  onChange={setDisplayCount}
                  oldestDate={(oldestRecord?.[csvData.dateColumn] as string) ?? ""}
                  latestDate={(latestRecord?.[csvData.dateColumn] as string) ?? ""}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">折れ線グラフ</CardTitle>
              </CardHeader>
              <CardContent>
                <InbodyChart
                  records={visibleRecords}
                  selectedMetrics={selectedMetrics}
                  dateColumn={csvData.dateColumn}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  測定データ一覧（直近 {displayCount} 件）
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DataTable
                  records={visibleRecords}
                  headers={csvData.headers}
                  dateColumn={csvData.dateColumn}
                />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}
