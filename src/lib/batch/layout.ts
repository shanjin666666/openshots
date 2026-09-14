import type { CanvasBackground, CanvasImage } from "../../stores/canvas.store";
import { DEVICE_MOCKUP_FRAMES, WINDOW_CHROME_FRAMES } from "../../components/composition/frames";
import { imageFrameSize } from "../image-geometry";
import type { ExportScale } from "../export-resolution";
import { sourceCanvasSize } from "../aspectRatios";

export type BatchPosition = "top-left" | "top" | "top-right" | "left" | "center" | "right" | "bottom-left" | "bottom" | "bottom-right";
export const BATCH_POSITIONS: BatchPosition[] = ["top-left", "top", "top-right", "left", "center", "right", "bottom-left", "bottom", "bottom-right"];
export const POSITION_LABELS: Record<BatchPosition, string> = {
  "top-left": "Top left", top: "Top", "top-right": "Top right", left: "Left", center: "Center", right: "Right",
  "bottom-left": "Bottom left", bottom: "Bottom", "bottom-right": "Bottom right",
};
export interface BatchSettings {
  sizeMode: "original" | "source-ratio" | "fixed";
  width: number;
  height: number;
  padding: number;
  position: BatchPosition;
  imageScale: number;
  background: CanvasBackground;
  cornerRadius: number;
  shadow: CanvasImage["shadow"];
  border: CanvasImage["insetBorder"];
  frame?: CanvasImage["frame"];
  format: "png" | "jpeg";
  exportScale?: ExportScale;
}

export const DEFAULT_BATCH_SETTINGS: BatchSettings = {
  sizeMode: "original", width: 1920, height: 1080, padding: 64, position: "center", imageScale: 100,
  background: { type: "linear-gradient", color: "#0f172a", gradientColors: ["#667eea", "#764ba2"], gradientAngle: 135, imageSrc: null, blur: 0, grain: 0 },
  cornerRadius: 16,
  shadow: { enabled: true, color: "rgba(0,0,0,0.3)", blur: 24, offsetX: 0, offsetY: 10 },
  border: { enabled: false, color: "#ffffff", width: 1 },
  format: "png",
  exportScale: "auto",
};

function frameBounds(imageWidth: number, imageHeight: number, settings: BatchSettings) {
  const frame = imageFrameSize({ frame: settings.frame, insetBorder: settings.border }, imageWidth, imageHeight);
  const variant = settings.frame?.variant;
  const device = settings.frame?.type === "device-mockup" && (variant === "iphone" || variant === "ipad" || variant === "macbook")
    ? DEVICE_MOCKUP_FRAMES[variant] : undefined;
  const chrome = settings.frame?.type === "window-chrome" && (variant === "macos" || variant === "windows")
    ? WINDOW_CHROME_FRAMES[variant] : undefined;
  // DeviceMockup draws a fractional body around rounded screen offsets. Include
  // both bounds so even a device aligned against the canvas edge stays inside.
  const bodyWidth = device ? imageWidth / (1 - device.screenInset.left - device.screenInset.right) : frame.width;
  const bodyHeight = device ? imageHeight / (1 - device.screenInset.top - device.screenInset.bottom) : frame.height;
  // Fractional device ratios can produce 1000.0000000000001 for a 1000 px
  // body. Remove arithmetic noise before allocating its enclosing pixel box.
  const stableExtent = (value: number) => Math.abs(value - Math.round(value)) < 1e-9 ? Math.round(value) : value;
  const outerWidth = stableExtent(Math.max(frame.width, bodyWidth));
  const outerHeight = stableExtent(Math.max(frame.height, bodyHeight));
  const border = !device && !chrome && settings.border.enabled ? settings.border.width : 0;
  const radius = device ? 0 : Math.min(settings.cornerRadius, imageWidth / 2, imageHeight / 2);
  return {
    outerWidth, outerHeight, border, radius,
    chromeHeight: frame.chromeHeight, deviceInsets: frame.deviceInsets,
    contentX: frame.deviceInsets?.left ?? (chrome ? 0 : border),
    contentY: frame.deviceInsets?.top ?? (chrome ? frame.chromeHeight : border),
    outerRadius: Math.min(device?.bezelRadius ?? chrome?.borderRadius ?? radius + border, outerWidth / 2, outerHeight / 2),
  };
}

export function batchLayout(sourceWidth: number, sourceHeight: number, settings: BatchSettings) {
  const fixedPadding = settings.sizeMode === "original";
  const padding = fixedPadding ? Math.round(settings.padding) : settings.padding;
  const imageScale = fixedPadding ? 100 : settings.imageScale;
  const position = fixedPadding ? "center" : settings.position;
  if (![sourceWidth, sourceHeight, settings.width, settings.height, padding, imageScale, settings.cornerRadius, settings.border.width].every(Number.isFinite)
      || sourceWidth <= 0 || sourceHeight <= 0 || padding < 0 || padding > 1024 || imageScale < 10 || imageScale > 100
      || settings.cornerRadius < 0 || settings.border.width < 0 || !BATCH_POSITIONS.includes(position)) {
    throw new Error("Invalid batch dimensions");
  }
  const original = frameBounds(sourceWidth, sourceHeight, settings);
  const emptyFrame = frameBounds(0, 0, settings);
  // Keep padding inside the matching-ratio canvas. Small uploads need a larger
  // logical canvas so the requested padding and frame still leave image space.
  const sourceCanvas = settings.sizeMode === "source-ratio"
    ? sourceCanvasSize(sourceWidth, sourceHeight, Math.max(100, padding * 4,
      padding * 2 + emptyFrame.outerWidth + 100, padding * 2 + emptyFrame.outerHeight + 100)) : null;
  if (settings.sizeMode === "source-ratio" && !sourceCanvas) throw new Error("Invalid batch dimensions");
  const width = settings.sizeMode === "original" ? Math.ceil(original.outerWidth + padding * 2) : sourceCanvas?.width ?? Math.round(settings.width);
  const height = settings.sizeMode === "original" ? Math.ceil(original.outerHeight + padding * 2) : sourceCanvas?.height ?? Math.round(settings.height);
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  if (innerWidth <= emptyFrame.outerWidth || innerHeight <= emptyFrame.outerHeight) throw new Error("Canvas is too small for this padding");
  if (width > 8192 || height > 8192 || width * height > 32_000_000) throw new Error("Output exceeds the 32 megapixel or 8192 px limit");
  let fit = 1;
  if (settings.sizeMode !== "original") {
    if (!original.deviceInsets) {
      fit = Math.min((innerWidth - emptyFrame.outerWidth) / sourceWidth, (innerHeight - emptyFrame.outerHeight) / sourceHeight);
    } else {
      // Insets are rounded in the editor. Solve against those same bounds rather
      // than fitting the content first and letting its frame overflow afterwards.
      let low = 0;
      let high = Math.min(innerWidth / sourceWidth, innerHeight / sourceHeight);
      for (let i = 0; i < 52; i++) {
        const candidate = (low + high) / 2;
        const bounds = frameBounds(sourceWidth * candidate, sourceHeight * candidate, settings);
        if (bounds.outerWidth <= innerWidth && bounds.outerHeight <= innerHeight) low = candidate;
        else high = candidate;
      }
      fit = low;
    }
  }
  fit *= imageScale / 100;
  const imageWidth = sourceWidth * fit;
  const imageHeight = sourceHeight * fit;
  const frame = frameBounds(imageWidth, imageHeight, settings);
  const alignX = position.includes("left") ? 0 : position.includes("right") ? 1 : 0.5;
  const alignY = position.includes("top") ? 0 : position.includes("bottom") ? 1 : 0.5;
  // At original size, fractional device bodies must not shift the screenshot
  // onto half-pixels and soften its otherwise unchanged source pixels.
  const placementWidth = settings.sizeMode === "original" ? Math.ceil(frame.outerWidth) : frame.outerWidth;
  const placementHeight = settings.sizeMode === "original" ? Math.ceil(frame.outerHeight) : frame.outerHeight;
  return {
    width, height, imageWidth, imageHeight, ...frame,
    x: padding + Math.max(0, innerWidth - placementWidth) * alignX,
    y: padding + Math.max(0, innerHeight - placementHeight) * alignY,
  };
}

export type BatchLayout = ReturnType<typeof batchLayout>;
