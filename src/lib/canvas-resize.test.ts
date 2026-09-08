import { afterEach, describe, expect, it } from "vitest";
import { useCanvasStore, type CanvasImage } from "../stores/canvas.store";
import { ASPECT_RATIOS, canvasSize } from "./aspectRatios";
import { IMAGE_LAYOUTS, imagePlacementBounds } from "./image-layout";
import { imageDisplaySize } from "./image-geometry";
import { deserializeProject, loadProject, serializeProject } from "./project-file";

const initial = useCanvasStore.getState();
const image = (id: string, width = 1600, height = 1000): CanvasImage => ({
  id, src: `original-${id}`, width, height, naturalWidth: width, naturalHeight: height, x: 960, y: 540,
  rotation: 0, cornerRadius: 12, flipX: false, flipY: false,
  shadow: { enabled: true, color: "#000", blur: 20, offsetX: 0, offsetY: 10 },
  insetBorder: { enabled: false, color: "#fff", width: 8 },
});
afterEach(() => { useCanvasStore.setState(initial); useCanvasStore.temporal.getState().clear(); });

function expectInside() {
  const state = useCanvasStore.getState();
  for (const picture of state.images) {
    const displayed = imageDisplaySize(picture, state.canvasWidth, state.canvasHeight, state.padding);
    const bounds = imagePlacementBounds(picture, { ...picture, ...displayed });
    expect(picture.width).toBeGreaterThan(0);
    expect(picture.height).toBeGreaterThan(0);
    expect(bounds.x).toBeGreaterThanOrEqual(state.padding - 0.00001);
    expect(bounds.y).toBeGreaterThanOrEqual(state.padding - 0.00001);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(state.canvasWidth - state.padding + 0.00001);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(state.canvasHeight - state.padding + 0.00001);
  }
}

describe("automatic canvas resizing", () => {
  it("fits an oversized, off-center and rotated image including its frame at every preset ratio", () => {
    const picture = { ...image("one"), x: -400, y: 2400, rotation: 37, userResized: true,
      frame: { type: "window-chrome" as const, variant: "macos" } };
    useCanvasStore.setState({ images: [picture], imageLayout: null });
    for (const preset of ASPECT_RATIOS) {
      const { width, height } = canvasSize(preset);
      // Start from a different size so every preset runs through the resize action.
      useCanvasStore.getState().setCanvasSize(1500, 1000);
      useCanvasStore.getState().setCanvasSize(width, height);
      expectInside();
      expect(useCanvasStore.getState().images[0]!.rotation).toBe(37);
      expect(useCanvasStore.getState().images[0]!.width / useCanvasStore.getState().images[0]!.height).toBeCloseTo(1.6, 8);
      expect(useCanvasStore.getState().images[0]!.src).toBe(picture.src);
    }
  });
  it("fits images that were using the automatic display size before the resize", () => {
    useCanvasStore.setState({ images: [image("one")], imageLayout: null });
    useCanvasStore.getState().setCanvasSize(1080, 1920);
    expectInside();
    expect(useCanvasStore.getState().images[0]).toMatchObject({ x: 540, y: 960, userResized: true });
  });
  it("recomputes each chosen layout on portrait, square and wide canvases", () => {
    for (const { id } of IMAGE_LAYOUTS) {
      const pictures = [image("a"), image("b", 800, 1600), image("c"), image("d", 2400, 700)];
      pictures[1]!.frame = { type: "device-mockup", variant: "iphone" };
      useCanvasStore.setState({ images: pictures, selectedId: "c", imageLayout: null });
      useCanvasStore.getState().applyImageLayout(id, "airy");
      for (const preset of ASPECT_RATIOS) {
        const { width, height } = canvasSize(preset);
        useCanvasStore.getState().setCanvasSize(width, height);
        expectInside();
        expect(useCanvasStore.getState().imageLayout).toMatchObject({ kind: id, spacing: "airy" });
        if (id === "featured") expect(useCanvasStore.getState().imageLayout?.featuredId).toBe("c");
      }
    }
  });
  it("adapts the grid's columns to the new canvas instead of just shrinking the old grid", () => {
    useCanvasStore.setState({ images: [image("a", 1000, 1000), image("b", 1000, 1000)], imageLayout: null });
    useCanvasStore.getState().applyImageLayout("grid", "balanced");
    const landscape = useCanvasStore.getState().images;
    expect(landscape[0]!.y).toBeCloseTo(landscape[1]!.y);
    useCanvasStore.getState().setCanvasSize(1080, 1920);
    const portrait = useCanvasStore.getState().images;
    expect(portrait[0]!.x).toBeCloseTo(portrait[1]!.x);
    expect(portrait[0]!.y).toBeLessThan(portrait[1]!.y);
    expectInside();
  });
  it("preserves a manually edited composition and does not accumulate shrinkage", () => {
    const pictures = [{ ...image("a"), x: 460, y: 330, width: 500, height: 300, rotation: -12, userResized: true },
      { ...image("b"), x: 1240, y: 770, width: 600, height: 400, rotation: 17, userResized: true }];
    useCanvasStore.setState({ images: pictures, imageLayout: null });
    useCanvasStore.getState().setCanvasSize(1600, 1000);
    const before = useCanvasStore.getState().images;
    for (const [width, height] of [[1080, 1920], [1080, 1080], [1920, 823], [1600, 1000]]) {
      useCanvasStore.getState().setCanvasSize(width!, height!);
      expectInside();
    }
    useCanvasStore.getState().images.forEach((picture, index) => {
      for (const key of ["x", "y", "width", "height", "rotation"] as const) expect(picture[key]).toBeCloseTo(before[index]![key], 5);
    });
  });
  it("makes manual dragging override the automatic layout, and undo restores that layout", () => {
    useCanvasStore.setState({ images: [image("a"), image("b")], imageLayout: null });
    useCanvasStore.getState().applyImageLayout("fan", "balanced");
    useCanvasStore.getState().updateImage("a", { x: 500 });
    expect(useCanvasStore.getState().imageLayout).toBeNull();
    useCanvasStore.temporal.getState().undo();
    expect(useCanvasStore.getState().imageLayout?.kind).toBe("fan");
  });
  it("undoes the canvas dimensions, layout, padding and all image changes together", () => {
    useCanvasStore.setState({ images: [image("a"), image("b")], imageLayout: null });
    useCanvasStore.getState().applyImageLayout("grid", "compact");
    const before = serializeProject();
    useCanvasStore.temporal.getState().clear();
    useCanvasStore.getState().setCanvasSize(1080, 1920);
    const after = serializeProject();
    expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(1);
    useCanvasStore.temporal.getState().undo();
    expect(serializeProject().canvas).toEqual(before.canvas);
    expect(serializeProject().images).toEqual(before.images);
    useCanvasStore.temporal.getState().redo();
    expect(serializeProject().canvas).toEqual(after.canvas);
    expect(serializeProject().images).toEqual(after.images);
  });
  it("keeps custom tiny canvases safe even with large padding and borders", () => {
    const picture = image("a"); picture.insetBorder = { enabled: true, width: 100, color: "#fff" };
    picture.frame = { type: "window-chrome", variant: "windows" }; picture.rotation = 45;
    useCanvasStore.setState({ images: [picture], padding: 200, imageLayout: null });
    useCanvasStore.getState().setCanvasSize(100, 100);
    expectInside();
    useCanvasStore.getState().setPadding(500);
    expectInside();
  });
  it("updates padding on already arranged images and ignores repeated or invalid sizes", () => {
    useCanvasStore.setState({ images: [image("a"), image("b")], imageLayout: null });
    useCanvasStore.getState().applyImageLayout("grid", "balanced");
    useCanvasStore.getState().setPadding(200);
    expectInside();
    useCanvasStore.temporal.getState().clear();
    const state = useCanvasStore.getState();
    state.setCanvasSize(state.canvasWidth, state.canvasHeight);
    state.setCanvasSize(NaN, Infinity);
    expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(0);
  });
});

describe("saved layout compatibility", () => {
  it("restores layout choices from a saved project and uses them on the next resize", () => {
    useCanvasStore.setState({ images: [image("a"), image("b")], imageLayout: null, selectedId: "b" });
    useCanvasStore.getState().applyImageLayout("featured", "compact");
    const saved = JSON.stringify(serializeProject());
    useCanvasStore.setState({ imageLayout: null });
    loadProject(deserializeProject(saved), "/tmp/layout-roundtrip.openshots");
    useCanvasStore.getState().setCanvasSize(1080, 1920);
    expect(useCanvasStore.getState().imageLayout).toEqual({ kind: "featured", spacing: "compact", featuredId: "b" });
    expectInside();
  });
  it("opens old projects and ignores unsupported layout metadata", () => {
    const saved = serializeProject();
    delete saved.canvas.imageLayout;
    loadProject(deserializeProject(JSON.stringify(saved)), "/tmp/old-layout.openshots");
    expect(useCanvasStore.getState().imageLayout).toBeNull();
    const invalid = { ...saved, canvas: { ...saved.canvas, imageLayout: { kind: "unknown", spacing: "airy" } } };
    loadProject(deserializeProject(JSON.stringify(invalid)), "/tmp/future-layout.openshots");
    expect(useCanvasStore.getState().imageLayout).toBeNull();
  });
});
