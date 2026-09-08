import { useCanvasStore, type CanvasImage, type CanvasState } from "../stores/canvas.store";
import type { CanvasPreset } from "../stores/preset.store";
import { resizeCanvasImages } from "./canvas-resize";
import { imageDisplaySize, imageFrameSize } from "./image-geometry";

type PresetSource = Pick<CanvasState, "canvasWidth" | "canvasHeight" | "padding" | "background" | "images" | "selectedId">;
type PresetStyle = Pick<CanvasImage, "cornerRadius" | "shadow" | "insetBorder" | "frame">;

/** Save reusable appearance, independently of the current screenshot contents. */
export function createCanvasPreset(state: PresetSource, name: string): CanvasPreset {
  const image = state.images.find((item) => item.id === state.selectedId) ?? state.images[0];
  return {
    id: crypto.randomUUID(), name: name.trim(),
    canvasWidth: state.canvasWidth, canvasHeight: state.canvasHeight, padding: state.padding,
    background: structuredClone(state.background),
    cornerRadius: image?.cornerRadius ?? 12,
    shadowEnabled: image?.shadow.enabled ?? true,
    shadowColor: image?.shadow.color ?? "rgba(0,0,0,0.3)",
    shadowBlur: image?.shadow.blur ?? 20,
    shadowOffsetX: image?.shadow.offsetX ?? 0,
    shadowOffsetY: image?.shadow.offsetY ?? 10,
    insetBorderEnabled: image?.insetBorder.enabled ?? false,
    insetBorderColor: image?.insetBorder.color ?? "#ffffff",
    insetBorderWidth: image?.insetBorder.width ?? 8,
    frame: image?.frame ? structuredClone(image.frame) : null,
  };
}

/** Missing optional fields retain the behavior of presets saved by older versions. */
export function presetImageStyle(preset: Omit<CanvasPreset, "id">, image?: Pick<CanvasImage, "insetBorder">): PresetStyle {
  return {
    cornerRadius: preset.cornerRadius,
    shadow: {
      enabled: preset.shadowEnabled, color: preset.shadowColor ?? "rgba(0,0,0,0.3)",
      blur: preset.shadowBlur, offsetX: preset.shadowOffsetX ?? 0, offsetY: preset.shadowOffsetY,
    },
    insetBorder: {
      enabled: preset.insetBorderEnabled, color: preset.insetBorderColor ?? image?.insetBorder.color ?? "#ffffff",
      width: preset.insetBorderWidth,
    },
    ...(preset.frame !== undefined ? { frame: preset.frame === null ? undefined : structuredClone(preset.frame) } : {}),
  };
}

/** Apply size and appearance together so one undo restores the entire canvas. */
export function applyCanvasPreset(preset: Omit<CanvasPreset, "id">): void {
  useCanvasStore.setState((state) => {
    const canvasWidth = Math.max(100, Math.round(preset.canvasWidth));
    const canvasHeight = Math.max(100, Math.round(preset.canvasHeight));
    const padding = Math.max(0, Math.min(preset.padding, Math.floor(Math.min(canvasWidth, canvasHeight) / 4)));
    const styledImages = state.images.map((image) => ({ ...image, ...presetImageStyle(preset, image) }));
    const sizeChanged = state.canvasWidth !== canvasWidth || state.canvasHeight !== canvasHeight || state.padding !== padding;
    const frameChanged = styledImages.some((image, index) => {
      const before = state.images[index]!;
      const display = imageDisplaySize(before, state.canvasWidth, state.canvasHeight, state.padding);
      const oldFrame = imageFrameSize(before, display.width, display.height);
      const newFrame = imageFrameSize(image, display.width, display.height);
      return oldFrame.width !== newFrame.width || oldFrame.height !== newFrame.height;
    });
    const images = sizeChanged || frameChanged
      ? resizeCanvasImages(styledImages,
        { width: state.canvasWidth, height: state.canvasHeight, padding: state.padding },
        { width: canvasWidth, height: canvasHeight, padding }, state.imageLayout)
      : styledImages;
    return { canvasWidth, canvasHeight, padding, background: structuredClone(preset.background), images };
  });
}
