import { NextResponse } from "next/server";

// 统一 API 响应包装。
//
// 目标:所有路由的成功/失败响应形态一致,失败一律是结构化 `{ error: string }`,
// 不再出现框架级裸 500(无 JSON body)。前端可稳定按 `data.error` 取话术。
//
// 设计取舍:
// - 成功响应不强制包一层 `{ data }`,而是直接透传调用方给的对象(保持与现有
//   路由 `NextResponse.json({ session, items })` 等形态兼容,避免破坏前端解析)。
// - `fail` 只负责错误响应,状态码语义沿用全仓约定(400/401/403/404/409/429/500)。
// - `withApiHandler` 兜底捕获 handler 内任何抛出(repository / Supabase / 越界),
//   统一返回结构化 500;非生产环境附带 `detail` 便于排障,生产环境只回通用话术,
//   避免把内部错误信息(可能含表名/约束名)泄露给客户端。

/** 成功响应:直接透传 body(默认 200)。 */
export function ok<T extends Record<string, unknown>>(
  body: T,
  status = 200,
): NextResponse {
  return NextResponse.json(body, { status });
}

/** 失败响应:结构化 `{ error }` + 状态码。 */
export function fail(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}

/**
 * 把 unknown 错误压成给客户端的安全 message。
 * 生产环境不暴露内部细节(可能含表/约束/堆栈信息),只回通用话术。
 */
function safeErrorDetail(error: unknown): string | undefined {
  if (process.env.NODE_ENV === "production") {
    return undefined;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return String(error);
}

/**
 * 路由 handler 兜底包装。把 handler 内未捕获的异常统一转成结构化 500,
 * 而非让其冒泡成 Next 框架级 500(无 JSON body)。
 *
 * 用法:
 *   export const POST = withApiHandler(async (request, ctx) => { ... });
 *
 * handler 自己返回的 NextResponse(含业务 4xx)原样透传,只兜底"抛出"的异常。
 * 第二参 `ctx` 透传 Next 的路由上下文(含 `params: Promise<...>`)。
 */
export function withApiHandler<Ctx = unknown>(
  handler: (request: Request, ctx: Ctx) => Promise<NextResponse | Response>,
): (request: Request, ctx: Ctx) => Promise<NextResponse | Response> {
  return async (request: Request, ctx: Ctx) => {
    try {
      return await handler(request, ctx);
    } catch (error) {
      const detail = safeErrorDetail(error);
      return NextResponse.json(
        detail
          ? { error: "服务暂时不可用,请稍后再试。", detail }
          : { error: "服务暂时不可用,请稍后再试。" },
        { status: 500 },
      );
    }
  };
}

/**
 * 解析列表端点的分页参数(防御性上界,避免无界拉全表造成大响应/慢查询)。
 * 从 URL query 读 `limit`/`offset`,缺省与越界一律夹取到安全范围。
 *
 * 注:底层 repository 当前仍是全量取再由调用方切片(packages 不在本次改动域),
 * 此处提供路由层的硬上界,把"无界响应体"问题先在 API 边界收住。
 */
export function parsePagination(
  request: Request,
  opts: { defaultLimit?: number; maxLimit?: number } = {},
): { limit: number; offset: number } {
  const { defaultLimit = 100, maxLimit = 200 } = opts;
  const url = new URL(request.url);

  const rawLimit = Number(url.searchParams.get("limit"));
  const limit =
    Number.isFinite(rawLimit) && rawLimit > 0
      ? Math.min(Math.floor(rawLimit), maxLimit)
      : defaultLimit;

  const rawOffset = Number(url.searchParams.get("offset"));
  const offset =
    Number.isFinite(rawOffset) && rawOffset > 0 ? Math.floor(rawOffset) : 0;

  return { limit, offset };
}
