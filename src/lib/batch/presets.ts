import type { CanvasState } from "../../stores/canvas.store";
import type { CanvasPreset } from "../../stores/preset.store";
import { createCanvasPreset, presetCanvasGeometry, presetImageStyle } from "../canvas-presets";
import type { BatchSettings } from "./layout";

export const EDITOR_STYLE_KEY = "editor";

/** A style preset owns the size behavior, independently of the previous batch mode. */
export function batchSettingsFromPreset(preset: Omit<CanvasPreset, "id">, current: BatchSettings): Partial<BatchSettings> {
  const { canvasWidth: width, canvasHeight: height, padding } = presetCanvasGeometry(preset);
  const style = presetImageStyle(preset, { insetBorder: current.border });
  const fixedPadding = preset.canvasSizeMode === "padding";
  const borderLimit = fixedPadding ? style.insetBorder.width : Math.min(width - padding * 2, height - padding * 2) / 8;
  return {
    sizeMode: fixedPadding ? "original" : "fixed", width, height, padding, position: "center", imageScale: 100,
    background: structuredClone(preset.background), cornerRadius: style.cornerRadius,
    shadow: style.shadow,
    border: { ...style.insetBorder, width: style.insetBorder.enabled ? Math.min(style.insetBorder.width, borderLimit) : style.insetBorder.width },
    frame: preset.frame === undefined ? current.frame : style.frame,
  };
}

export function batchSettingsFromEditor(editor: CanvasState, current: BatchSettings): Partial<BatchSettings> {
  return batchSettingsFromPreset(createCanvasPreset(editor, ""), current);
}
