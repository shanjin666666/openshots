import { exportResolution } from "../export-resolution";
import { batchLayout, type BatchLayout, type BatchSettings } from "./layout";

/** Preserve the placed source's pixels without changing the preset composition. */
export function batchExportResolution(sourceWidth: number, sourceHeight: number, settings: BatchSettings,
  layout: BatchLayout = batchLayout(sourceWidth, sourceHeight, settings)) {
  if (![sourceWidth, sourceHeight, layout.width, layout.height, layout.imageWidth, layout.imageHeight]
    .every((value) => Number.isFinite(value) && value > 0)) throw new Error("Invalid batch dimensions");
  const sourceScale = Math.max(1, sourceWidth / layout.imageWidth, sourceHeight / layout.imageHeight);
  return exportResolution(layout.width, layout.height, sourceScale, settings.exportScale ?? "auto");
}
