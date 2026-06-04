import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/api-auth";

export async function POST() {
  const guard = await requireApiRole(["admin"]);
  if ("response" in guard) {
    return guard.response;
  }
  return NextResponse.json({
    ok: true,
    message: "请使用 apps/web/scripts/import-items.ts 执行 JSON/CSV 导入。",
  });
}
