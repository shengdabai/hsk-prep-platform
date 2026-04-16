# Web App

`apps/web` 是 HSK Prep Platform 的 Next.js App Router 应用。

## 运行

```bash
cd /Users/adam/hsk-prep-platform
pnpm dev
```

## 验证

```bash
cd /Users/adam/hsk-prep-platform
pnpm lint
pnpm build
```

## 说明

- 默认使用 demo auth + mock repository
- 已预留 Supabase Auth / Postgres / Storage 接入位
- 已提供学生端、管理端和 Route Handlers 骨架
