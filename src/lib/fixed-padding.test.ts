import { afterEach, describe, expect, it } from "vitest";
import { useCanvasStore, type CanvasImage } from "../stores/canvas.store";
import { fixedPaddingCanvas } from "./fixed-padding";
import { imageDisplaySize, imageFrameSize } from "./image-geometry";
import { editorExportResolution } from "./export-resolution";
import { DEVICE_MOCKUP_FRAMES } from "../components/composition/frames";

const initial = useCanvasStore.getState();
const photo = (width = 1600, height = 900): CanvasImage => ({ id: "source", src: "original.png",
  width: width / 2, height: height / 2, naturalWidth: width, naturalHeight: height, x: 500, y: 325,
  rotation: 0, userResized: true, cornerRadius: 12, flipX: false, flipY: false,
  shadow: { enabled: true, color: "black", blur: 20, offsetX: 0, offsetY: 10 },
  insetBorder: { enabled: false, color: "white", width: 8 } });
const scene = (image = photo()) => ({ ...initial, images: [image], canvasWidth: 1000, canvasHeight: 650,
  annotations: [], privacyRegions: [] });
afterEach(() => { useCanvasStore.setState(initial); useCanvasStore.temporal.getState().clear(); });

describe("fixed pixel canvas expansion", () => {
  it.each([[1600, 900, 100], [900, 1600, 100], [37, 21, 1000], [10, 10, 0], [6000, 1000, 100]])(
    "keeps %i x %i original pixels with %i pixels on every side", (width, height, padding) => {
      const state = scene(photo(width, height));
      const expanded = { ...state, ...fixedPaddingCanvas(state, padding)! };
      expect(expanded.canvasWidth).toBe(width + padding * 2);
      expect(expanded.canvasHeight).toBe(height + padding * 2);
      const image = expanded.images[0]!;
      expect(imageDisplaySize(image, expanded.canvasWidth, expanded.canvasHeight, padding)).toEqual({ width, height });
      expect(image.x - width / 2).toBe(padding);
      expect(image.y - height / 2).toBe(padding);
      for (const choice of ["auto", 1, 2, 3] as const) {
        expect(editorExportResolution(expanded, choice)).toMatchObject({ width: width + padding * 2, height: height + padding * 2, scale: 1 });
      }
    });

  it("updates padding from the source, without cumulative expansion, and supports undo", () => {
    useCanvasStore.setState(scene()); useCanvasStore.temporal.getState().clear();
    const before = useCanvasStore.getState();
    expect(before.setFixedPadding(100)).toBe(true);
    useCanvasStore.getState().setPadding(150);
    expect(useCanvasStore.getState()).toMatchObject({ canvasWidth: 1900, canvasHeight: 1200, padding: 150 });
    useCanvasStore.temporal.getState().undo();
    expect(useCanvasStore.getState()).toMatchObject({ canvasWidth: 1800, canvasHeight: 1100, padding: 100 });
    useCanvasStore.temporal.getState().undo();
    expect(useCanvasStore.getState().images).toEqual(before.images);
    expect(useCanvasStore.getState().canvasSizeMode).toBe(before.canvasSizeMode);
  });

  it("keeps privacy regions and annotations anchored while restoring native resolution", () => {
    const state = scene();
    useCanvasStore.setState({ ...state,
      annotations: [{ id: "arrow", type: "arrow", x: 150, y: 150, rotation: 0, points: [0, 0, 25, 25], stroke: "red", strokeWidth: 2, curvature: 0 }],
      privacyRegions: [{ id: "mask", type: "pixelate", x: 150, y: 150, width: 20, height: 10, intensity: 10, opacity: 1, fill: "black" }] });
    useCanvasStore.getState().setFixedPadding(100);
    expect(useCanvasStore.getState().privacyRegions[0]).toMatchObject({ x: 200, y: 200, width: 40, height: 20 });
    expect(useCanvasStore.getState().annotations[0]).toMatchObject({ x: 200, y: 200, points: [0, 0, 50, 50], strokeWidth: 4 });
    useCanvasStore.getState().setPadding(150);
    expect(useCanvasStore.getState().privacyRegions[0]).toMatchObject({ x: 250, y: 250, width: 40, height: 20 });
  });

  it("recomputes around window chrome and restores inset borders when the frame is removed", () => {
    useCanvasStore.setState(scene()); useCanvasStore.getState().setFixedPadding(100);
    useCanvasStore.getState().updateImage("source", { frame: { type: "window-chrome", variant: "macos" }, insetBorder: { enabled: true, width: 8, color: "white" } });
    let state = useCanvasStore.getState(), frame = imageFrameSize(state.images[0]!, 1600, 900);
    expect(state.canvasWidth).toBe(1800);
    expect(state.canvasHeight).toBe(frame.height + 200);
    expect(state.images[0]!.x - frame.width / 2).toBe(100);
    expect(state.images[0]!.y - frame.height / 2).toBe(100);
    state.updateImage("source", { frame: undefined });
    state = useCanvasStore.getState();
    expect(state).toMatchObject({ canvasWidth: 1816, canvasHeight: 1116, canvasSizeMode: "padding" });
  });

  it("anchors fractional device frames to whole source pixels", () => {
    const source = { ...photo(800, 450), frame: { type: "device-mockup" as const, variant: "ipad" } };
    const expanded = fixedPaddingCanvas(scene(source), 64)!;
    const frame = imageFrameSize(expanded.images![0]!, 800, 450);
    const contentX = expanded.images![0]!.x - frame.width / 2 + frame.deviceInsets!.left;
    const contentY = expanded.images![0]!.y - frame.height / 2 + frame.deviceInsets!.top;
    expect(Number.isInteger(contentX)).toBe(true);
    expect(Number.isInteger(contentY)).toBe(true);
    expect(expanded.canvasWidth).toBe(1017);
  });

  it("encloses the complete rotated device body before adding equal pixel margins", () => {
    for (const variant of ["iphone", "ipad", "macbook"] as const) {
      for (const rotation of [27, 90, 180, 270, -90]) {
        const source = { ...photo(800, 450), rotation, frame: { type: "device-mockup" as const, variant } };
        const expanded = fixedPaddingCanvas(scene(source), 100)!;
        const image = expanded.images![0]!, frame = imageFrameSize(image, image.width, image.height);
        const insets = DEVICE_MOCKUP_FRAMES[variant].screenInset;
        const width = Math.max(frame.width, image.width / (1 - insets.left - insets.right));
        const height = Math.max(frame.height, image.height / (1 - insets.top - insets.bottom));
        const cos = Math.cos(rotation * Math.PI / 180), sin = Math.sin(rotation * Math.PI / 180);
        const point = (x: number, y: number) => ({
          x: image.x + (x - frame.width / 2) * cos - (y - frame.height / 2) * sin,
          y: image.y + (x - frame.width / 2) * sin + (y - frame.height / 2) * cos,
        });
        const corners = [point(0, 0), point(width, 0), point(0, height), point(width, height)];
        for (const corner of corners) {
          expect(corner.x).toBeGreaterThanOrEqual(100 - 1e-8);
          expect(corner.y).toBeGreaterThanOrEqual(100 - 1e-8);
          expect(corner.x).toBeLessThanOrEqual(expanded.canvasWidth! - 100 + 1e-8);
          expect(corner.y).toBeLessThanOrEqual(expanded.canvasHeight! - 100 + 1e-8);
        }
        expect(image.rotation).toBe(rotation);
        if (rotation % 90 === 0) {
          const content = point(frame.deviceInsets!.left, frame.deviceInsets!.top);
          expect(content.x).toBeCloseTo(Math.round(content.x), 8);
          expect(content.y).toBeCloseTo(Math.round(content.y), 8);
        }
      }
    }
  });

  it("keeps crop overlays attached to the cropped source instead of shrinking them", () => {
    useCanvasStore.setState(scene(photo(1000, 1000))); useCanvasStore.getState().setFixedPadding(64);
    useCanvasStore.setState({ privacyRegions: [{ id: "mask", type: "blur", x: 364, y: 364, width: 20, height: 20, intensity: 20, opacity: 1, fill: "black" }] });
    useCanvasStore.getState().updateImage("source", { src: "crop.png", naturalWidth: 400, naturalHeight: 400,
      x: 464, y: 464, width: 400, height: 400 });
    expect(useCanvasStore.getState()).toMatchObject({ canvasWidth: 528, canvasHeight: 528, canvasSizeMode: "padding" });
    expect(useCanvasStore.getState().privacyRegions[0]).toMatchObject({ x: 164, y: 164, width: 20, height: 20 });
  });

  it("can be selected before uploading, and manual composition changes leave exact padding mode", () => {
    useCanvasStore.setState({ ...initial, images: [] });
    useCanvasStore.getState().setFixedPadding(100);
    useCanvasStore.getState().addImage(photo());
    expect(useCanvasStore.getState()).toMatchObject({ canvasWidth: 1800, canvasHeight: 1100, canvasSizeMode: "padding" });
    useCanvasStore.getState().setCanvasSize(1800, 1100);
    expect(useCanvasStore.getState().canvasSizeMode).toBe("fixed");
    useCanvasStore.getState().setFixedPadding(100);
    useCanvasStore.getState().updateImage("source", { x: 300 });
    expect(useCanvasStore.getState().canvasSizeMode).toBe("fixed");
    useCanvasStore.getState().setFixedPadding(100);
    useCanvasStore.getState().addImage({ ...photo(), id: "second" });
    expect(useCanvasStore.getState().canvasSizeMode).toBe("fixed");
  });

  it("rejects unsupported expansion without changing the image, padding, or undo history", () => {
    useCanvasStore.setState(scene(photo(8100, 4000))); useCanvasStore.temporal.getState().clear();
    const before = useCanvasStore.getState();
    expect(before.setFixedPadding(100)).toBe(false);
    expect(useCanvasStore.getState()).toBe(before);
    expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(0);
    for (const padding of [-1, NaN, Infinity, 1025]) expect(fixedPaddingCanvas(scene(), padding)).toBeNull();
  });
});
