import { afterEach, describe, expect, it } from "vitest";
import { useCanvasStore, type CanvasImage } from "../stores/canvas.store";
import { computeImageLayout, IMAGE_LAYOUTS, imagePlacementBounds, type LayoutSpacing } from "./image-layout";
import { imageDisplaySize } from "./image-geometry";

function picture(index: number, width = 1600, height = 1000): CanvasImage {
  return { id: String(index), src: `original-${index}`, x: 960, y: 540, width, height, naturalWidth: width, naturalHeight: height,
    rotation: 0, cornerRadius: 12, flipX: false, flipY: false,
    shadow: { enabled: true, blur: 20, color: "#000", offsetX: 0, offsetY: 10 },
    insetBorder: { enabled: false, width: 8, color: "#fff" } };
}
const initial = useCanvasStore.getState();
afterEach(() => { useCanvasStore.setState(initial); useCanvasStore.temporal.getState().clear(); });

describe("automatic image composition", () => {
  it("keeps every rotated corner and frame within the padding for mixed image sizes", () => {
    for (const { id: kind } of IMAGE_LAYOUTS) {
      for (const spacing of ["compact", "balanced", "airy"] as LayoutSpacing[]) {
        for (const count of [2, 3, 7, 12]) {
          for (const [width, height] of [[1920, 1205], [900, 1600], [1000, 1000]]) {
            const images = Array.from({ length: count }, (_, index) => {
              const image = picture(index, ...([[1600, 1000], [700, 1400], [2500, 800]][index % 3]! as [number, number]));
              if (index % 3 === 0) image.frame = { type: "window-chrome", variant: "macos" };
              if (index % 3 === 1) image.frame = { type: "device-mockup", variant: "iphone" };
              if (index % 3 === 2) image.insetBorder.enabled = true;
              return image;
            });
            const layout = computeImageLayout(images, width!, height!, 48, kind, spacing, "1");
            expect(layout.map((item) => item.id)).toEqual(images.map((item) => item.id));
            layout.forEach((item, index) => {
              const image = images[index]!;
              expect(item.width / item.height).toBeCloseTo(image.width / image.height, 8);
              const bounds = imagePlacementBounds(image, item);
              expect(bounds.x).toBeGreaterThanOrEqual(48 - 0.00001);
              expect(bounds.y).toBeGreaterThanOrEqual(48 - 0.00001);
              expect(bounds.x + bounds.width).toBeLessThanOrEqual(width! - 48 + 0.00001);
              expect(bounds.y + bounds.height).toBeLessThanOrEqual(height! - 48 + 0.00001);
            });
          }
        }
      }
    }
  });
  it("keeps grid, row, column and featured images separate", () => {
    const images = [picture(0), picture(1, 500, 1400), picture(2), picture(3), picture(4)];
    for (const kind of ["grid", "horizontal", "vertical", "featured"] as const) {
      const result = computeImageLayout(images, 1920, 1080, 64, kind);
      const boxes = result.map((item, index) => imagePlacementBounds(images[index]!, item));
      for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
        const a = boxes[i]!, b = boxes[j]!;
        expect(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y).toBe(true);
      }
    }
  });
  it("makes a gentle symmetric fan and shrinks the old oversized composition", () => {
    const images = [picture(0), picture(1), picture(2)];
    const result = computeImageLayout(images, 1920, 1080, 64, "fan");
    expect(result.map((item) => item.rotation)).toEqual([-14, 0, 14]);
    expect(result[0]!.x + result[2]!.x).toBeCloseTo(1920);
    expect(result[0]!.y).toBeCloseTo(result[2]!.y);
    expect(result[1]!.y).toBeLessThan(result[0]!.y);
    expect(result.every((item) => item.width < 900)).toBe(true);
  });
  it("uses the selected image as the main image", () => {
    const images = [picture(0), picture(1), picture(2)];
    const result = computeImageLayout(images, 1920, 1080, 64, "featured", "balanced", "2");
    expect(result[2]!.width * result[2]!.height).toBeGreaterThan(result[0]!.width * result[0]!.height * 2);
    expect(result[2]!.x).toBeLessThan(result[0]!.x);
  });
  it("increases grid spacing and centers the unfinished final row", () => {
    const images = Array.from({ length: 3 }, (_, i) => picture(i));
    const compact = computeImageLayout(images, 1400, 1200, 64, "grid", "compact");
    const airy = computeImageLayout(images, 1400, 1200, 64, "grid", "airy");
    expect(airy[0]!.width).toBeLessThan(compact[0]!.width);
    expect(airy[2]!.x).toBeCloseTo(700);
  });
  it("handles no images, one image and an impossible canvas", () => {
    expect(computeImageLayout([], 1920, 1080, 64, "fan")).toEqual([]);
    expect(computeImageLayout([picture(0)], 1920, 1080, 64, "fan")[0]).toMatchObject({ x: 960, y: 540, rotation: 0 });
    expect(() => computeImageLayout([picture(0)], 100, 100, 80, "grid")).toThrow("too small");
  });
});

describe("layout editing and undo", () => {
  it("applies all images in one undo step without changing their contents or style", () => {
    const images = [picture(0), picture(1), picture(2)];
    useCanvasStore.setState({ images, selectedId: "1" });
    useCanvasStore.temporal.getState().clear();
    useCanvasStore.getState().applyImageLayout("fan", "balanced");
    const arranged = useCanvasStore.getState().images;
    expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(1);
    arranged.forEach((image, index) => {
      expect(image.src).toBe(images[index]!.src);
      expect(image.shadow).toEqual(images[index]!.shadow);
      expect(imageDisplaySize(image, 1920, 1080, 64)).toEqual({ width: image.width, height: image.height });
    });
    useCanvasStore.temporal.getState().undo();
    expect(useCanvasStore.getState().images).toEqual(images);
    useCanvasStore.temporal.getState().redo();
    expect(useCanvasStore.getState().images).toEqual(arranged);
  });
  it("does not drift or add undo steps when the same layout is applied repeatedly", () => {
    for (const { id } of IMAGE_LAYOUTS) {
      useCanvasStore.setState({ images: [picture(0), picture(1, 700, 1300), picture(2)], selectedId: "1" });
      useCanvasStore.temporal.getState().clear();
      useCanvasStore.getState().applyImageLayout(id, "balanced");
      const first = useCanvasStore.getState().images;
      useCanvasStore.getState().applyImageLayout(id, "balanced");
      expect(useCanvasStore.getState().images).toBe(first);
      expect(useCanvasStore.temporal.getState().pastStates).toHaveLength(1);
    }
  });
});
