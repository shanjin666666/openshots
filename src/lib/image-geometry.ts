import type { CanvasImage } from "../stores/canvas.store";
import { DEVICE_MOCKUP_FRAMES, WINDOW_CHROME_FRAMES } from "../components/composition/frames";

export function imageDisplaySize(image: CanvasImage, canvasWidth: number, canvasHeight: number, padding: number) {
  if (image.userResized) return { width: image.width, height: image.height };
  const scale = Math.min(Math.max(canvasWidth - padding * 2, 100) / image.width, Math.max(canvasHeight - padding * 2, 100) / image.height);
  return { width: Math.round(image.width * scale), height: Math.round(image.height * scale) };
}

/** Shared by the renderer and layout bounds, including the frame's fixed-size parts. */
export function imageFrameSize(image: Pick<CanvasImage, "frame" | "insetBorder">, width: number, height: number) {
  const variant = image.frame?.variant;
  let chromeHeight = 0;
  let deviceInsets: { top: number; right: number; bottom: number; left: number } | null = null;
  if (image.frame?.type === "window-chrome" && (variant === "macos" || variant === "windows")) {
    chromeHeight = WINDOW_CHROME_FRAMES[variant].titleBarHeight;
  }
  if (image.frame?.type === "device-mockup" && (variant === "iphone" || variant === "ipad" || variant === "macbook")) {
    const inset = DEVICE_MOCKUP_FRAMES[variant].screenInset;
    const totalWidth = width / (1 - inset.left - inset.right);
    const totalHeight = height / (1 - inset.top - inset.bottom);
    deviceInsets = {
      left: Math.round(totalWidth * inset.left), right: Math.round(totalWidth * inset.right),
      top: Math.round(totalHeight * inset.top), bottom: Math.round(totalHeight * inset.bottom),
    };
  }
  const border = image.insetBorder.enabled ? image.insetBorder.width : 0;
  return {
    chromeHeight, deviceInsets,
    width: width + (deviceInsets ? deviceInsets.left + deviceInsets.right : border * 2),
    height: height + (deviceInsets ? deviceInsets.top + deviceInsets.bottom : border * 2 + chromeHeight),
  };
}
