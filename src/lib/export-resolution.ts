import type { CanvasState } from "../stores/canvas.store";
import { imageDisplaySize } from "./image-geometry";

export type ExportScale = "auto" | 1 | 2 | 3;
export const MAX_EXPORT_EDGE = 8192;
export const MAX_EXPORT_PIXELS = 32_000_000;
export type ExportResolution = ReturnType<typeof editorExportResolution>;

/** Keep the composition, increasing output pixels to match the placed source images. */
export function editorExportResolution(state: Pick<CanvasState, "images" | "canvasWidth" | "canvasHeight" | "padding">, choice: ExportScale = "auto") {
  const { images, canvasWidth, canvasHeight, padding } = state;
  let sourceScale = 1;
  for (const image of images) {
    const display = imageDisplaySize(image, canvasWidth, canvasHeight, padding);
    const ratio = Math.max((image.naturalWidth || image.width) / display.width, (image.naturalHeight || image.height) / display.height);
    if (Number.isFinite(ratio)) sourceScale = Math.max(sourceScale, ratio);
  }
  const maxScale = Math.min(MAX_EXPORT_EDGE / canvasWidth, MAX_EXPORT_EDGE / canvasHeight,
    Math.sqrt(MAX_EXPORT_PIXELS / (canvasWidth * canvasHeight)));
  let scale = choice === "auto" ? Math.min(sourceScale, maxScale) : choice;
  const width = Math.ceil(canvasWidth * scale), height = Math.ceil(canvasHeight * scale);
  if (choice === "auto" && (width > MAX_EXPORT_EDGE || height > MAX_EXPORT_EDGE || width * height > MAX_EXPORT_PIXELS)) {
    // Keep rounding to whole pixels within the memory budget.
    scale = Math.min((width - 1) / canvasWidth, (height - 1) / canvasHeight);
  }
  return {
    scale, width: Math.ceil(canvasWidth * scale), height: Math.ceil(canvasHeight * scale),
    limited: choice === "auto" && scale < sourceScale,
    downsampled: scale + 0.0001 < sourceScale,
  };
}
