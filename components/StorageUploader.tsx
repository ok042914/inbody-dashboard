"use client";

import { useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  onImported: () => void;
}

export function StorageUploader({ onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      alert("CSVファイルを選択してください");
      return;
    }

    setIsLoading(true);
    setStatus(null);
    setError(null);

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const path = `${timestamp}_${file.name}`;

      const { error: uploadError } = await supabase.storage
        .from("body-composition-import")
        .upload(path, file, { contentType: "text/csv" });

      if (uploadError) throw new Error(`アップロード失敗: ${uploadError.message}`);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/process-csv-upload`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": supabaseAnonKey!,
            "Authorization": `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({ bucket: "body-composition-import", path }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(`処理失敗: ${result.error ?? response.statusText}`);
      }

      setStatus(
        `完了: ${result.inserted} 件追加、${result.skipped} 件スキップ` +
        (result.error_count > 0 ? `、${result.error_count} 件エラー` : "")
      );
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Storageへアップロード（ファイルを保存しながらデータを取り込みます）
      </p>
      <Card
        className={`border-2 border-dashed cursor-pointer transition-colors ${
          dragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFile(e.dataTransfer.files[0]);
        }}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <svg className="w-8 h-8 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">アップロード・処理中...</p>
          ) : (
            <>
              <p className="font-medium text-sm">CSVをドロップ、またはクリックして選択</p>
              <p className="text-xs text-muted-foreground">ファイルはStorageに保存され、Edge Functionで自動処理されます</p>
            </>
          )}
        </CardContent>
        <input
          ref={inputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </Card>
      {status && <p className="text-sm text-green-600">{status}</p>}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
