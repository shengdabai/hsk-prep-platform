export type SendAnswer = (itemId: string, value: string) => Promise<boolean>;

export type AnswerSaver = {
  save: (itemId: string, value: string) => Promise<void>;
  // Waits for saves on their way, retries the failed ones, and returns how many stay unsaved.
  flush: () => Promise<number>;
};

// Tracks answers on their way to the server, so handing in never overtakes a save.
export function createAnswerSaver(
  send: SendAnswer,
  onUnsavedChange: (unsaved: Record<string, string>) => void,
): AnswerSaver {
  const latest = new Map<string, string>();
  const unsaved = new Map<string, string>();
  const inFlight = new Set<Promise<void>>();

  function save(itemId: string, value: string): Promise<void> {
    latest.set(itemId, value);
    const run = send(itemId, value)
      .catch(() => false)
      .then((saved) => {
        // A newer choice for this question has its own save, so this result no longer counts.
        if (latest.get(itemId) !== value) return;
        if (saved) {
          unsaved.delete(itemId);
        } else {
          unsaved.set(itemId, value);
        }
        onUnsavedChange(Object.fromEntries(unsaved));
      });
    const tracked: Promise<void> = run.finally(() => {
      inFlight.delete(tracked);
    });
    inFlight.add(tracked);
    return tracked;
  }

  async function flush(): Promise<number> {
    while (inFlight.size > 0) {
      await Promise.allSettled([...inFlight]);
    }
    for (const [itemId, value] of [...unsaved]) {
      await save(itemId, latest.get(itemId) ?? value);
    }
    return unsaved.size;
  }

  return { save, flush };
}
