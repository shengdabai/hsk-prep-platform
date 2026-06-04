# Agent 指引 — apps/web

本应用使用 **Next.js 16(App Router）+ React 19 + TypeScript + Tailwind CSS v4**。

## 关键约定(对照实际代码,勿凭旧记忆假设)
- App Router:路由处理器在 `app/api/**/route.ts`,页面在 `app/**/page.tsx`。
- 动态路由参数是 **Promise**:`{ params }: { params: Promise<{ id: string }> }`,使用前 `await params`。
- 中间件在 **`proxy.ts`**(Next 16 中 middleware 已更名为 proxy),运行于 Edge runtime——不可用 `node:crypto`,只能用 Web Crypto(见 `lib/session-edge.ts`)。
- 路由处理器运行于 Node runtime,可用 `node:crypto`(`lib/session.ts`、`lib/password.ts`)。

## 鉴权(重要)
- 会话:HMAC 签名 cookie `hsk_session`(`lib/session.ts`),**不要**再用任何明文 userId cookie。
- 页面/服务端组件:`lib/auth.ts` 的 `getCurrentUser/requireUser/requireRole`。
- API 路由:`lib/api-auth.ts` 的 `requireApiUser/requireApiRole`(返回 401/403,不 redirect)。
- 所有学生数据 API 必须做资源归属校验(`resource.userId === currentUser.id`);admin API 必须 `requireApiRole`。

## 数据层
- 经 `@hsk/db` 的 `getRepository()` 访问;演示态走内存 mock,配置 Supabase 后切真实后端。
- 切勿在前端暴露 `correctOptionId`;答题进行中也不下发 `explanation`。

## 文档
- 官方文档查询用 context7 MCP,不要去翻 `node_modules`。
- 产品/架构见 `docs/`,HSK 3.0 题型规格见 `docs/HSK_3.0_EXAM_SPEC.md`。
