// 内存版滑动窗口限流。
//
// ⚠️ 生产注意:此实现把计数存在单进程内存(Map)中,仅适用于单实例 / 演示环境。
// 多实例部署(Vercel serverless、多容器、水平扩容)下各实例内存互不可见,
// 限流会被绕过。生产环境请改用 Redis / Upstash 等共享存储做集中计数。
//
// 算法:对每个 key 维护一个时间戳数组(滑动窗口)。每次命中时先剔除窗口外的
// 旧时间戳,再判断窗口内剩余次数是否超过上限。

type Hit = number[]; // 命中时间戳(epoch ms)列表

const buckets = new Map<string, Hit>();

// 周期性清理空桶,避免长期运行内存泄漏。
let lastSweep = 0;
const SWEEP_INTERVAL_MS = 60_000;

function sweep(now: number, windowMs: number): void {
  if (now - lastSweep < SWEEP_INTERVAL_MS) {
    return;
  }
  lastSweep = now;
  for (const [key, hits] of buckets) {
    const fresh = hits.filter((ts) => now - ts < windowMs);
    if (fresh.length === 0) {
      buckets.delete(key);
    } else {
      buckets.set(key, fresh);
    }
  }
}

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  /** 距离窗口内最早一次命中过期还需多少秒(被限流时建议的 Retry-After)。 */
  retryAfterSeconds: number;
};

export type RateLimitOptions = {
  /** 窗口内允许的最大次数。 */
  limit: number;
  /** 窗口长度(毫秒)。 */
  windowMs: number;
};

/**
 * 对给定 key 记一次命中并返回是否允许。
 * key 由调用方组织,例如 `login:<ip>` 或 `signup:<email>`。
 */
export function rateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const { limit, windowMs } = options;
  const now = Date.now();
  sweep(now, windowMs);

  const existing = buckets.get(key) ?? [];
  // 只保留窗口内的命中。
  const recent = existing.filter((ts) => now - ts < windowMs);

  if (recent.length >= limit) {
    const oldest = recent[0];
    const retryAfterSeconds = Math.max(1, Math.ceil((oldest + windowMs - now) / 1000));
    // 不记录这次被拒的命中,避免恶意请求无限延长窗口。
    buckets.set(key, recent);
    return { ok: false, remaining: 0, retryAfterSeconds };
  }

  recent.push(now);
  buckets.set(key, recent);
  return { ok: true, remaining: Math.max(0, limit - recent.length), retryAfterSeconds: 0 };
}

/**
 * 从请求头提取客户端 IP(尽力而为)。代理 / CDN 后取 x-forwarded-for 第一段。
 * 取不到时回退到固定占位,确保限流仍能基于其它维度(如邮箱)工作。
 */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) {
      return first;
    }
  }
  return request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * 标准的 429 JSON 响应,带 Retry-After 头。
 */
export function tooManyRequests(retryAfterSeconds: number): Response {
  return new Response(
    JSON.stringify({ error: "请求过于频繁,请稍后再试。" }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
