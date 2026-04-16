# HSK Prep Platform

An HSK-aligned Chinese language exam preparation web platform built with Next.js App Router, TypeScript, Tailwind CSS, and Supabase-ready architecture.

HSK 备考平台 — 基于 Next.js App Router、TypeScript、Tailwind CSS 和 Supabase 架构的中文考试备考网站。

---

## Features / 功能特性

**Student Portal / 学生端**
- HSK level browsing with structured content (HSK 1-6)
- Mock exam practice with timed sessions
- Mistake book with spaced repetition review
- Performance reports and analytics
- Pricing and subscription plans

**Admin Portal / 管理端**
- Content item CRUD and review workflow
- Practice set management
- Bulk import from CSV/JSON
- Media management
- User administration

**Infrastructure / 基础设施**
- Monorepo with shared packages (db, shared types, UI components)
- Parser service contract for PDF content extraction
- SQL migrations and seed scripts
- Stripe billing integration (checkout + webhook)

## Tech Stack / 技术栈

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Billing**: Stripe
- **Package Manager**: pnpm (monorepo via pnpm-workspace.yaml)

## Project Structure / 项目结构

```
hsk-prep-platform/
├── apps/
│   └── web/                 # Next.js frontend + backend
├── services/
│   └── parser/              # Parser service contract & schema
├── packages/
│   ├── db/                  # Database types, Supabase client, repository
│   ├── shared/              # Shared domain types & sample content
│   └── ui/                  # Shared UI components
├── infra/
│   └── sql/                 # Migrations & seed SQL
├── docs/                    # PRD & architecture docs
└── content/
    ├── imports/             # Content to be imported
    └── published/           # Published sample content
```

## Getting Started / 快速开始

```bash
# Install dependencies
pnpm install

# Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase and Stripe keys

# Run development server
pnpm dev
```

## Database Setup / 数据库配置

1. Execute `infra/sql/001_hsk_prep_mvp.sql` in Supabase SQL Editor
2. Execute `infra/sql/002_seed_basics.sql` for seed data
3. Configure `.env.local` with Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   ```

## Demo Mode / 演示模式

Without Supabase connected, the app runs in demo auth mode:
- Learner: `learner@demo.local`
- Reviewer: `reviewer@demo.local`
- Admin: `admin@demo.local`
- Any password is accepted in demo mode

## Content Import / 内容导入

```bash
# Import from default CSV
pnpm import:items

# Import from custom file
pnpm import:items -- ../../content/imports/hsk1-items.csv
```

Without Supabase, imports are previewed to `content/imports/last-import.preview.json`.

## Validation / 验证

```bash
pnpm lint
pnpm build
```

## Documentation / 文档

- Product Requirements: `docs/PRD_HSK_PREP_WEB_MVP.md`
- Architecture: `docs/ARCHITECTURE_HSK_PREP_WEB_MVP.md`

## License

Private repository. All rights reserved.
