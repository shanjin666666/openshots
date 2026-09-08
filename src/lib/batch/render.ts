import Konva from "konva";
import { backgroundGradient } from "../background-gradient";
import { backgroundImageCrop } from "../background-image";
import { drawShadowOnly } from "../shadow-render";
import { batchLayout, type BatchSettings } from "./layout";
import { createBatchFrame } from "./frames";

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
  const ratio = previewEdge ? Math.min(1, previewEdge / Math.max(layout.width, layout.height)) : 1;
  const stage = new Konva.Stage({ container: document.createElement("div"), width: Math.round(layout.width * ratio), height: Math.round(layout.height * ratio) });
  const layer = new Konva.Layer({ listening: false, scaleX: ratio, scaleY: ratio });
  try {
    stage.add(layer);
    layer.getCanvas().setPixelRatio(1);
    layer.getHitCanvas().setPixelRatio(1);
    const { width, height, imageWidth, imageHeight, border, x, y, radius, outerWidth, outerHeight, outerRadius, contentX, contentY } = layout;
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
        sceneFunc: (ctx) => drawShadowOnly(ctx._context, outerWidth, outerHeight, outerRadius, settings.shadow),
      }));
    }
    if (border > 0) layer.add(new Konva.Rect({ ...outer, fill: settings.border.color }));
    const frame = createBatchFrame(settings.frame, imageWidth, imageHeight);
    if (frame) {
      frame.position({ x, y });
      layer.add(frame);
    }
    const group = new Konva.Group({ x: x + contentX, y: y + contentY, clipFunc: radius > 0 ? (ctx) => {
      ctx.beginPath();
      ctx.moveTo(radius, 0); ctx.arcTo(imageWidth, 0, imageWidth, imageHeight, radius);
      ctx.arcTo(imageWidth, imageHeight, 0, imageHeight, radius); ctx.arcTo(0, imageHeight, 0, 0, radius);
      ctx.arcTo(0, 0, imageWidth, 0, radius); ctx.closePath();
    } : undefined });
    group.add(new Konva.Image({ image: source, width: imageWidth, height: imageHeight }));
    layer.add(group);
    layer.draw();
    const canvas = stage.toCanvas({ pixelRatio: 1 });
    return { canvas, width, height };
  } finally {
    stage.destroy();
  }
}
