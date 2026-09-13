import Konva from "konva";
import { backgroundGradient } from "../background-gradient";
import { backgroundImageCrop } from "../background-image";
import { drawShadowOnly } from "../shadow-render";
import { batchLayout, type BatchSettings } from "./layout";
import { createBatchFrame } from "./frames";
import { batchExportResolution } from "./resolution";
import { MAX_EXPORT_EDGE, MAX_EXPORT_PIXELS } from "../export-resolution";
import { clipImageCorners, imageCornerRadii, type CornerRadii } from "../image-corners";

export function loadBatchImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to read this image"));
    image.src = src;
  });
}

/** One image per stage. Preview and export differ only in render resolution. */
export function renderBatchImage(source: HTMLImageElement, settings: BatchSettings, backgroundImage: HTMLImageElement | null, previewEdge?: number) {
  const layout = batchLayout(source.naturalWidth, source.naturalHeight, settings);
  const resolution = batchExportResolution(source.naturalWidth, source.naturalHeight, settings, layout);
  if (resolution.width > MAX_EXPORT_EDGE || resolution.height > MAX_EXPORT_EDGE || resolution.width * resolution.height > MAX_EXPORT_PIXELS) {
    throw new Error("Output exceeds the 32 megapixel or 8192 px limit");
  }
  // Render the original source at the output scale; never enlarge a 1x bitmap.
  const ratio = previewEdge ? Math.min(resolution.scale, previewEdge / Math.max(layout.width, layout.height)) : resolution.scale;
  const stage = new Konva.Stage({ container: document.createElement("div"), width: Math.ceil(layout.width * ratio), height: Math.ceil(layout.height * ratio) });
  const layer = new Konva.Layer({ listening: false, scaleX: ratio, scaleY: ratio });
  try {
    stage.add(layer);
    layer.getCanvas().setPixelRatio(1);
    layer.getHitCanvas().setPixelRatio(1);
    const { width, height, imageWidth, imageHeight, border, x, y, radius, outerWidth, outerHeight, outerRadius, contentX, contentY } = layout;
    const corners = imageCornerRadii(settings, imageWidth, imageHeight);
    const shadowCorners: number | CornerRadii = layout.chromeHeight > 0
      ? [outerRadius, outerRadius, corners[2], corners[3]] : outerRadius;
    const bg = settings.background;
    if (settings.format === "jpeg") layer.add(new Konva.Rect({ width, height, fill: "#ffffff" }));
    if (bg.type === "image" && !backgroundImage) throw new Error("Choose a background image first");
    const background = bg.type === "image"
      ? new Konva.Image({ image: backgroundImage!, width, height,
          crop: backgroundImageCrop(backgroundImage!.naturalWidth, backgroundImage!.naturalHeight, width, height) })
      : new Konva.Rect({ width, height, ...(bg.type === "solid" ? { fill: bg.color } : backgroundGradient(bg, width, height)) });
    layer.add(background);
    if (bg.blur > 0) {
      background.cache({ pixelRatio: ratio });
      background.filters([Konva.Filters.Blur]);
      background.blurRadius(bg.blur * ratio);
    }
    const outer = { x, y, width: outerWidth, height: outerHeight, cornerRadius: outerRadius };
    // Cast only the shadow so transparent source pixels remain transparent.
    if (settings.shadow.enabled) {
      layer.add(new Konva.Shape({ x, y, width: outerWidth, height: outerHeight,
        sceneFunc: (ctx) => drawShadowOnly(ctx._context, outerWidth, outerHeight, shadowCorners, settings.shadow),
      }));
    }
    if (border > 0) layer.add(new Konva.Rect({ ...outer, fill: settings.border.color }));
    const frame = createBatchFrame(settings.frame, imageWidth, imageHeight);
    if (frame) {
      frame.position({ x, y });
      layer.add(frame);
    }
    const group = new Konva.Group({ x: x + contentX, y: y + contentY,
      clipFunc: radius > 0 ? (ctx) => clipImageCorners(ctx, imageWidth, imageHeight, corners) : undefined });
    group.add(new Konva.Image({ image: source, width: imageWidth, height: imageHeight }));
    layer.add(group);
    layer.draw();
    const canvas = stage.toCanvas({ pixelRatio: 1 });
    return { canvas, width: resolution.width, height: resolution.height };
  } finally {
    stage.destroy();
  }
}
