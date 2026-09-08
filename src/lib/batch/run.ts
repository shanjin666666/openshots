export interface BatchItem { path: string; name: string; status: "pending" | "working" | "done" | "failed"; output?: string; error?: string }

/** Snapshot the queue; failures do not prevent subsequent files from being processed. */
export async function runBatch(
  items: BatchItem[],
  process: (item: BatchItem) => Promise<string>,
  cancelled: () => boolean,
  update: (path: string, patch: Partial<BatchItem>) => void,
) {
  let completed = 0, failed = 0;
  for (const item of items) {
    if (cancelled()) break;
    update(item.path, { status: "working", error: undefined, output: undefined });
    try {
      const output = await process(item);
      update(item.path, { status: "done", output });
      completed++;
    } catch (error) {
      if (cancelled()) { update(item.path, { status: "pending" }); break; }
      update(item.path, { status: "failed", error: error instanceof Error ? error.message : String(error) });
      failed++;
    }
  }
  return { completed, failed, cancelled: cancelled() };
}
