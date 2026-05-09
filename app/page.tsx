"use client";

import { useState, useCallback, useEffect } from "react";
import { CsvUploader } from "@/components/CsvUploader";
import { StorageUploader } from "@/components/StorageUploader";
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
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] flex items-center justify-center text-muted-foreground text-sm">
        グラフを読み込み中...
      </div>
    ),
  }
);

export default function Home() {
  const [csvData, setCsvData] = useState<ParsedCsvData | null>(null);
  const [selectedMetrics, setSelectedMetrics] = useState<Set<string>>(
    new Set(METRIC_HEADERS.slice(0, 2))
  );
  const [displayCount, setDisplayCount] = useState<number>(3);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [graphMargin, setGraphMargin] = useState<0 | 10 | 20>(10);

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

  const handleStorageImport = useCallback(async () => {
    try {
      const latest = await fetchAllMeasurements();
      if (latest) {
        setCsvData(latest);
        setDisplayCount(latest.records.length);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "データ再取得に失敗しました");
    }
  }, []);

  const [isDriveChecking, setIsDriveChecking] = useState(false);
  const [driveStatus, setDriveStatus] = useState<string | null>(null);

  const handleDriveCheck = useCallback(async () => {
    setIsDriveChecking(true);
    setDriveStatus(null);
    try {
      const res = await fetch("/api/trigger-import", { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error ?? "エラーが発生しました");

      if (result.file_count === 0) {
        setDriveStatus("新しいファイルはありませんでした");
      } else {
        setDriveStatus(
          result.file_count + " 件処理: 追加=" + result.inserted +
          ", スキップ=" + result.skipped +
          (result.error_count > 0 ? ", エラー=" + result.error_count : "")
        );
        const latest = await fetchAllMeasurements();
        if (latest) {
          setCsvData(latest);
          setDisplayCount(latest.records.length);
        }
      }
    } catch (e) {
      setDriveStatus(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setIsDriveChecking(false);
    }
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
          <div className="flex items-baseline gap-2">
            <h1 className="text-2xl font-bold tracking-tight">Inbody データダッシュボード</h1>
            <span className="text-xs text-muted-foreground">v{process.env.NEXT_PUBLIC_APP_VERSION}</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">体組成計の測定データを可視化します</p>
        </div>

        {isLoading && (
          <div className="text-center text-sm text-muted-foreground py-12">
            データを読み込み中...
          </div>
        )}

        {/* 1. グラフ */}
        {csvData && (
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base">折れ線グラフ</CardTitle>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-muted-foreground mr-1">上下余白</span>
                {([0, 10, 20] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => setGraphMargin(m)}
                    className={`px-2 py-1 rounded border transition-colors ${
                      graphMargin === m
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    {m}%
                  </button>
                ))}
              </div>
            </CardHeader>
            <CardContent>
              <InbodyChart
                records={visibleRecords}
                selectedMetrics={selectedMetrics}
                dateColumn={csvData.dateColumn}
                marginPct={graphMargin}
              />
            </CardContent>
          </Card>
        )}

        {/* 2. 表示設定（指標選択・スライダー） */}
        {csvData && (
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
        )}

        {/* 3. データテーブル */}
        {csvData && (
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
        )}

        {!isLoading && !csvData && (
          <div className="text-center text-sm text-muted-foreground py-12">
            CSVをアップロードして測定データを登録してください
          </div>
        )}

        {/* 4. CSVアップロード */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">測定データを追加</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="text-sm text-muted-foreground mb-2">ドラッグ&amp;ドロップで直接取り込み</p>
              <CsvUploader
                onParsed={handleFile}
                isLoading={isSaving}
                error={error}
              />
              {saveStatus && (
                <p className="text-sm text-green-600 mt-2">{saveStatus}</p>
              )}
            </div>
            <div className="border-t pt-6">
              <StorageUploader onImported={handleStorageImport} />
            </div>
            <div className="border-t pt-6">
              <p className="text-sm text-muted-foreground mb-2">
                Google Drive の「InBody Import」フォルダを確認してDBに取り込みます
              </p>
              <button
                onClick={handleDriveCheck}
                disabled={isDriveChecking}
                className="px-4 py-2 rounded border border-border bg-background text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
              >
                {isDriveChecking ? "確認中..." : "Drive フォルダを確認"}
              </button>
              {driveStatus && (
                <p className="text-sm text-muted-foreground mt-2">{driveStatus}</p>
              )}
            </div>
          </CardContent>
        </Card>

      </div>
    </main>
  );
}
