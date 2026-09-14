import { describe, expect, it } from "vitest";
import { MAX_EXPORT_EDGE, MAX_EXPORT_PIXELS } from "../export-resolution";
import { batchLayout, DEFAULT_BATCH_SETTINGS, type BatchSettings } from "./layout";
import { batchExportResolution } from "./resolution";

const preset = (overrides: Partial<BatchSettings> = {}): BatchSettings => ({
  ...structuredClone(DEFAULT_BATCH_SETTINGS), sizeMode: "fixed", width: 1600, height: 883, padding: 30, ...overrides,
});

describe("batch export resolution", () => {
  it("keeps all source pixels when a high-resolution screenshot is fitted into a preset", () => {
    const settings = preset();
    const before = structuredClone(settings);
    const layout = batchLayout(3024, 1736, settings);
    const output = batchExportResolution(3024, 1736, settings, layout);
    expect(output.width).toBeGreaterThan(3024);
    expect(output.height).toBeGreaterThan(1736);
    expect(layout.imageWidth * output.scale).toBeCloseTo(3024);
    expect(layout.imageHeight * output.scale).toBeCloseTo(1736);
    expect(output).toMatchObject({ limited: false, downsampled: false });
    expect(settings).toEqual(before);
    expect(layout).toMatchObject({ width: 1600, height: 883 });
  });

  it("resolves each source in a mixed batch independently and does not shrink smaller sources", () => {
    const settings = preset();
    const outputs = [[4000, 1000], [600, 2400], [500, 500]].map(([width, height]) => {
      const layout = batchLayout(width!, height!, settings);
      const output = batchExportResolution(width!, height!, settings);
      expect(layout.imageWidth * output.scale).toBeGreaterThanOrEqual(width! - 1e-8);
      expect(layout.imageHeight * output.scale).toBeGreaterThanOrEqual(height! - 1e-8);
      expect(output.downsampled).toBe(false);
      return output;
    });
    expect(outputs[0]!.width).not.toBe(outputs[1]!.width);
    expect(outputs[2]).toMatchObject({ scale: 1, width: 1600, height: 883 });
  });

  it("uses decoded source pixels regardless of the display's pixel density", () => {
    const settings = preset();
    const normal = batchExportResolution(1920, 1080, settings);
    const retina = batchExportResolution(3840, 2160, settings);
    expect(retina.scale).toBeCloseTo(normal.scale * 2);
    expect(retina.downsampled).toBe(false);
  });

  it.each([
    { type: "window-chrome", variant: "macos" },
    { type: "window-chrome", variant: "windows" },
    { type: "device-mockup", variant: "iphone" },
    { type: "device-mockup", variant: "ipad" },
    { type: "device-mockup", variant: "macbook" },
  ] as const)("accounts for $variant frame space before choosing export resolution", (frame) => {
    const settings = preset({ frame });
    const layout = batchLayout(1920, 1080, settings);
    const output = batchExportResolution(1920, 1080, settings);
    expect(output.scale).toBeGreaterThan(batchExportResolution(1920, 1080, preset()).scale);
    expect(layout.imageWidth * output.scale).toBeCloseTo(1920);
    expect(layout.imageHeight * output.scale).toBeCloseTo(1080);
    expect(output.downsampled).toBe(false);
  });

  it("includes inset border space in the source-resolution calculation", () => {
    const settings = preset({ border: { enabled: true, color: "#fff", width: 20 } });
    const layout = batchLayout(1920, 1080, settings);
    const output = batchExportResolution(1920, 1080, settings);
    expect(output.scale).toBeGreaterThan(batchExportResolution(1920, 1080, preset()).scale);
    expect(layout.imageWidth * output.scale).toBeCloseTo(1920);
  });

  it.each(["fixed", "source-ratio"] as const)("preserves source detail after reducing image size in %s mode", (sizeMode) => {
    const full = preset({ sizeMode, imageScale: 100 });
    const smaller = { ...full, imageScale: 50 };
    const output = batchExportResolution(1920, 1080, smaller);
    const layout = batchLayout(1920, 1080, smaller);
    expect(output.scale).toBeCloseTo(batchExportResolution(1920, 1080, full).scale * 2);
    expect(layout.imageWidth * output.scale).toBeCloseTo(1920);
    expect(output.downsampled).toBe(false);
  });

  it("keeps original-size images at exactly 1x including their frame and padding", () => {
    const settings = preset({ sizeMode: "original", frame: { type: "device-mockup", variant: "iphone" } });
    const layout = batchLayout(641, 479, settings);
    expect(batchExportResolution(641, 479, settings)).toEqual({
      scale: 1, width: layout.width, height: layout.height, limited: false, downsampled: false,
    });
  });

  it.each(["auto", 1, 2, 3] as const)("exports exact original pixels and padding regardless of a previous %s multiplier", (exportScale) => {
    for (const [width, height] of [[1600, 900], [900, 1600], [80, 60]]) {
      const settings = preset({ sizeMode: "original", padding: 100, imageScale: 40, position: "bottom-right", exportScale });
      expect(batchExportResolution(width!, height!, settings)).toEqual({
        scale: 1, width: width! + 200, height: height! + 200, limited: false, downsampled: false,
      });
    }
  });

  it("preserves deliberate 1x, 2x, and 3x canvas sizes and flags loss of source pixels", () => {
    for (const exportScale of [1, 2, 3] as const) {
      expect(batchExportResolution(3024, 1736, preset({ exportScale }))).toMatchObject({
        scale: exportScale, width: 1600 * exportScale, height: 883 * exportScale, limited: false,
      });
    }
    expect(batchExportResolution(3024, 1736, preset({ exportScale: 1 })).downsampled).toBe(true);
    expect(batchExportResolution(3024, 1736, preset({ exportScale: 3 })).downsampled).toBe(false);
  });

  it("leaves an oversized manual request intact for the renderer to reject", () => {
    const output = batchExportResolution(4000, 3000, preset({ width: 4000, height: 3000, exportScale: 3 }));
    expect(output).toMatchObject({ scale: 3, width: 12000, height: 9000, limited: false });
    expect(output.width).toBeGreaterThan(MAX_EXPORT_EDGE);
    expect(output.width * output.height).toBeGreaterThan(MAX_EXPORT_PIXELS);
  });

  it("treats settings saved before exportScale existed as auto", () => {
    const settings = preset();
    delete settings.exportScale;
    expect(batchExportResolution(3024, 1736, settings)).toEqual(batchExportResolution(3024, 1736, preset()));
  });

  it.each([[1600, 883], [883, 1600], [8192, 1], [1, 8192], [7999, 3999], [5656, 5656], [100, 100]])(
    "keeps rounded automatic output within limits for a %i × %i canvas", (width, height) => {
      const settings = preset({ width, height, padding: 0, cornerRadius: 0 });
      const output = batchExportResolution(50000, 30000, settings);
      expect(Number.isInteger(output.width)).toBe(true);
      expect(Number.isInteger(output.height)).toBe(true);
      expect(output.width).toBeGreaterThan(0);
      expect(output.height).toBeGreaterThan(0);
      expect(output.width).toBeLessThanOrEqual(MAX_EXPORT_EDGE);
      expect(output.height).toBeLessThanOrEqual(MAX_EXPORT_EDGE);
      expect(output.width * output.height).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
      expect(output).toMatchObject({ limited: true, downsampled: true });
    },
  );

  it.each([[8192, 1000], [8000, 4000]])("does not shrink a valid %i × %i original-size boundary", (width, height) => {
    const settings = preset({ sizeMode: "original", padding: 0 });
    expect(batchExportResolution(width, height, settings)).toEqual({
      scale: 1, width, height, limited: false, downsampled: false,
    });
  });

  it("rejects invalid source or precomputed layout dimensions", () => {
    const settings = preset();
    const layout = batchLayout(1920, 1080, settings);
    expect(() => batchExportResolution(0, 1080, settings)).toThrow("Invalid");
    expect(() => batchExportResolution(NaN, 1080, settings, layout)).toThrow("Invalid");
    expect(() => batchExportResolution(1920, 1080, settings, { ...layout, imageWidth: 0 })).toThrow("Invalid");
  });
});
