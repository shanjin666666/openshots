import type { CanvasImage } from "../stores/canvas.store";
import { imageFrameSize } from "./image-geometry";

export const IMAGE_LAYOUTS = [
  { id: "fan", label: "Fan", description: "A balanced arc with gentle rotation" },
  { id: "grid", label: "Grid", description: "Even rows and columns without overlap" },
  { id: "horizontal", label: "Side by side", description: "Compare images in a single row" },
  { id: "vertical", label: "Vertical", description: "Show a sequence from top to bottom" },
  { id: "cascade", label: "Cascade", description: "Layer images in a diagonal stack" },
  { id: "featured", label: "Featured image", description: "Make the selected image the main focus" },
] as const;
export type ImageLayout = typeof IMAGE_LAYOUTS[number]["id"];
export type LayoutSpacing = "compact" | "balanced" | "airy";
export interface ImageLayoutSettings {
  kind: ImageLayout;
  spacing: LayoutSpacing;
  featuredId?: string;
}

/** Older projects have no layout metadata; ignore unknown future values safely. */
export function readImageLayout(value: unknown): ImageLayoutSettings | null {
  if (!value || typeof value !== "object") return null;
  const data = value as Record<string, unknown>;
  if (!IMAGE_LAYOUTS.some((layout) => layout.id === data.kind) || typeof data.spacing !== "string"
    || !["compact", "balanced", "airy"].includes(data.spacing)) return null;
  return { kind: data.kind as ImageLayout, spacing: data.spacing as LayoutSpacing,
    ...(data.kind === "featured" && typeof data.featuredId === "string" ? { featuredId: data.featuredId } : {}) };
}
export type ImagePlacement = Pick<CanvasImage, "id" | "x" | "y" | "width" | "height" | "rotation">;
type Box = { x: number; y: number; width: number; height: number };
const SPACING = { compact: 0.65, balanced: 1, airy: 1.4 };
const TOO_SMALL = "The canvas is too small for this layout. Enlarge it or use fewer images.";

function fitImage(image: CanvasImage, box: Box): ImagePlacement {
  const aspect = image.width / image.height;
  // Binary search also handles rounded device bezels and fixed window title bars.
  let low = 0, high = Math.min(box.width / aspect, box.height);
  for (let step = 0; step < 40; step++) {
    const height = (low + high) / 2;
    const frame = imageFrameSize(image, height * aspect, height);
    if (frame.width <= box.width && frame.height <= box.height) low = height;
    else high = height;
  }
  if (low < 1) throw new Error(TOO_SMALL);
  return { id: image.id, x: box.x + box.width / 2, y: box.y + box.height / 2, width: low * aspect, height: low, rotation: 0 };
}

export function imagePlacementBounds(image: CanvasImage, placement: ImagePlacement): Box {
  const frame = imageFrameSize(image, placement.width, placement.height);
  const angle = placement.rotation * Math.PI / 180;
  const width = Math.abs(frame.width * Math.cos(angle)) + Math.abs(frame.height * Math.sin(angle));
  const height = Math.abs(frame.width * Math.sin(angle)) + Math.abs(frame.height * Math.cos(angle));
  return { x: placement.x - width / 2, y: placement.y - height / 2, width, height };
}

function grid(images: CanvasImage[], area: Box, gap: number, columns?: number): ImagePlacement[] {
  let best: ImagePlacement[] | undefined;
  let bestScore = -Infinity;
  for (let cols = columns ?? 1; cols <= (columns ?? images.length); cols++) {
    const rows = Math.ceil(images.length / cols);
    const cellWidth = (area.width - gap * (cols - 1)) / cols;
    const cellHeight = (area.height - gap * (rows - 1)) / rows;
    if (cellWidth <= 0 || cellHeight <= 0) continue;
    try {
      const placements = images.map((image, index) => {
        const row = Math.floor(index / cols);
        const rowCount = Math.min(cols, images.length - row * cols);
        const rowWidth = rowCount * cellWidth + (rowCount - 1) * gap;
        return fitImage(image, {
          x: area.x + (area.width - rowWidth) / 2 + (index % cols) * (cellWidth + gap),
          y: area.y + row * (cellHeight + gap), width: cellWidth, height: cellHeight,
        });
      });
      const score = placements.reduce((sum, item) => sum + item.width * item.height, 0);
      if (score > bestScore) { best = placements; bestScore = score; }
    } catch { /* Another column count may fit the frames. */ }
  }
  if (!best) throw new Error(TOO_SMALL);
  return best;
}

function layered(images: CanvasImage[], area: Box, kind: "fan" | "cascade", spacing: LayoutSpacing): ImagePlacement[] {
  const cards = images.map((image) => fitImage(image, { x: 0, y: 0, width: 640, height: 460 }));
  const widths = cards.map((card, i) => imageFrameSize(images[i]!, card.width, card.height).width);
  const cardWidth = Math.max(...widths);
  const density = SPACING[spacing];
  const stepX = cardWidth * (kind === "fan" ? (images.length === 2 ? 0.78 : 0.58) : 0.22) * density;
  const maxAngle = images.length === 2 ? 8 : 14;
  const templates = cards.map((card, index) => {
    const position = index / Math.max(images.length - 1, 1) * 2 - 1;
    return { ...card, x: (index - (images.length - 1) / 2) * stepX,
      y: kind === "fan" ? position ** 2 * 75 : (index - (images.length - 1) / 2) * 95 * density,
      rotation: kind === "fan" ? position * maxAngle : 0 };
  });
  const measure = (scale: number) => {
    const placements = templates.map((card) => ({ ...card, x: card.x * scale, y: card.y * scale, width: card.width * scale, height: card.height * scale }));
    const bounds = placements.map((card, i) => imagePlacementBounds(images[i]!, card));
    const left = Math.min(...bounds.map((b) => b.x)), top = Math.min(...bounds.map((b) => b.y));
    return { placements, left, top,
      width: Math.max(...bounds.map((b) => b.x + b.width)) - left,
      height: Math.max(...bounds.map((b) => b.y + b.height)) - top };
  };
  // Leave breathing room around the entire composition, including rotated corners.
  let low = 0, high = Math.max(area.width, area.height) / Math.min(...cards.map((c) => Math.min(c.width, c.height)));
  for (let step = 0; step < 45; step++) {
    const scale = (low + high) / 2;
    const bounds = measure(scale);
    if (bounds.width <= area.width && bounds.height <= area.height) low = scale;
    else high = scale;
  }
  const result = measure(low);
  if (result.placements.some((card) => Math.min(card.width, card.height) < 1)) throw new Error(TOO_SMALL);
  return result.placements.map((card) => ({ ...card,
    x: card.x - result.left + area.x + (area.width - result.width) / 2,
    y: card.y - result.top + area.y + (area.height - result.height) / 2,
  }));
}

/** Pure geometry: preserve source proportions, fit the padded canvas and keep image order. */
export function computeImageLayout(images: CanvasImage[], canvasWidth: number, canvasHeight: number, padding: number,
  kind: ImageLayout, spacing: LayoutSpacing = "balanced", selectedId?: string | null): ImagePlacement[] {
  if (!images.length) return [];
  if (![canvasWidth, canvasHeight, padding].every(Number.isFinite) || canvasWidth <= 0 || canvasHeight <= 0
    || images.some((image) => !Number.isFinite(image.width / image.height) || image.width <= 0 || image.height <= 0)) throw new Error(TOO_SMALL);
  const shortEdge = Math.min(canvasWidth, canvasHeight);
  const margin = Math.max(padding, shortEdge * 0.055);
  const area = { x: margin, y: margin, width: canvasWidth - margin * 2, height: canvasHeight - margin * 2 };
  if (area.width <= 0 || area.height <= 0) throw new Error(TOO_SMALL);
  const gap = Math.min(shortEdge * 0.035 * SPACING[spacing], Math.min(area.width, area.height) / (images.length * 2));
  if (images.length === 1) return [fitImage(images[0]!, area)];
  if (kind === "fan" || kind === "cascade") return layered(images, area, kind, spacing);
  if (kind === "featured") {
    const featured = images.find((image) => image.id === selectedId) ?? images[0]!;
    const others = images.filter((image) => image !== featured);
    const landscape = area.width >= area.height;
    const main: Box = landscape ? { ...area, width: (area.width - gap) * 0.67 } : { ...area, height: (area.height - gap) * 0.67 };
    const rest: Box = landscape
      ? { x: main.x + main.width + gap, y: area.y, width: area.width - main.width - gap, height: area.height }
      : { x: area.x, y: main.y + main.height + gap, width: area.width, height: area.height - main.height - gap };
    const arranged = [fitImage(featured, main), ...grid(others, rest, gap)];
    const byId = new Map(arranged.map((item) => [item.id, item]));
    return images.map((image) => byId.get(image.id)!);
  }
  return grid(images, area, gap, kind === "horizontal" ? images.length : kind === "vertical" ? 1 : undefined);
}
