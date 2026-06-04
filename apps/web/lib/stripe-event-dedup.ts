// Stripe webhook 事件幂等去重(进程内)。
//
// 背景:Stripe 会对同一事件重投递(at-least-once 投递语义)。若不去重,
// 同一 event.id 会被重复处理 —— setSubscription 本身 upsert 幂等,但 addAuditLog
// 不是,会重复写审计日志,污染审计痕迹。此处按 event.id 记一次"已处理",
// 重复投递直接跳过业务副作用。
//
// ⚠️ 生产注意:此实现把已处理 id 存在单进程内存(Set)中,仅适用于单实例 / 演示
// 环境。多实例部署(Vercel serverless、多容器)下各实例内存互不可见,跨实例的
// 重投递不会被去重。生产环境应改用持久化去重表(如 Supabase
// `processed_stripe_events(event_id)` 唯一约束),在数据层做幂等。该表与 repo
// 方法属 packages/db 域,本次仅在 API 边界先把单实例重投递收住。
//
// 内存控制:用插入序队列做 FIFO 上限,超出上限淘汰最旧 id,避免长期运行无界增长。

const MAX_TRACKED = 5000;

const seen = new Set<string>();
const order: string[] = [];

/**
 * 标记并判断该 event.id 是否为首次处理。
 * - 返回 true:首次见到(已登记),调用方应继续处理业务副作用。
 * - 返回 false:已处理过(重投递),调用方应跳过副作用直接回 200。
 */
export function markStripeEventOnce(eventId: string): boolean {
  if (seen.has(eventId)) {
    return false;
  }
  seen.add(eventId);
  order.push(eventId);
  if (order.length > MAX_TRACKED) {
    const evicted = order.shift();
    if (evicted !== undefined) {
      seen.delete(evicted);
    }
  }
  return true;
}
