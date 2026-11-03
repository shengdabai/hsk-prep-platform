// "refused" means the server will never take this answer, because the session is closed.
export type SaveResult = "saved" | "retry" | "refused";
export type SendAnswer = (itemId: string, value: string) => Promise<SaveResult>;

export type AnswerSaver = {
  save: (itemId: string, value: string) => Promise<void>;
  // Waits for saves on their way, retries the failed ones, and returns how many stay unsaved.
  flush: () => Promise<number>;
  // The same as flush, but stops waiting after maxWaitMs. Returns how many answers are still open.
  settle: (maxWaitMs: number) => Promise<number>;
  // Answers that can still reach the server: failed ones and ones on their way.
  open: () => number;
  // Answers the server has not confirmed, including refused ones.
  unconfirmed: () => number;
};

// Answers this browser kept that the server does not have, for example after a reload while offline.
export function answersToRestore(
  local: Record<string, string>,
  server: Record<string, string>,
): Record<string, string> {
  return Object.fromEntries(Object.entries(local).filter(([itemId, value]) => server[itemId] !== value));
}

// Tracks answers on their way to the server, so handing in never overtakes a save.
// Each question has one save at a time, so the newest choice is always the last one written.
export function createAnswerSaver(
  send: SendAnswer,
  onUnsavedChange: (unsaved: Record<string, string>) => void,
  restored: Record<string, string> = {},
): AnswerSaver {
  const latest = new Map(Object.entries(restored));
  const unsaved = new Map(Object.entries(restored));
  const refused = new Set<string>();
  const queues = new Map<string, Promise<void>>();

  async function sendIfCurrent(itemId: string, value: string): Promise<void> {
    if (latest.get(itemId) !== value) return; // A newer choice replaced this one before it left.
    const result = await send(itemId, value).catch((): SaveResult => "retry");
    if (latest.get(itemId) !== value) return; // A newer choice is queued, and its result decides.
    unsaved.delete(itemId);
    refused.delete(itemId);
    if (result === "retry") unsaved.set(itemId, value);
    if (result === "refused") refused.add(itemId);
    onUnsavedChange(Object.fromEntries(unsaved));
  }

  function save(itemId: string, value: string): Promise<void> {
    latest.set(itemId, value);
    const previous = queues.get(itemId) ?? Promise.resolve();
    const queued: Promise<void> = previous.then(() => sendIfCurrent(itemId, value)).finally(() => {
      if (queues.get(itemId) === queued) queues.delete(itemId);
    });
    queues.set(itemId, queued);
    return queued;
  }

  async function flush(): Promise<number> {
    while (queues.size > 0) {
      await Promise.allSettled([...queues.values()]);
    }
    for (const [itemId, value] of [...unsaved]) {
      await save(itemId, latest.get(itemId) ?? value);
    }
    return unsaved.size;
  }

  const open = () => new Set([...unsaved.keys(), ...queues.keys()]).size;

  return {
    save,
    flush,
    open,
    unconfirmed: () => new Set([...unsaved.keys(), ...queues.keys(), ...refused]).size,
    async settle(maxWaitMs: number) {
      let timer: ReturnType<typeof setTimeout> | undefined;
      const timeout = new Promise<void>((resolve) => {
        timer = setTimeout(resolve, maxWaitMs);
      });
      await Promise.race([flush(), timeout]);
      clearTimeout(timer);
      return open();
    },
  };
}
