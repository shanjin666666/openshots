import type Konva from "konva";
import { exportStageCanvas } from "./export-stage";
import { MAX_EXPORT_EDGE, MAX_EXPORT_PIXELS, type ExportResolution } from "./export-resolution";

export function renderEditorExport(stage: Konva.Stage, output: ExportResolution, whiteBackground = false) {
  const { width, height, scale } = output;
  const pixelRatio = scale / stage.scaleX();
  if (![width, height, pixelRatio].every((value) => Number.isFinite(value) && value > 0)
    || width > MAX_EXPORT_EDGE || height > MAX_EXPORT_EDGE || width * height > MAX_EXPORT_PIXELS) {
    throw new Error("Output exceeds the 32 megapixel or 8192 px limit");
  }
  const canvas = exportStageCanvas(stage, {
    pixelRatio,
    // Canvas dimensions truncate floats. An epsilon prevents a missing edge
    // pixel at fractional editor zooms without resampling the completed image.
    x: 0, y: 0, width: (width + 0.000001) / pixelRatio, height: (height + 0.000001) / pixelRatio,
  });
  if (whiteBackground) {
    const ctx = canvas.getContext("2d")!;
    ctx.save(); ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height); ctx.restore();
  }
  return canvas;
}

export function editorExportPixels(stage: Konva.Stage, output: ExportResolution, whiteBackground: boolean) {
  const canvas = renderEditorExport(stage, output, whiteBackground);
  try { return canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height); }
  finally { canvas.width = 0; canvas.height = 0; }
}

export function editorExportPng(stage: Konva.Stage, output: ExportResolution) {
  const canvas = renderEditorExport(stage, output);
  try { return canvas.toDataURL("image/png"); }
  finally { canvas.width = 0; canvas.height = 0; }
}
