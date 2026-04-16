import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    message: "请使用 apps/web/scripts/import-items.ts 执行 JSON/CSV 导入。",
  });
}

