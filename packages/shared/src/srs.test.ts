import { describe, expect, it } from "vitest";
import {
  initialSrsState,
  isMistakeDue,
  scheduleSrs,
  SRS_DEFAULT_EASE_FACTOR,
  SRS_MIN_EASE_FACTOR,
  type SrsState,
} from "./srs";

// 固定时间锚点,保证调度结果确定可断言。
const NOW = "2026-06-04T00:00:00.000Z";

// 在 NOW 基础上加 n 天的预期 ISO(与 srs.addDaysIso 口径一致:毫秒加法)。
function plusDaysIso(days: number): string {
  return new Date(new Date(NOW).getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

// EF 更新公式(与源一致):EF' = EF + (0.1 - (5-q)*(0.08 + (5-q)*0.02)),下限 1.3。
function expectedEase(prevEase: number, quality: number): number {
  const raw = prevEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return raw < SRS_MIN_EASE_FACTOR ? SRS_MIN_EASE_FACTOR : raw;
}

describe("scheduleSrs — EF 公式与四档质量映射", () => {
  // 四档评分 → quality:again=2, hard=3, good=4, easy=5。
  it("easy(q=5)EF 增加 +0.1", () => {
    const s = scheduleSrs(null, "easy", NOW);
    expect(s.easeFactor).toBeCloseTo(expectedEase(SRS_DEFAULT_EASE_FACTOR, 5), 10);
    expect(s.easeFactor).toBeCloseTo(2.6, 10); // 2.5 + 0.1
  });
  it("good(q=4)EF 基本不变(+约 -0.0)", () => {
    const s = scheduleSrs(null, "good", NOW);
    expect(s.easeFactor).toBeCloseTo(expectedEase(SRS_DEFAULT_EASE_FACTOR, 4), 10);
    // q=4: 0.1 - 1*(0.08 + 1*0.02) = 0.1 - 0.1 = 0 → EF 不变。
    expect(s.easeFactor).toBeCloseTo(2.5, 10);
  });
  it("hard(q=3)EF 下降", () => {
    const s = scheduleSrs(null, "hard", NOW);
    // q=3: 0.1 - 2*(0.08 + 2*0.02) = 0.1 - 2*0.12 = 0.1 - 0.24 = -0.14 → 2.5-0.14=2.36
    expect(s.easeFactor).toBeCloseTo(2.36, 10);
  });
  it("again(q=2)EF 下降更多", () => {
    const s = scheduleSrs(null, "again", NOW);
    // q=2: 0.1 - 3*(0.08 + 3*0.02) = 0.1 - 3*0.14 = 0.1 - 0.42 = -0.32 → 2.5-0.32=2.18
    expect(s.easeFactor).toBeCloseTo(2.18, 10);
  });
});

describe("scheduleSrs — EF 下限夹紧 1.3", () => {
  it("低 EF 连续 again 不会跌破 1.3", () => {
    const prev: SrsState = { easeFactor: 1.35, repetitions: 5, intervalDays: 30 };
    const s = scheduleSrs(prev, "again", NOW);
    // 1.35 - 0.32 = 1.03 → 夹到 1.3。
    expect(s.easeFactor).toBe(SRS_MIN_EASE_FACTOR);
    expect(s.easeFactor).toBe(1.3);
  });
  it("恰好等于下限时保持 1.3", () => {
    // 选 prevEase 使结果正好略低于 1.3 → 夹紧。
    const prev: SrsState = { easeFactor: 1.3, repetitions: 3, intervalDays: 10 };
    const s = scheduleSrs(prev, "hard", NOW); // 1.3 - 0.14 = 1.16 → 1.3
    expect(s.easeFactor).toBe(1.3);
  });
});

describe("scheduleSrs — 答错(q<3)重置", () => {
  it("again 重置 repetitions=0,interval=1,无论之前进度多深", () => {
    const prev: SrsState = { easeFactor: 2.6, repetitions: 8, intervalDays: 120 };
    const s = scheduleSrs(prev, "again", NOW);
    expect(s.repetitions).toBe(0);
    expect(s.intervalDays).toBe(1);
    expect(s.dueAt).toBe(plusDaysIso(1));
    expect(s.lastReviewedAt).toBe(NOW);
  });
  it("hard 视为通过(q=3 >= 3),不重置", () => {
    const prev: SrsState = { easeFactor: 2.5, repetitions: 2, intervalDays: 6 };
    const s = scheduleSrs(prev, "hard", NOW);
    expect(s.repetitions).toBe(3); // 递增而非重置
  });
});

describe("scheduleSrs — 通过(q>=3)间隔递增调度", () => {
  it("首次复习(prev=null):repetitions=1 → interval=1", () => {
    const s = scheduleSrs(null, "good", NOW);
    expect(s.repetitions).toBe(1);
    expect(s.intervalDays).toBe(1);
    expect(s.dueAt).toBe(plusDaysIso(1));
  });
  it("第二次通过:repetitions=2 → interval=6", () => {
    const prev: SrsState = { easeFactor: 2.5, repetitions: 1, intervalDays: 1 };
    const s = scheduleSrs(prev, "good", NOW);
    expect(s.repetitions).toBe(2);
    expect(s.intervalDays).toBe(6);
    expect(s.dueAt).toBe(plusDaysIso(6));
  });
  it("第三次及以后:interval = round(prevInterval * EF')", () => {
    const prev: SrsState = { easeFactor: 2.5, repetitions: 2, intervalDays: 6 };
    const s = scheduleSrs(prev, "good", NOW);
    expect(s.repetitions).toBe(3);
    // good → EF' = 2.5(不变);interval = round(6 * 2.5) = 15
    expect(s.easeFactor).toBeCloseTo(2.5, 10);
    expect(s.intervalDays).toBe(15);
    expect(s.dueAt).toBe(plusDaysIso(15));
  });
  it("easy 在第三次拉长间隔(EF 升到 2.6)", () => {
    const prev: SrsState = { easeFactor: 2.5, repetitions: 2, intervalDays: 6 };
    const s = scheduleSrs(prev, "easy", NOW);
    // easy → EF' = 2.6;interval = round(6 * 2.6) = round(15.6) = 16
    expect(s.easeFactor).toBeCloseTo(2.6, 10);
    expect(s.intervalDays).toBe(16);
  });
  it("repetitions>=2 但 prevInterval=0(异常)→ 退回 6 天基准避免乘 0", () => {
    const prev: SrsState = { easeFactor: 2.5, repetitions: 5, intervalDays: 0 };
    const s = scheduleSrs(prev, "good", NOW);
    // baseInterval 退回 6 → round(6 * 2.5) = 15
    expect(s.intervalDays).toBe(15);
  });
  it("间隔随复习单调递增(good 连续多轮)", () => {
    let state: SrsState = {};
    const intervals: number[] = [];
    for (let i = 0; i < 5; i++) {
      const sched = scheduleSrs(state, "good", NOW);
      intervals.push(sched.intervalDays);
      state = sched;
    }
    // 1, 6, 15, ~38, ~95 — 严格递增。
    expect(intervals[0]).toBe(1);
    expect(intervals[1]).toBe(6);
    for (let i = 1; i < intervals.length; i++) {
      expect(intervals[i]).toBeGreaterThan(intervals[i - 1]);
    }
  });
});

describe("scheduleSrs — 默认值兜底(prev 部分字段)", () => {
  it("prev=undefined 用默认 EF 2.5 / reps 0", () => {
    const s = scheduleSrs(undefined, "good", NOW);
    expect(s.repetitions).toBe(1);
    expect(s.easeFactor).toBeCloseTo(2.5, 10);
  });
  it("prev 只有 dueAt(刚初始化的错题首次复习)→ 用默认 EF / reps", () => {
    const prev: SrsState = { dueAt: NOW };
    const s = scheduleSrs(prev, "good", NOW);
    expect(s.repetitions).toBe(1);
    expect(s.intervalDays).toBe(1);
  });
  it("非法 nowIso 不抛错(addDaysIso 回退当前时间)", () => {
    expect(() => scheduleSrs(null, "good", "not-a-date")).not.toThrow();
    const s = scheduleSrs(null, "good", "not-a-date");
    expect(s.repetitions).toBe(1);
    // lastReviewedAt 是传入的原始字符串(源未做归一化),只断言不抛。
    expect(typeof s.dueAt).toBe("string");
  });
});

describe("initialSrsState — 首次入库初始化", () => {
  it("EF=2.5, interval=0, reps=0, dueAt=lastReviewedAt=createdAt", () => {
    const s = initialSrsState(NOW);
    expect(s).toEqual({
      easeFactor: SRS_DEFAULT_EASE_FACTOR,
      intervalDays: 0,
      repetitions: 0,
      dueAt: NOW,
      lastReviewedAt: NOW,
    });
  });
});

describe("isMistakeDue — 到期判定", () => {
  it("dueAt <= now → 到期 true", () => {
    expect(isMistakeDue({ dueAt: "2026-06-03T00:00:00.000Z" }, NOW)).toBe(true);
  });
  it("dueAt 正好等于 now → 到期 true(<=)", () => {
    expect(isMistakeDue({ dueAt: NOW }, NOW)).toBe(true);
  });
  it("dueAt > now → 未到期 false", () => {
    expect(isMistakeDue({ dueAt: "2026-06-05T00:00:00.000Z" }, NOW)).toBe(false);
  });
  it("无 dueAt(旧数据)→ 视为立即可复习 true", () => {
    expect(isMistakeDue({ dueAt: undefined }, NOW)).toBe(true);
  });
  it("非法 dueAt → 视为已到期 true", () => {
    expect(isMistakeDue({ dueAt: "garbage" }, NOW)).toBe(true);
  });
});
