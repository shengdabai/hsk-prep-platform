import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// 单一密码哈希实现来源:apps/web 与 mock 种子共用,避免两套逻辑不一致。
// 使用 Node 内建 scrypt,零额外依赖,运行于 Next.js 路由的 Node runtime。

const KEY_LEN = 64;
const PREFIX = "scrypt";

export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(plain, salt, KEY_LEN).toString("hex");
  return `${PREFIX}$${salt}$${derived}`;
}

export function verifyPassword(plain: string, stored: string | null | undefined): boolean {
  if (!stored) {
    return false;
  }
  const parts = stored.split("$");
  if (parts.length !== 3 || parts[0] !== PREFIX) {
    return false;
  }
  const [, salt, expectedHex] = parts;
  const expected = Buffer.from(expectedHex, "hex");
  const actual = scryptSync(plain, salt, expected.length);
  if (expected.length !== actual.length) {
    return false;
  }
  return timingSafeEqual(expected, actual);
}
