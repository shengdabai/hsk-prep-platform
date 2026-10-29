import { defineConfig } from "vitest/config";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
const webRequire = createRequire(new URL("../../apps/web/package.json", import.meta.url));

// repository 层集成测试(mock-repository 真实行为)。
// node 环境足够(无 DOM 依赖);只收集本包 src 下的 *.test.ts。
// 不依赖 Supabase env —— getRepository() 在无 env 时回退 mock,正是被测对象。
export default defineConfig({
  resolve: { alias: { stripe: webRequire.resolve("stripe"), "@": fileURLToPath(new URL("../../apps/web", import.meta.url)) } },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
