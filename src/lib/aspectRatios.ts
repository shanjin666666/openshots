import type { CanvasImage } from "../stores/canvas.store";

export interface AspectRatioPreset {
  label: string;
  ratio: number; // width / height
  width: number;
  height: number;
}

export const ASPECT_RATIOS: AspectRatioPreset[] = [
  { label: "16:9", ratio: 16 / 9, width: 1920, height: 1080 },
  { label: "1:1", ratio: 1, width: 1080, height: 1080 },
  { label: "9:16", ratio: 9 / 16, width: 1080, height: 1920 },
  { label: "4:3", ratio: 4 / 3, width: 1600, height: 1200 },
  { label: "3:2", ratio: 3 / 2, width: 1800, height: 1200 },
  { label: "21:9", ratio: 21 / 9, width: 2520, height: 1080 },
];

export function canvasSize(
  preset: AspectRatioPreset,
  maxDimension = 1920,
): { width: number; height: number } {
  if (preset.width <= maxDimension && preset.height <= maxDimension) {
    return { width: preset.width, height: preset.height };
  }
  if (preset.ratio >= 1) {
    return { width: maxDimension, height: Math.round(maxDimension / preset.ratio) };
  }
  return { width: Math.round(maxDimension * preset.ratio), height: maxDimension };
}

/** Keep the source ratio while fitting the supported composition dimensions. */
export function sourceCanvasSize(sourceWidth: number, sourceHeight: number, minDimension = 100): { width: number; height: number } | null {
  if (![sourceWidth, sourceHeight, minDimension].every((value) => Number.isFinite(value) && value > 0)) return null;
  const longest = Math.max(sourceWidth, sourceHeight), shortest = Math.min(sourceWidth, sourceHeight);
  const scale = Math.max(Math.min(1, 4000 / longest), minDimension / shortest);
  const width = Math.round(sourceWidth * scale), height = Math.round(sourceHeight * scale);
  if (width > 8192 || height > 8192 || width * height > 32_000_000) return null;
  return { width, height };
}

export function selectedSourceCanvasSize(images: CanvasImage[], selectedId: string | null) {
  const source = images.find((image) => image.id === selectedId) ?? images[0];
  if (!source) return null;
  // Old projects may have display dimensions only. Never mix a partial pair.
  const hasOriginalSize = Number.isFinite(source.naturalWidth) && source.naturalWidth! > 0
    && Number.isFinite(source.naturalHeight) && source.naturalHeight! > 0;
  return sourceCanvasSize(hasOriginalSize ? source.naturalWidth! : source.width, hasOriginalSize ? source.naturalHeight! : source.height);
}
