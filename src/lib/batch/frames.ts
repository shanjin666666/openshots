import Konva from "konva";
import { DEVICE_MOCKUP_FRAMES, WINDOW_CHROME_FRAMES } from "../../components/composition/frames";
import type { BatchSettings } from "./layout";

/** Same frame artwork and dimensions as the single-image editor. */
export function createBatchFrame(frame: BatchSettings["frame"], width: number, height: number): Konva.Group | null {
  const variant = frame?.variant;
  if (frame?.type === "window-chrome" && (variant === "macos" || variant === "windows")) {
    const config = WINDOW_CHROME_FRAMES[variant];
    const colors = config.themes[frame.theme ?? "dark"];
    const { titleBarHeight, borderRadius } = config;
    // Keep controls inside extremely narrow windows as well.
    const group = new Konva.Group({ clipX: 0, clipY: 0, clipWidth: width, clipHeight: titleBarHeight + 1 });
    group.add(new Konva.Rect({ width, height: titleBarHeight, fill: colors.bg, cornerRadius: [borderRadius, borderRadius, 0, 0] }));
    group.add(new Konva.Line({ points: [0, titleBarHeight, width, titleBarHeight], stroke: colors.border, strokeWidth: 1 }));
    if (config.trafficLights) {
      ["#ff5f57", "#febc2e", "#28c840"].forEach((fill, index) => {
        group.add(new Konva.Circle({ x: 18 + index * 20, y: titleBarHeight / 2, radius: 6, fill }));
      });
    }
    if (config.controlButtons) {
      group.add(new Konva.Line({ points: [width - 138, titleBarHeight / 2, width - 126, titleBarHeight / 2], stroke: colors.text, strokeWidth: 1 }));
      group.add(new Konva.Rect({ x: width - 96, y: titleBarHeight / 2 - 5, width: 10, height: 10, stroke: colors.text, strokeWidth: 1 }));
      group.add(new Konva.Text({ x: width - 52, y: titleBarHeight / 2 - 7, text: "\u00d7", fontSize: 16, fill: colors.text, fontFamily: "sans-serif" }));
    }
    return group;
  }
  if (frame?.type === "device-mockup" && (variant === "iphone" || variant === "ipad" || variant === "macbook")) {
    const config = DEVICE_MOCKUP_FRAMES[variant];
    const { screenInset, bezelRadius, frameColor } = config;
    const totalWidth = width / (1 - screenInset.left - screenInset.right);
    const totalHeight = height / (1 - screenInset.top - screenInset.bottom);
    const insetLeft = Math.round(totalWidth * screenInset.left);
    const insetTop = Math.round(totalHeight * screenInset.top);
    const group = new Konva.Group();
    group.add(new Konva.Rect({ width: totalWidth, height: totalHeight, fill: frameColor, cornerRadius: bezelRadius }));
    group.add(new Konva.Rect({ x: insetLeft, y: insetTop, width, height, fill: "#000000" }));
    if (config.notch) {
      const notchWidth = Math.round(totalWidth * 0.3);
      group.add(new Konva.Rect({ x: Math.round((totalWidth - notchWidth) / 2), width: notchWidth, height: Math.round(totalHeight * 0.03), fill: frameColor, cornerRadius: [0, 0, 8, 8] }));
    }
    if (variant === "macbook") {
      const chinHeight = Math.round(totalHeight * screenInset.bottom);
      group.add(new Konva.Rect({ y: totalHeight - chinHeight, width: totalWidth, height: chinHeight, fill: frameColor, cornerRadius: [0, 0, bezelRadius, bezelRadius] }));
      group.add(new Konva.Rect({ x: Math.round((totalWidth - 4) / 2), y: Math.round(insetTop * 0.3), width: 4, height: 4, fill: "#555555", cornerRadius: 2 }));
    }
    return group;
  }
  return null;
}
