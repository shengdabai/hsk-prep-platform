# 🀄 HSK Prep Platform

**English** | [中文](#-hsk-备考平台)

[![Last commit](https://img.shields.io/github/last-commit/shengdabai/hsk-prep-platform?logo=github)](https://github.com/shengdabai/hsk-prep-platform/commits)
[![Stars](https://img.shields.io/github/stars/shengdabai/hsk-prep-platform?style=social)](https://github.com/shengdabai/hsk-prep-platform/stargazers)
[![Follow @shengdabai](https://img.shields.io/github/followers/shengdabai?label=Follow%20%40shengdabai&style=social)](https://github.com/shengdabai)

> An HSK-aligned Chinese-proficiency exam prep platform — browse levels, sit timed mock exams, drill your mistakes with spaced repetition, and track your progress. Built for global Chinese learners.

## Why

The HSK (Hanyu Shuiping Kaoshi / 汉语水平考试) is the international standard test of Chinese proficiency. Learners worldwide need structured, level-aligned practice — not scattered PDFs. **HSK Prep Platform** turns HSK-aligned content into a real study product: leveled browsing (HSK 1–6), timed mock exams, a mistake book with spaced repetition, and performance analytics — plus an admin portal to author and review content.

## ✨ Features

**Student Portal**
- HSK level browsing with structured content (HSK 1–6)
- Timed mock exam practice with session snapshots
- Mistake book with spaced-repetition (SRS) review
- Performance reports and analytics
- Pricing and subscription plans

**Admin Portal**
- Content item CRUD with a review workflow
- Practice set management
- Bulk import from CSV / JSON
- Media management
- User administration

**Infrastructure**
- pnpm monorepo with shared packages (db, shared types, UI)
- Parser service contract for PDF content extraction
- Versioned SQL migrations and seed scripts
- Stripe billing integration (checkout + webhook)

## 🧱 Tech Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| UI | React 19 + Tailwind CSS v4 |
| Database | Supabase (PostgreSQL, `@supabase/ssr`) |
| Validation | Zod |
| Billing | Stripe |
| Tests | Vitest |
| Tooling | pnpm workspace monorepo |

## 🚀 Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Configure environment
cp .env.example .env.local
# Edit .env.local with your Supabase + Stripe keys

# 3. Run the dev server
pnpm dev
```

### Database Setup

Run the migrations in order in the Supabase SQL Editor (`infra/sql/`):

1. `001_hsk_prep_mvp.sql` — core schema
2. `002_seed_basics.sql` — seed data
3. `003`–`007` — entitlements, SRS, profiles, exam snapshots, content fields

Then set Supabase credentials in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Demo Mode

Without Supabase connected, the app runs in demo auth mode — any password is accepted:

- Learner: `learner@demo.local`
- Reviewer: `reviewer@demo.local`
- Admin: `admin@demo.local`

## 📖 Usage

```bash
# Import content from the default CSV
pnpm import:items

# Import from a custom file
pnpm import:items -- ../../content/imports/hsk1-items.csv

# Lint & build
pnpm lint
pnpm build
```

Without Supabase, imports are previewed to `content/imports/last-import.preview.json`.

### Project Structure

```
hsk-prep-platform/
├── apps/web/            # Next.js App Router frontend + API routes
├── services/parser/     # Parser service contract & schema
├── packages/
│   ├── db/              # Supabase client, types, repository
│   ├── shared/          # Shared domain types & sample content
│   └── ui/              # Shared UI components
├── infra/sql/           # Versioned migrations & seed SQL
├── docs/                # PRD & architecture docs
└── content/             # Import / published sample content
```

## 🗺️ Status

Active MVP. Core student and admin flows, SRS, and Stripe billing are implemented; runs in demo mode without a backend. See `docs/PRD_HSK_PREP_WEB_MVP.md` and `docs/ARCHITECTURE_HSK_PREP_WEB_MVP.md`.

## 🤝 Connect / About

Built in public by **[@shengdabai](https://github.com/shengdabai)** (Tony / Sheng) — a Chinese-language teacher with 6000+ students, building AI + Chinese-teaching tools.

If this is useful, please **⭐ star the repo** and **follow [@shengdabai](https://github.com/shengdabai)**. Sibling projects worth a look:

- **chinese-mission** — gamified Chinese-learning quests
- **LinguaLens** — AI language-learning lens
- **ChineseThinking** — thinking in Chinese, the teacher's way

## License

No license file is currently included — all rights reserved. Open an issue if you'd like to discuss reuse.

---

# 🀄 HSK 备考平台

[English](#-hsk-prep-platform) | **中文**

> 面向全球中文学习者的 HSK 备考平台 —— 按等级浏览内容、限时模拟考试、错题间隔重复复习、学习数据追踪。

## 为什么做

HSK(汉语水平考试)是国际通用的中文水平测试。全球学习者需要的是结构化、按等级对齐的练习,而不是零散的 PDF。**HSK 备考平台** 把对齐 HSK 的内容做成真正的学习产品:HSK 1–6 分级浏览、限时模拟考、带间隔重复(SRS)的错题本、学习数据分析,并配有内容创作与审核的管理后台。

## ✨ 功能特性

**学生端**
- HSK 等级浏览,结构化内容(HSK 1–6)
- 限时模拟考试,带会话快照
- 错题本 + 间隔重复(SRS)复习
- 学习报告与数据分析
- 价格与订阅方案

**管理端**
- 内容条目 CRUD 与审核流程
- 练习集管理
- CSV / JSON 批量导入
- 媒体管理
- 用户管理

**基础设施**
- pnpm monorepo,共享包(db、shared 类型、UI)
- PDF 内容提取的解析服务契约
- 版本化 SQL 迁移与种子脚本
- Stripe 计费集成(checkout + webhook)

## 🧱 技术栈

| 分层 | 选型 |
| --- | --- |
| 框架 | Next.js 16(App Router) |
| 语言 | TypeScript |
| UI | React 19 + Tailwind CSS v4 |
| 数据库 | Supabase(PostgreSQL,`@supabase/ssr`) |
| 校验 | Zod |
| 计费 | Stripe |
| 测试 | Vitest |
| 工具链 | pnpm workspace monorepo |

## 🚀 快速开始

```bash
# 1. 安装依赖
pnpm install

# 2. 配置环境变量
cp .env.example .env.local
# 在 .env.local 中填入你的 Supabase + Stripe 密钥

# 3. 启动开发服务器
pnpm dev
```

### 数据库配置

在 Supabase SQL Editor 中按顺序执行 `infra/sql/` 下的迁移:

1. `001_hsk_prep_mvp.sql` —— 核心表结构
2. `002_seed_basics.sql` —— 种子数据
3. `003`–`007` —— 权益、SRS、用户档案、考试快照、内容字段

然后在 `.env.local` 中配置 Supabase 凭证:

```
NEXT_PUBLIC_SUPABASE_URL=你的项目地址
NEXT_PUBLIC_SUPABASE_ANON_KEY=你的 anon key
SUPABASE_SERVICE_ROLE_KEY=你的 service role key
```

### 演示模式

未连接 Supabase 时,应用以演示鉴权模式运行 —— 任意密码均可登录:

- 学生:`learner@demo.local`
- 审核员:`reviewer@demo.local`
- 管理员:`admin@demo.local`

## 📖 使用

```bash
# 从默认 CSV 导入内容
pnpm import:items

# 从自定义文件导入
pnpm import:items -- ../../content/imports/hsk1-items.csv

# 代码检查与构建
pnpm lint
pnpm build
```

未连接 Supabase 时,导入结果会预览到 `content/imports/last-import.preview.json`。

### 项目结构

```
hsk-prep-platform/
├── apps/web/            # Next.js App Router 前端 + API 路由
├── services/parser/     # 解析服务契约与 schema
├── packages/
│   ├── db/              # Supabase 客户端、类型、仓储
│   ├── shared/          # 共享领域类型与示例内容
│   └── ui/              # 共享 UI 组件
├── infra/sql/           # 版本化迁移与种子 SQL
├── docs/                # PRD 与架构文档
└── content/             # 导入 / 已发布示例内容
```

## 🗺️ 状态

活跃 MVP。学生端与管理端核心流程、SRS、Stripe 计费已实现;无后端时以演示模式运行。详见 `docs/PRD_HSK_PREP_WEB_MVP.md` 与 `docs/ARCHITECTURE_HSK_PREP_WEB_MVP.md`。

## 🤝 联系 / 关于

由 **[@shengdabai](https://github.com/shengdabai)**(Tony / Sheng)公开开发 —— 一名拥有 6000+ 学员的中文教师,构建 AI + 中文教学工具。

如果对你有帮助,欢迎 **⭐ Star 本仓库** 并 **关注 [@shengdabai](https://github.com/shengdabai)**。姊妹项目:

- **chinese-mission** —— 游戏化中文学习任务
- **LinguaLens** —— AI 语言学习透镜
- **ChineseThinking** —— 用教师的方式"用中文思考"

## 许可

当前未包含许可证文件 —— 保留所有权利。如需复用,欢迎提 issue 讨论。
