import type { CanvasBackground, CanvasImage } from "../../stores/canvas.store";

export type BatchPosition = "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right";
export const BATCH_POSITIONS: BatchPosition[] = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"];
export const POSITION_LABELS: Record<BatchPosition, string> = {
  "top-left": "Top left", top: "Top", "top-right": "Top right", left: "Left", center: "Center", right: "Right",
  "bottom-left": "Bottom left", bottom: "Bottom", "bottom-right": "Bottom right",
};
export interface BatchSettings {
  sizeMode: "original" | "fixed";
  width: number;
  height: number;
  padding: number;
  position: BatchPosition;
  imageScale: number;
  background: CanvasBackground;
  cornerRadius: number;
  shadow: CanvasImage["shadow"];
  border: CanvasImage["insetBorder"];
  format: "png" | "jpeg";
}

export const DEFAULT_BATCH_SETTINGS: BatchSettings = {
  sizeMode: "original", width: 1920, height: 1080, padding: 64, position: "center", imageScale: 100,
  background: { type: "linear-gradient", color: "#0f172a", gradientColors: ["#667eea", "#764ba2"], gradientAngle: 135, imageSrc: null, blur: 0, grain: 0 },
  cornerRadius: 16,
  shadow: { enabled: true, color: "rgba(0,0,0,0.3)", blur: 24, offsetX: 0, offsetY: 10 },
  border: { enabled: false, color: "#ffffff", width: 1 },
  format: "png",
};

export function batchLayout(sourceWidth: number, sourceHeight: number, settings: BatchSettings) {
  const { padding, imageScale, position } = settings;
  if (![sourceWidth, sourceHeight, settings.width, settings.height, padding, imageScale, settings.cornerRadius, settings.border.width].every(Number.isFinite)
      || sourceWidth <= 0 || sourceHeight <= 0 || padding < 0 || padding > 1024 || imageScale < 10 || imageScale > 100
      || settings.cornerRadius < 0 || settings.border.width < 0 || !BATCH_POSITIONS.includes(position)) {
    throw new Error("Invalid batch dimensions");
  }
  const border = settings.border.enabled ? settings.border.width : 0;
  const width = Math.round(settings.sizeMode === "original" ? sourceWidth + 2 * (padding + border) : settings.width);
  const height = Math.round(settings.sizeMode === "original" ? sourceHeight + 2 * (padding + border) : settings.height);
  if (width <= 2 * (padding + border) || height <= 2 * (padding + border)) throw new Error("Canvas is too small for this padding");
  if (width > 8192 || height > 8192 || width * height > 32_000_000) throw new Error("Output exceeds the 32 megapixel or 8192 px limit");
  const fit = Math.min((width - 2 * (padding + border)) / sourceWidth, (height - 2 * (padding + border)) / sourceHeight) * imageScale / 100;
  const imageWidth = sourceWidth * fit;
  const imageHeight = sourceHeight * fit;
  const outerWidth = imageWidth + border * 2;
  const outerHeight = imageHeight + border * 2;
  const alignX = position.includes("left") ? 0 : position.includes("right") ? 1 : 0.5;
  const alignY = position.includes("top") ? 0 : position.includes("bottom") ? 1 : 0.5;
  return {
    width, height, imageWidth, imageHeight, border,
    x: padding + (width - 2 * padding - outerWidth) * alignX,
    y: padding + (height - 2 * padding - outerHeight) * alignY,
    radius: Math.min(settings.cornerRadius, imageWidth / 2, imageHeight / 2),
  };
}
