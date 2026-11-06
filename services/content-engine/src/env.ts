/**
 * services/content-engine/src/env.ts
 *
 * 引擎是独立 tsx 脚本(不经 Next),需主动加载 apps/web/.env.local 里的 API key。
 * 用 Node 内建 process.loadEnvFile(Node ≥20.12),运行期由 node 进程读取,
 * 密钥不经过本助手、不进日志。best-effort:文件不存在则静默跳过。
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));

// content-engine/src → content-engine → services → repo-root
const REPO_ROOT = join(__dirname, "..", "..", "..");

export function loadEnv(): void {
  const candidates = [
    join(REPO_ROOT, "apps", "web", ".env.local"),
    join(REPO_ROOT, ".env"),
    join(__dirname, "..", ".env"),
  ];
  const loader = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
  for (const p of candidates) {
    if (existsSync(p) && typeof loader === "function") {
      try {
        loader(p);
      } catch {
        // 忽略:格式问题不阻断,缺 key 时各 adapter 自行回退占位。
      }
    }
  }
}

export { REPO_ROOT };
