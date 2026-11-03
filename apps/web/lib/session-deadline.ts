// A timed exam ends when its minutes run out. The grace period covers an answer already on its way.
const GRACE_MS = 30_000;

export function sessionDeadlineMs(startedAt: string, minutes: number): number | null {
  const started = Date.parse(startedAt);
  if (!Number.isFinite(started) || !Number.isFinite(minutes) || minutes <= 0) {
    return null; // No usable start or time limit: the session has no deadline.
  }
  return started + minutes * 60_000;
}

export function isPastDeadline(startedAt: string, minutes: number, now: number = Date.now()): boolean {
  const deadline = sessionDeadlineMs(startedAt, minutes);
  return deadline !== null && now > deadline + GRACE_MS;
}

export function formatRemaining(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
