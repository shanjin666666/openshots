import { describe, expect, it } from "vitest";
import { batchLayout, BATCH_POSITIONS, DEFAULT_BATCH_SETTINGS, type BatchSettings } from "./layout";
import { imageFrameSize } from "../image-geometry";
import { DEVICE_MOCKUP_FRAMES } from "../../components/composition/frames";
import { batchExportResolution } from "./resolution";

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

const frames: NonNullable<BatchSettings["frame"]>[] = [
  { type: "window-chrome", variant: "macos", theme: "light" },
  { type: "window-chrome", variant: "windows", theme: "dark" },
  { type: "device-mockup", variant: "iphone" },
  { type: "device-mockup", variant: "ipad" },
  { type: "device-mockup", variant: "macbook" },
];

describe("batch source aspect ratio", () => {
  it("uses each upload's own canvas proportions and keeps padding inside", () => {
    const config: BatchSettings = { ...settings(), sizeMode: "source-ratio", width: 1600, height: 883, padding: 30 };
    for (const [width, height] of [[1920, 1080], [900, 1600], [1200, 1200], [4000, 1000]]) {
      const layout = batchLayout(width!, height!, config);
      expect(layout.width).toBe(width);
      expect(layout.height).toBe(height);
      expect(layout.width / layout.height).toBeCloseTo(width! / height!);
      expect(layout.imageWidth / layout.imageHeight).toBeCloseTo(width! / height!);
      expect(layout.x).toBeGreaterThanOrEqual(30);
      expect(layout.y).toBeGreaterThanOrEqual(30);
      expect(layout.x + layout.outerWidth).toBeLessThanOrEqual(width! - 30 + 1e-9);
      expect(layout.y + layout.outerHeight).toBeLessThanOrEqual(height! - 30 + 1e-9);
    }
    expect(config).toMatchObject({ sizeMode: "source-ratio", width: 1600, height: 883 });
  });

  it("scales large source canvases uniformly while automatic export retains their source detail", () => {
    const config: BatchSettings = { ...settings(), sizeMode: "source-ratio", padding: 30 };
    const layout = batchLayout(6000, 3000, config);
    expect(layout).toMatchObject({ width: 4000, height: 2000 });
    const resolution = batchExportResolution(6000, 3000, config, layout);
    expect(resolution.limited).toBe(false);
    expect(resolution.downsampled).toBe(false);
    expect(layout.imageWidth * resolution.scale).toBeCloseTo(6000);
    expect(layout.imageHeight * resolution.scale).toBeCloseTo(3000);
    expect(resolution.width / resolution.height).toBeCloseTo(2, 3);
    expect(batchExportResolution(6000, 3000, { ...config, exportScale: 1 }, layout))
      .toMatchObject({ width: 4000, height: 2000, downsampled: true });
  });

  it.each(frames)("fits the entire $variant frame at all nine positions without changing the source ratio", (frame) => {
    for (const [sourceWidth, sourceHeight] of [[1920, 1080], [1080, 1920], [501, 501]]) {
      for (const position of BATCH_POSITIONS) {
        const config: BatchSettings = { ...settings(), sizeMode: "source-ratio", frame, padding: 11, position,
          imageScale: 70, border: { enabled: true, width: 13, color: "#fff" } };
        const layout = batchLayout(sourceWidth!, sourceHeight!, config);
        expect(layout.width / layout.height).toBeCloseTo(sourceWidth! / sourceHeight!);
        expect(layout.imageWidth / layout.imageHeight).toBeCloseTo(sourceWidth! / sourceHeight!);
        expect(layout.x).toBeGreaterThanOrEqual(11);
        expect(layout.y).toBeGreaterThanOrEqual(11);
        expect(layout.x + layout.outerWidth).toBeLessThanOrEqual(layout.width - 11 + 1e-9);
        expect(layout.y + layout.outerHeight).toBeLessThanOrEqual(layout.height - 11 + 1e-9);
        if (position.includes("left")) expect(layout.x).toBe(11);
        if (position.includes("right")) expect(layout.x + layout.outerWidth).toBeCloseTo(layout.width - 11);
        if (position.includes("top")) expect(layout.y).toBe(11);
        if (position.includes("bottom")) expect(layout.y + layout.outerHeight).toBeCloseTo(layout.height - 11);
      }
    }
  });

  it("expands small canvases proportionally to make room for padding and frame", () => {
    const config: BatchSettings = { ...settings(), sizeMode: "source-ratio", frame: frames[0] };
    const layout = batchLayout(80, 60, config);
    expect(layout.width / layout.height).toBeCloseTo(4 / 3, 2);
    expect(layout.imageWidth).toBeGreaterThan(0);
    expect(layout.imageHeight).toBeGreaterThan(0);
    expect(layout.x).toBeGreaterThanOrEqual(config.padding);
    expect(layout.y).toBeGreaterThanOrEqual(config.padding);
    expect(layout.x + layout.outerWidth).toBeLessThanOrEqual(layout.width - config.padding + 1e-9);
    expect(layout.y + layout.outerHeight).toBeLessThanOrEqual(layout.height - config.padding + 1e-9);
    expect(config.padding).toBe(64);
  });

  it("reports source ratios that cannot fit the supported bounds instead of stretching the source", () => {
    const config: BatchSettings = { ...settings(), sizeMode: "source-ratio" };
    expect(() => batchLayout(100000, 1, config)).toThrow("Invalid batch dimensions");
    expect(() => batchLayout(4000, 100, { ...config, padding: 1024 })).toThrow("Invalid batch dimensions");
    expect(() => batchLayout(0, 1080, config)).toThrow("Invalid batch dimensions");
  });
});

describe("batch frames", () => {
  it.each(frames)("preserves source pixels with $variant and grows the original-size canvas", (frame) => {
    const config = { ...settings(), frame, border: { enabled: true, width: 8, color: "#ff0000" } };
    for (const position of BATCH_POSITIONS) {
      const layout = batchLayout(641, 479, { ...config, position });
      const editorFrame = imageFrameSize({ frame, insetBorder: config.border }, 641, 479);
      expect(layout.imageWidth).toBe(641);
      expect(layout.imageHeight).toBe(479);
      expect(layout.outerWidth).toBeGreaterThanOrEqual(editorFrame.width);
      expect(layout.outerHeight).toBeGreaterThanOrEqual(editorFrame.height);
      expect(layout.width).toBe(Math.ceil(layout.outerWidth + 128));
      expect(layout.height).toBe(Math.ceil(layout.outerHeight + 128));
      expect(Number.isInteger(layout.x + layout.contentX)).toBe(true);
      expect(Number.isInteger(layout.y + layout.contentY)).toBe(true);
      expect(layout.x + layout.outerWidth).toBeLessThanOrEqual(layout.width - 64);
      expect(layout.y + layout.outerHeight).toBeLessThanOrEqual(layout.height - 64);
    }
  });

  it.each(frames)("keeps the entire $variant frame inside fixed canvases at all nine positions", (frame) => {
    for (const [sourceWidth, sourceHeight] of [[4000, 1000], [600, 2400], [501, 501]]) {
      for (const position of BATCH_POSITIONS) {
        for (const imageScale of [100, 70, 10]) {
          const config = { ...settings(), frame, sizeMode: "fixed" as const, width: 809, height: 607, padding: 11,
            border: { enabled: true, width: 13, color: "#ffffff" }, position, imageScale };
          const layout = batchLayout(sourceWidth!, sourceHeight!, config);
          expect(layout.imageWidth / layout.imageHeight).toBeCloseTo(sourceWidth! / sourceHeight!);
          expect(layout.x).toBeGreaterThanOrEqual(11);
          expect(layout.y).toBeGreaterThanOrEqual(11);
          expect(layout.x + layout.outerWidth).toBeLessThanOrEqual(798 + 1e-9);
          expect(layout.y + layout.outerHeight).toBeLessThanOrEqual(596 + 1e-9);
          expect(layout.contentX + layout.imageWidth).toBeLessThanOrEqual(layout.outerWidth);
          expect(layout.contentY + layout.imageHeight).toBeLessThanOrEqual(layout.outerHeight);
          if (position.includes("left")) expect(layout.x).toBe(11);
          if (position.includes("right")) expect(layout.x + layout.outerWidth).toBeCloseTo(798);
          if (position.includes("top")) expect(layout.y).toBe(11);
          if (position.includes("bottom")) expect(layout.y + layout.outerHeight).toBeCloseTo(596);
        }
      }
    }
  });

  it("matches device offsets and ignores inset borders and image corner rounding inside device screens", () => {
    for (const frame of frames.filter((candidate) => candidate.type === "device-mockup")) {
      const config = { ...settings(), frame, cornerRadius: 99, border: { enabled: true, width: 40, color: "#ff0000" } };
      const layout = batchLayout(641, 479, config);
      const withoutBorder = batchLayout(641, 479, { ...config, border: { ...config.border, enabled: false } });
      const device = DEVICE_MOCKUP_FRAMES[frame.variant as keyof typeof DEVICE_MOCKUP_FRAMES];
      expect(layout).toEqual(withoutBorder);
      expect(layout.radius).toBe(0);
      expect(layout.outerRadius).toBe(device.bezelRadius);
      expect(layout.contentX).toBe(Math.round(641 / (1 - device.screenInset.left - device.screenInset.right) * device.screenInset.left));
      expect(layout.contentY).toBe(Math.round(479 / (1 - device.screenInset.top - device.screenInset.bottom) * device.screenInset.top));
    }
  });

  it("reserves fixed title-bar height while resizing the screenshot content", () => {
    const layout = batchLayout(400, 200, { ...settings(), frame: frames[0], sizeMode: "fixed", width: 400, height: 200, padding: 0 });
    expect(layout.chromeHeight).toBe(28);
    expect(layout.imageWidth).toBe(344);
    expect(layout.imageHeight).toBe(172);
    expect(layout.contentY).toBe(28);
    expect(layout.outerHeight).toBe(200);
  });

  it("checks output limits after adding frames and rejects a canvas smaller than its title bar", () => {
    expect(() => batchLayout(8192, 100, { ...settings(), padding: 0 })).not.toThrow();
    expect(() => batchLayout(8192, 100, { ...settings(), padding: 0, frame: frames[2] })).toThrow("limit");
    expect(() => batchLayout(8000, 4000, { ...settings(), padding: 0, frame: frames[0] })).toThrow("limit");
    expect(() => batchLayout(200, 100, { ...settings(), sizeMode: "fixed", width: 200, height: 32, padding: 0, frame: frames[1] })).toThrow("padding");
    expect(() => batchLayout(200, 100, { ...settings(), sizeMode: "fixed", width: 200, height: 48, padding: 0, frame: frames[1], border: { enabled: true, width: 8, color: "#fff" } })).toThrow("padding");
  });
});
