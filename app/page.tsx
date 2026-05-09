"use client";

import { useState, useCallback, useEffect } from "react";
import { CsvUploader } from "@/components/CsvUploader";
import { MetricSelector } from "@/components/MetricSelector";
import { RangeSlider } from "@/components/RangeSlider";
import { DataTable } from "@/components/DataTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { parseCsv } from "@/lib/csvParser";
import { fetchAllMeasurements, upsertMeasurements } from "@/lib/supabaseStorage";
import { METRIC_HEADERS } from "@/lib/columnMap";
import type { ParsedCsvData } from "@/lib/types";
import dynamic from "next/dynamic";

const InbodyChart = dynamic(
  () => import("@/components/InbodyChart").then((m) => ({ default: m.InbodyChart })),
  { ssr: false, loading: () => <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">グラフを読み込み中...</div> }
);

export default function Home() {
  const [csvData, setCsvData] = useState<ParsedCsvData | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    new Set(METRIC_HEADERS.slice(0, 8))
  );
  const [displayCount, setDisplayCount] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  useEffect(() => {
    fetchAllMeasurements()
      .then((data) => {
        if (data) {
          setCsvData(data);
          setDisplayCount(data.records.length);
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setIsLoading(false));
  }, []);

  const handleFile = useCallback(async (file: File) => {
    setIsSaving(true);
    setError(null);
    setSaveStatus(null);
    try {
      const parsed = await parseCsv(file);
      await upsertMeasurements(parsed.records);
      const latest = await fetchAllMeasurements();
      if (latest) {
        setCsvData(latest);
        setDisplayCount(latest.records.length);
      }
      setSaveStatus(`${parsed.records.length} 件を保存しました`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "保存に失敗しました");
    } finally {
      setIsSaving(false);
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

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">測定データを追加</CardTitle>
          </CardHeader>
          <CardContent>
            <CsvUploader
              onParsed={handleFile}
              isLoading={isSaving}
              error={error}
            />
            {saveStatus && (
              <p className="text-sm text-green-600 mt-2">{saveStatus}</p>
            )}
          </CardContent>
        </Card>

        {isLoading && (
          <div className="text-center text-sm text-muted-foreground py-12">
            データを読み込み中...
          </div>
        )}

        {!isLoading && !csvData && (
          <div className="text-center text-sm text-muted-foreground py-12">
            CSVをアップロードして測定データを登録してください
          </div>
        )}

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
                  oldestDate={oldestRecord?.date ?? ""}
                  latestDate={latestRecord?.date ?? ""}
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
