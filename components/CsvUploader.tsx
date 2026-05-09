"use client";

import { useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  onParsed: (file: File) => void;
  isLoading: boolean;
  error: string | null;
}

export function CsvUploader({ onParsed, isLoading, error }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      alert("CSVファイルを選択してください");
      return;
    }
    onParsed(file);
  }

  return (
    <Card
      className={`border-2 border-dashed cursor-pointer transition-colors ${
        dragging ? "border-primary bg-primary/5" : "border-muted-foreground/30"
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
      <CardContent className="flex flex-col items-center justify-center py-10 gap-2 text-center">
        <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M12 16v-8m0 0-3 3m3-3 3 3M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1" />
        </svg>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">読み込み中...</p>
        ) : (
          <>
            <p className="font-medium">CSVファイルをドロップ、またはクリックして選択</p>
            <p className="text-sm text-muted-foreground">InbodyのCSVファイル（1列目：日付、以降：測定値）</p>
          </>
        )}
        {error && <p className="text-sm text-destructive mt-1">{error}</p>}
      </CardContent>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
    </Card>
  );
}
