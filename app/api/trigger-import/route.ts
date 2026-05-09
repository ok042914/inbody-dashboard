import { NextResponse } from "next/server";

export async function POST() {
  const triggerUrl = process.env.DRIVE_TRIGGER_URL;

  if (!triggerUrl) {
    return NextResponse.json(
      { error: "DRIVE_TRIGGER_URL が設定されていません" },
      { status: 500 }
    );
  }

  const res = await fetch(triggerUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });

  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
