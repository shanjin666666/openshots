import { afterEach, describe, expect, it } from "vitest";
import { useCanvasStore, type CanvasImage } from "../stores/canvas.store";
import { createCanvasPreset, applyCanvasPreset } from "./canvas-presets";
import { DEFAULT_PRESETS } from "./default-presets";
import { imageDisplaySize } from "./image-geometry";
import { imagePlacementBounds } from "./image-layout";

const initial = useCanvasStore.getState();
const picture = (id: string): CanvasImage => ({
  id, src: `source-${id}`, x: 500, y: 400, width: 500, height: 300,
  naturalWidth: 2000, naturalHeight: 1200, userResized: true,
  rotation: 13, flipX: true, flipY: false, cornerRadius: 28,
  shadow: { enabled: true, color: "#182345", blur: 37, offsetX: -7, offsetY: 21 },
  insetBorder: { enabled: true, color: "#abc123", width: 11 },
  frame: { type: "window-chrome", variant: "macos", theme: "dark" },
});
afterEach(() => { useCanvasStore.setState(initial); useCanvasStore.temporal.getState().clear(); });

describe("reusable canvas style presets", () => {
  it("captures the selected image's complete style without keeping its source or sharing nested state", () => {
    const first = { ...picture("first"), cornerRadius: 4 };
    const selected = picture("selected");
    const background = { ...initial.background, gradientColors: ["#ff0000", "#00ff00"] as [string, string], blur: 3, grain: 6 };
    useCanvasStore.setState({ images: [first, selected], selectedId: selected.id, background, padding: 35 });
    const preset = createCanvasPreset(useCanvasStore.getState(), "  午后圆角  ");
    expect(preset).toMatchObject({ name: "午后圆角", padding: 35, cornerRadius: 28,
      shadowColor: "#182345", shadowBlur: 37, shadowOffsetX: -7, shadowOffsetY: 21,
      insetBorderColor: "#abc123", insetBorderWidth: 11, frame: selected.frame, background });
    expect(JSON.stringify(preset)).not.toContain("source-selected");
    background.gradientColors[0] = "#000000";
    selected.frame!.theme = "light";
    expect(preset.background.gradientColors[0]).toBe("#ff0000");
    expect(preset.frame?.theme).toBe("dark");
    expect(createCanvasPreset({ ...useCanvasStore.getState(), selectedId: null }, "fallback").cornerRadius).toBe(4);
  });

  it("applies all appearance settings to new source images and restores the whole change with one undo", () => {
    const source = picture("saved");
    const preset = createCanvasPreset({ ...initial, images: [source], selectedId: source.id,
      canvasWidth: 1080, canvasHeight: 1920, padding: 72 }, "portrait");
    const targets = [picture("new-a"), { ...picture("new-b"), x: 1300, rotation: -8 }];
    useCanvasStore.setState({ images: targets, selectedId: "new-b", imageLayout: null });
    const before = useCanvasStore.getState();
    useCanvasStore.temporal.getState().clear();
    applyCanvasPreset(preset);
    const after = useCanvasStore.getState();
    expect(after).toMatchObject({ canvasWidth: 1080, canvasHeight: 1920, padding: 72, selectedId: "new-b" });
    after.images.forEach((image, index) => {
      expect(image).toMatchObject({ src: targets[index]!.src, naturalWidth: 2000, naturalHeight: 1200,
        rotation: targets[index]!.rotation, flipX: true, cornerRadius: 28,
        shadow: source.shadow, insetBorder: source.insetBorder, frame: source.frame });
      const displayed = imageDisplaySize(image, after.canvasWidth, after.canvasHeight, after.padding);
      const bounds = imagePlacementBounds(image, { ...image, ...displayed });
      expect(bounds.x).toBeGreaterThanOrEqual(after.padding - 1e-5);
      expect(bounds.y).toBeGreaterThanOrEqual(after.padding - 1e-5);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(after.canvasWidth - after.padding + 1e-5);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(after.canvasHeight - after.padding + 1e-5);
    });
    expect(after.images[0]!.frame).not.toBe(after.images[1]!.frame);
    expect(after.images[0]!.frame).not.toBe(preset.frame);
    expect(after.background).not.toBe(preset.background);
    expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(1);
    useCanvasStore.temporal.getState().undo();
    expect(useCanvasStore.getState()).toMatchObject({ canvasWidth: before.canvasWidth,
      canvasHeight: before.canvasHeight, padding: before.padding, background: before.background, images: before.images });
    useCanvasStore.temporal.getState().redo();
    expect(useCanvasStore.getState().images).toEqual(after.images);
  });

  it("distinguishes explicitly saved no-frame styles from legacy presets that did not store frames", () => {
    const target = picture("target");
    useCanvasStore.setState({ images: [target], imageLayout: null });
    applyCanvasPreset(DEFAULT_PRESETS[0]!);
    expect(useCanvasStore.getState().images[0]).toMatchObject({ frame: target.frame,
      shadow: { color: "rgba(0,0,0,0.3)", offsetX: 0 }, insetBorder: { color: target.insetBorder.color } });
    const noFrame = createCanvasPreset({ ...useCanvasStore.getState(), images: [{ ...target, frame: undefined }] }, "plain");
    expect(noFrame.frame).toBeNull();
    applyCanvasPreset(noFrame);
    expect(useCanvasStore.getState().images[0]!.frame).toBeUndefined();
  });

  it("retains manual placement for style-only changes and refits newly added frame geometry", () => {
    const target = { ...picture("target"), width: 900, height: 700, x: 500, y: 400,
      rotation: 0, insetBorder: { enabled: false, color: "#fff", width: 0 }, frame: undefined };
    useCanvasStore.setState({ images: [target], canvasWidth: 1000, canvasHeight: 800, padding: 50, imageLayout: null });
    const preset = createCanvasPreset(useCanvasStore.getState(), "style");
    applyCanvasPreset({ ...preset, cornerRadius: 40 });
    expect(useCanvasStore.getState().images[0]).toMatchObject({ x: 500, y: 400, width: 900, height: 700 });
    applyCanvasPreset({ ...preset, frame: { type: "device-mockup", variant: "iphone" } });
    const image = useCanvasStore.getState().images[0]!;
    const bounds = imagePlacementBounds(image, image);
    expect(bounds.x).toBeGreaterThanOrEqual(50 - 1e-5);
    expect(bounds.y).toBeGreaterThanOrEqual(50 - 1e-5);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(950 + 1e-5);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(750 + 1e-5);
  });
});
