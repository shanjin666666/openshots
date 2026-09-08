import { describe, expect, it } from "vitest";
import { batchLayout, BATCH_POSITIONS, DEFAULT_BATCH_SETTINGS } from "./layout";

const settings = () => structuredClone(DEFAULT_BATCH_SETTINGS);
describe("batch placement", () => {
  it("keeps original pixels and adds padding on every side", () => {
    const layout = batchLayout(640, 480, settings());
    expect(layout).toMatchObject({ width: 768, height: 608, imageWidth: 640, imageHeight: 480, x: 64, y: 64 });
  });
  it("fits mixed aspect ratios into one canvas without stretching or clipping", () => {
    for (const [width, height] of [[4000, 1000], [600, 2400], [500, 500]]) {
      for (const position of BATCH_POSITIONS) {
        const config = { ...settings(), sizeMode: "fixed" as const, width: 1200, height: 900, position, imageScale: 70 };
        const layout = batchLayout(width!, height!, config);
        expect(layout.width).toBe(1200); expect(layout.height).toBe(900);
        expect(layout.imageWidth / layout.imageHeight).toBeCloseTo(width! / height!);
        expect(layout.x).toBeGreaterThanOrEqual(64); expect(layout.y).toBeGreaterThanOrEqual(64);
        expect(layout.x + layout.imageWidth).toBeLessThanOrEqual(1136);
        expect(layout.y + layout.imageHeight).toBeLessThanOrEqual(836);
      }
    }
  });
  it("uses the requested bottom-right position and includes the border", () => {
    const config = settings(); config.position = "bottom-right"; config.imageScale = 50; config.border.enabled = true; config.border.width = 4;
    const layout = batchLayout(400, 200, config);
    expect(layout.x + layout.imageWidth + 8).toBe(layout.width - 64);
    expect(layout.y + layout.imageHeight + 8).toBe(layout.height - 64);
  });
  it("limits corner radius to the actual image and rejects impossible output", () => {
    const config = settings(); config.cornerRadius = 200;
    expect(batchLayout(20, 10, config).radius).toBe(5);
    expect(() => batchLayout(10000, 10000, config)).toThrow("limit");
    expect(() => batchLayout(100, 100, { ...config, sizeMode: "fixed", width: 64 })).toThrow("padding");
    expect(() => batchLayout(100, 100, { ...config, imageScale: NaN })).toThrow("Invalid");
  });
});
