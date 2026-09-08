import { describe, expect, it } from "vitest";
import { runBatch, type BatchItem } from "./run";
const queue = (): BatchItem[] => ["a", "b", "c"].map((path) => ({ path, name: path, status: "pending" }));
describe("batch queue", () => {
  it("processes sequentially and continues after a corrupt image", async () => {
    const items = queue(), order: string[] = [];
    let active = 0;
    const result = await runBatch(items, async (item) => {
      expect(++active).toBe(1); order.push(item.path);
      await Promise.resolve(); active--;
      if (item.path === "b") throw new Error("corrupt");
      return `${item.path}.png`;
    }, () => false, (path, patch) => Object.assign(items.find((item) => item.path === path)!, patch));
    expect(order).toEqual(["a", "b", "c"]);
    expect(result).toEqual({ completed: 2, failed: 1, cancelled: false });
    expect(items.map((item) => item.status)).toEqual(["done", "failed", "done"]);
  });
  it("keeps completed output and does not start further images after cancel", async () => {
    const items = queue(); let cancelled = false;
    const result = await runBatch(items, async () => { cancelled = true; return "a.png"; }, () => cancelled,
      (path, patch) => Object.assign(items.find((item) => item.path === path)!, patch));
    expect(result.completed).toBe(1); expect(result.cancelled).toBe(true);
    expect(items.map((item) => item.status)).toEqual(["done", "pending", "pending"]);
  });
  it("leaves an interrupted image pending for another run", async () => {
    const items = queue(); let cancelled = false;
    await runBatch(items, async () => { cancelled = true; throw new Error("Cancelled"); }, () => cancelled,
      (path, patch) => Object.assign(items.find((item) => item.path === path)!, patch));
    expect(items.every((item) => item.status === "pending")).toBe(true);
  });
});
