import type { CanvasImage } from "../stores/canvas.store";

export type CornerRadii = [number, number, number, number];

/** Top-left, top-right, bottom-right, bottom-left in displayed image coordinates. */
export function imageCornerRadii(image: Pick<CanvasImage, "frame" | "cornerRadius">, width: number, height: number): CornerRadii {
  const radius = Math.max(0, Math.min(image.cornerRadius, width / 2, height / 2));
  if (image.frame?.type === "device-mockup") return [0, 0, 0, 0];
  // The screenshot must meet the title bar across its full width.
  if (image.frame?.type === "window-chrome") return [0, 0, radius, radius];
  return [radius, radius, radius, radius];
}

/** Shared by the editor and batch renderer; image flips stay inside this clip. */
export function clipImageCorners(context: Pick<CanvasRenderingContext2D, "beginPath" | "roundRect" | "closePath">,
  width: number, height: number, corners: CornerRadii) {
  context.beginPath();
  context.roundRect(0, 0, width, height, corners);
  context.closePath();
}
