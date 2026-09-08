import type { CanvasImage } from "../stores/canvas.store";
import { imageDisplaySize } from "./image-geometry";
import { computeImageLayout, imagePlacementBounds, type ImageLayoutSettings, type ImagePlacement } from "./image-layout";

type CanvasSize = { width: number; height: number; padding: number };

function groupBounds(images: CanvasImage[], placements: ImagePlacement[]) {
  const bounds = placements.map((placement, index) => imagePlacementBounds(images[index]!, placement));
  const left = Math.min(...bounds.map((box) => box.x));
  const top = Math.min(...bounds.map((box) => box.y));
  const width = Math.max(...bounds.map((box) => box.x + box.width)) - left;
  const height = Math.max(...bounds.map((box) => box.y + box.height)) - top;
  return { left, top, width, height };
}

/** Fit a manual composition as one group, preserving angles, stacking and relative placement. */
function fitComposition(images: CanvasImage[], canvas: CanvasSize): ImagePlacement[] {
  const initial = groupBounds(images, images);
  const centerX = initial.left + initial.width / 2, centerY = initial.top + initial.height / 2;
  const availableWidth = canvas.width - canvas.padding * 2;
  const availableHeight = canvas.height - canvas.padding * 2;
  const measure = (scale: number) => {
    const placements = images.map((image) => ({ id: image.id, rotation: image.rotation,
      x: (image.x - centerX) * scale, y: (image.y - centerY) * scale,
      width: image.width * scale, height: image.height * scale }));
    return { placements, ...groupBounds(images, placements) };
  };
  let low = 0, high = Math.max(canvas.width, canvas.height) / Math.max(0.001, Math.min(...images.map((image) => Math.min(image.width, image.height))));
  for (let step = 0; step < 48; step++) {
    const scale = (low + high) / 2;
    const bounds = measure(scale);
    if (bounds.width <= availableWidth && bounds.height <= availableHeight) low = scale;
    else high = scale;
  }
  const result = measure(low);
  return result.placements.map((image) => ({ ...image,
    x: image.x - result.left + canvas.padding + (availableWidth - result.width) / 2,
    y: image.y - result.top + canvas.padding + (availableHeight - result.height) / 2,
  }));
}

export function resizeCanvasImages(images: CanvasImage[], previous: CanvasSize, next: CanvasSize, layout: ImageLayoutSettings | null) {
  if (!images.length) return images;
  // Resolve the size actually displayed before changing the canvas; never refit raw source pixels first.
  const displayed = images.map((image) => ({ ...image, ...imageDisplaySize(image, previous.width, previous.height, previous.padding) }));
  // Exceptionally thick inset borders must still leave room on a tiny custom canvas.
  const borderLimit = Math.min(next.width - next.padding * 2, next.height - next.padding * 2) / 8;
  const fitted = displayed.map((image) => image.insetBorder.enabled && image.insetBorder.width > borderLimit
    ? { ...image, insetBorder: { ...image.insetBorder, width: borderLimit } } : image);
  let placements: ImagePlacement[];
  if (layout && images.length > 1) {
    try {
      placements = computeImageLayout(fitted, next.width, next.height, next.padding, layout.kind, layout.spacing, layout.featuredId);
    } catch {
      // Fixed-height title bars may not fit many rows on a tiny canvas. Keep the composition inside it.
      placements = fitComposition(fitted, next);
    }
  } else {
    placements = fitComposition(fitted, next);
  }
  return fitted.map((image, index) => ({ ...image, ...placements[index]!, userResized: true }));
}
