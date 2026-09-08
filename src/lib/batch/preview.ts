export type BatchPreviewMode = "fit" | "pixels";

/** Match display pixels, capped at the output resolution so small images stay sharp. */
export function batchPreviewSize(width: number, height: number, viewportWidth: number, viewportHeight: number, pixelRatio: number, mode: BatchPreviewMode) {
  const density = Number.isFinite(pixelRatio) && pixelRatio > 0 ? pixelRatio : 1;
  const scale = mode === "pixels" ? 1 / density
    : Math.min(Math.max(1, viewportWidth) / width, Math.max(1, viewportHeight) / height, 1 / density);
  return {
    displayWidth: width * scale,
    displayHeight: height * scale,
    renderEdge: Math.ceil(Math.max(width, height) * Math.min(1, scale * density)),
  };
}
