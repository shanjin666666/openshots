import { describe, expect, it } from "vitest";
import type { CanvasImage } from "../stores/canvas.store";
import { imageDisplaySize } from "./image-geometry";
import { editorExportResolution, MAX_EXPORT_EDGE, MAX_EXPORT_PIXELS } from "./export-resolution";

const photo = (width: number, height: number): CanvasImage => ({
  id: "photo", src: "original.png", x: 800, y: 459.5, width, height, naturalWidth: width, naturalHeight: height,
  rotation: 0, cornerRadius: 12, flipX: false, flipY: false,
  shadow: { enabled: true, color: "black", blur: 20, offsetX: 0, offsetY: 10 },
  insetBorder: { enabled: false, color: "white", width: 8 },
});
const scene = (image = photo(3024, 1736)) => ({ images: [image], canvasWidth: 1600, canvasHeight: 919, padding: 40 });

describe("editor export resolution", () => {
  it("preserves the resolution of an image fitted into a smaller preset canvas", () => {
    const state = scene();
    const output = editorExportResolution(state);
    const display = imageDisplaySize(state.images[0]!, 1600, 919, 40);
    expect(display.width * output.scale).toBeGreaterThanOrEqual(3024);
    expect(display.height * output.scale).toBeGreaterThanOrEqual(1736);
    expect(output.width).toBeGreaterThan(3024);
    expect(output.limited).toBe(false);
    expect(output.downsampled).toBe(false);
    expect(state.canvasWidth).toBe(1600);
  });

  it("retains deliberate 1x, 2x and 3x sizes and identifies loss of detail", () => {
    const state = scene();
    for (const scale of [1, 2, 3] as const) {
      expect(editorExportResolution(state, scale)).toMatchObject({ scale, width: 1600 * scale, height: 919 * scale });
    }
    expect(editorExportResolution(state, 1).downsampled).toBe(true);
    expect(editorExportResolution(state, 3).downsampled).toBe(false);
  });

  it("accounts for manual placement and the highest-resolution image in a composition", () => {
    const small = { ...photo(3000, 1800), width: 750, height: 450, userResized: true, rotation: 15 };
    const state = { ...scene(), images: [photo(400, 200), small] };
    expect(editorExportResolution(state)).toMatchObject({ scale: 4, width: 6400, height: 3676 });
  });

  it("uses at least the canvas resolution for smaller sources and image-free artwork", () => {
    expect(editorExportResolution(scene(photo(400, 200))).scale).toBe(1);
    expect(editorExportResolution({ ...scene(), images: [] }).scale).toBe(1);
  });

  it("bounds auto output memory and explicitly reports when source detail cannot fit", () => {
    const state = scene({ ...photo(12000, 10000), width: 100, height: 80, userResized: true });
    const output = editorExportResolution(state);
    expect(output.width).toBeLessThanOrEqual(MAX_EXPORT_EDGE);
    expect(output.height).toBeLessThanOrEqual(MAX_EXPORT_EDGE);
    expect(output.width * output.height).toBeLessThanOrEqual(MAX_EXPORT_PIXELS);
    expect(output.limited).toBe(true);
    expect(output.downsampled).toBe(true);
  });

  it("supports legacy projects without natural dimensions", () => {
    const image = photo(3024, 1736);
    delete image.naturalWidth; delete image.naturalHeight;
    expect(editorExportResolution(scene(image))).toEqual(editorExportResolution(scene()));
  });

  it("keeps valid canvas sizes at the exact output limit unchanged", () => {
    expect(editorExportResolution({ ...scene(), images: [], canvasWidth: 8192, canvasHeight: 1000 })).toMatchObject({ scale: 1, width: 8192, height: 1000, limited: false });
  });
});
