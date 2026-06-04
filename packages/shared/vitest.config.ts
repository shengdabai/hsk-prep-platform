import { defineConfig } from "vitest/config";

// 仅测 @hsk/shared 的纯函数(grading / srs / report)。
// node 环境足够(无 DOM 依赖);只收集本包 src 下的 *.test.ts。
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
