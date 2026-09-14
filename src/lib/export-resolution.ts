import type { CanvasState } from "../stores/canvas.store";
import { imageDisplaySize } from "./image-geometry";

export type ExportScale = "auto" | 1 | 2 | 3;
export const MAX_EXPORT_EDGE = 8192;
export const MAX_EXPORT_PIXELS = 32_000_000;
export type ExportResolution = ReturnType<typeof exportResolution>;

/** Resolve composition pixels independently of editor or batch placement. */
export function exportResolution(canvasWidth: number, canvasHeight: number, sourceScale: number, choice: ExportScale = "auto") {
  const maxScale = Math.min(MAX_EXPORT_EDGE / canvasWidth, MAX_EXPORT_EDGE / canvasHeight,
    Math.sqrt(MAX_EXPORT_PIXELS / (canvasWidth * canvasHeight)));
  let scale = choice === "auto" ? Math.min(sourceScale, maxScale) : choice;
  const fits = (candidate: number) => {
    const width = Math.ceil(canvasWidth * candidate), height = Math.ceil(canvasHeight * candidate);
    return width <= MAX_EXPORT_EDGE && height <= MAX_EXPORT_EDGE && width * height <= MAX_EXPORT_PIXELS;
  };
  if (choice === "auto" && !fits(scale)) {
    // The continuous limit can round up past the pixel budget. Find the largest
    // scale whose actual integer dimensions fit, including extreme aspect ratios.
    let low = 0, high = scale;
    for (let i = 0; i < 64; i++) {
      const candidate = (low + high) / 2;
      if (fits(candidate)) low = candidate;
      else high = candidate;
    }
    scale = low;
  }
  return {
    scale, width: Math.ceil(canvasWidth * scale), height: Math.ceil(canvasHeight * scale),
    limited: choice === "auto" && scale < sourceScale,
    downsampled: scale + 0.0001 < sourceScale,
  };
}

/** Keep the composition, increasing output pixels to match the placed source images. */
export function editorExportResolution(state: Pick<CanvasState, "images" | "canvasWidth" | "canvasHeight" | "padding" | "canvasSizeMode">, choice: ExportScale = "auto") {
  const { images, canvasWidth, canvasHeight, padding } = state;
  let sourceScale = 1;
  for (const image of images) {
    const display = imageDisplaySize(image, canvasWidth, canvasHeight, padding);
    const ratio = Math.max((image.naturalWidth || image.width) / display.width, (image.naturalHeight || image.height) / display.height);
    if (Number.isFinite(ratio)) sourceScale = Math.max(sourceScale, ratio);
  }
  return exportResolution(canvasWidth, canvasHeight, sourceScale, state.canvasSizeMode === "padding" ? 1 : choice);
}
