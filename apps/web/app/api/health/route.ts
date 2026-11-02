import { NextResponse } from "next/server";

// For uptime checks and for seeing which commit is live.
export function GET() {
  return NextResponse.json(
    { ok: true, commit: process.env.VERCEL_GIT_COMMIT_SHA ?? null },
    { headers: { "cache-control": "no-store" } },
  );
}
