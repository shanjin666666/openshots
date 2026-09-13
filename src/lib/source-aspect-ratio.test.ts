import { afterEach, describe, expect, it } from "vitest";
import { selectedSourceCanvasSize, sourceCanvasSize } from "./aspectRatios";
import { useCanvasStore, type CanvasImage } from "../stores/canvas.store";
import { imageDisplaySize } from "./image-geometry";
import { imagePlacementBounds } from "./image-layout";

const initial = useCanvasStore.getState();
const image = (id: string, naturalWidth: number, naturalHeight: number): CanvasImage => ({
  id, src: `source-${id}`, naturalWidth, naturalHeight, width: 400, height: 400, x: -300, y: 3000,
  userResized: true, rotation: 27, cornerRadius: 12, flipX: false, flipY: false,
  shadow: { enabled: true, color: "#000", blur: 20, offsetX: 0, offsetY: 10 },
  insetBorder: { enabled: false, color: "#fff", width: 1 },
});
afterEach(() => { useCanvasStore.setState(initial); useCanvasStore.temporal.getState().clear(); });

describe("source aspect ratio", () => {
  it.each([[2054, 1142], [1170, 1404], [1024, 1024]])("uses the original %i × %i proportions", (width, height) => {
    expect(sourceCanvasSize(width, height)).toEqual({ width, height });
  });
  it("scales large and small sources proportionally within canvas limits", () => {
    expect(sourceCanvasSize(12000, 6000)).toEqual({ width: 4000, height: 2000 });
    expect(sourceCanvasSize(20, 10)).toEqual({ width: 200, height: 100 });
    expect(sourceCanvasSize(20, 10, 256)).toEqual({ width: 512, height: 256 });
    expect(sourceCanvasSize(100, 4000)).toEqual({ width: 100, height: 4000 });
    expect(sourceCanvasSize(1, 10000)).toBeNull();
    expect(sourceCanvasSize(NaN, 100)).toBeNull();
    expect(sourceCanvasSize(100, 0)).toBeNull();
  });
  it("uses the selected source's original pixels and falls back to the first source", () => {
    const pictures = [image("landscape", 2054, 1142), image("portrait", 1170, 1404)];
    expect(selectedSourceCanvasSize(pictures, "portrait")).toEqual({ width: 1170, height: 1404 });
    expect(selectedSourceCanvasSize(pictures, null)).toEqual({ width: 2054, height: 1142 });
    expect(selectedSourceCanvasSize(pictures, "annotation-id")).toEqual({ width: 2054, height: 1142 });
    expect(selectedSourceCanvasSize([], null)).toBeNull();
  });
  it("supports old projects without an original dimensions pair", () => {
    const old = image("legacy", 1920, 1080); delete old.naturalHeight;
    old.width = 500; old.height = 750;
    expect(selectedSourceCanvasSize([old], null)).toEqual({ width: 500, height: 750 });
  });
  it("fits the whole composition and frame in one undoable resize without changing source data", () => {
    const pictures = [image("landscape", 2054, 1142), image("portrait", 1170, 1404)];
    pictures[1]!.frame = { type: "window-chrome", variant: "macos" };
    useCanvasStore.setState({ images: pictures, selectedId: "portrait", imageLayout: null });
    useCanvasStore.temporal.getState().clear();
    const before = useCanvasStore.getState();
    const size = selectedSourceCanvasSize(before.images, before.selectedId)!;
    before.setCanvasSize(size.width, size.height);
    const after = useCanvasStore.getState();
    expect(after.canvasWidth / after.canvasHeight).toBeCloseTo(1170 / 1404);
    for (const picture of after.images) {
      const display = imageDisplaySize(picture, after.canvasWidth, after.canvasHeight, after.padding);
      const bounds = imagePlacementBounds(picture, { ...picture, ...display });
      expect(bounds.x).toBeGreaterThanOrEqual(after.padding - 1e-8);
      expect(bounds.y).toBeGreaterThanOrEqual(after.padding - 1e-8);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(after.canvasWidth - after.padding + 1e-8);
      expect(bounds.y + bounds.height).toBeLessThanOrEqual(after.canvasHeight - after.padding + 1e-8);
      expect(picture.src).toBe(`source-${picture.id}`);
    }
    expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(1);
    useCanvasStore.temporal.getState().undo();
    expect(useCanvasStore.getState().images).toEqual(before.images);
    expect(useCanvasStore.getState().canvasWidth).toBe(before.canvasWidth);
    expect(useCanvasStore.getState().canvasHeight).toBe(before.canvasHeight);
  });
});
