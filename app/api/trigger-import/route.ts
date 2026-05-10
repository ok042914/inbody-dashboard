import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import Papa from "papaparse";
import { createClient } from "@supabase/supabase-js";
import { CSV_TO_DB } from "@/lib/columnMap";

const FOLDER_ID =
  process.env.GOOGLE_DRIVE_FOLDER_ID ?? "1xFzrlkKIlEnLj7gC-4TVJlrgIGtkbWjw";

const NORMALIZED_CSV_TO_DB: Record<string, string> = {};
for (const [csv, db] of Object.entries(CSV_TO_DB)) {
  NORMALIZED_CSV_TO_DB[normalize(csv)] = db;
}

function normalize(s: string): string {
  return s.normalize("NFKC").trim();
}

function normalizeDate(dateStr: string): string {
  return dateStr.replace(/\//g, "-").replace(" ", "T");
}

function checkAuth(req: NextRequest): boolean {
  const secret = process.env.TRIGGER_SECRET;
  if (!secret) return true;
  const auth = req.headers.get("authorization");
  return auth === `Bearer ${secret}`;
}

function makeSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

async function processCsvText(
  csvText: string,
  supabase: ReturnType<typeof makeSupabase>
): Promise<{ inserted: number; error_count: number }> {
  const parsed = Papa.parse<Record<string, string>>(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const headers = parsed.meta.fields ?? [];
  if (headers.length < 2) return { inserted: 0, error_count: 0 };

  const dateCol = headers[0];

  const rows = parsed.data
    .map((row) => {
      const dateRaw = row[dateCol]?.trim() ?? "";
      if (!dateRaw) return null;
      const dbRow: Record<string, unknown> = {
        measured_at: normalizeDate(dateRaw),
      };
      for (const csvCol of headers.slice(1)) {
        const dbCol = NORMALIZED_CSV_TO_DB[normalize(csvCol)];
        if (!dbCol) continue;
        const raw = row[csvCol]?.trim().replace(/,/g, "") ?? "";
        const num = parseFloat(raw);
        dbRow[dbCol] = isNaN(num) ? null : num;
      }
      return dbRow;
    })
    .filter((r): r is Record<string, unknown> => r !== null);

  if (rows.length === 0) return { inserted: 0, error_count: 0 };

  const { error } = await supabase
    .from("inbody_measurements")
    .upsert(rows, { onConflict: "measured_at" });

  if (error) return { inserted: 0, error_count: 1 };
  return { inserted: rows.length, error_count: 0 };
}

async function importFromDrive(): Promise<NextResponse> {
  const credJson = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!credJson) {
    return NextResponse.json(
      { error: "GOOGLE_SERVICE_ACCOUNT_JSON が設定されていません" },
      { status: 500 }
    );
  }

  let auth: InstanceType<typeof google.auth.GoogleAuth>;
  try {
    const credentials = JSON.parse(credJson);
    auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive.readonly"],
    });
  } catch {
    return NextResponse.json(
      { error: "サービスアカウント認証情報の解析に失敗しました" },
      { status: 500 }
    );
  }

  const drive = google.drive({ version: "v3", auth });
  const listRes = await drive.files.list({
    q: `'${FOLDER_ID}' in parents and mimeType = 'text/csv' and trashed = false`,
    fields: "files(id, name)",
  });

  const files = listRes.data.files ?? [];
  if (files.length === 0) {
    return NextResponse.json({ file_count: 0, inserted: 0, error_count: 0 });
  }

  const supabase = makeSupabase();
  let inserted = 0;
  let error_count = 0;

  for (const file of files) {
    try {
      const contentRes = await drive.files.get(
        { fileId: file.id!, alt: "media" },
        { responseType: "text" }
      );
      const result = await processCsvText(contentRes.data as string, supabase);
      inserted += result.inserted;
      error_count += result.error_count;
    } catch {
      error_count++;
    }
  }

  return NextResponse.json({ file_count: files.length, inserted, error_count });
}

// Vercel Cron Job から GET で呼ばれる
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }
  return importFromDrive();
}

// Apps Script または手動 POST で呼ばれる
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { csv_text?: string; filename?: string } | null = null;
  try {
    body = await req.json();
  } catch {
    // body なし → Drive から読み込む
  }

  if (body?.csv_text) {
    const supabase = makeSupabase();
    const result = await processCsvText(body.csv_text, supabase);
    return NextResponse.json({ file_count: 1, ...result });
  }

  return importFromDrive();
}
