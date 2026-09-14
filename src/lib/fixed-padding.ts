import type { AnnotationShape, CanvasImage, CanvasState } from "../stores/canvas.store";
import { imageDisplaySize, imageFrameSize } from "./image-geometry";
import { DEVICE_MOCKUP_FRAMES } from "../components/composition/frames";

type PaddingSource = Pick<CanvasState, "images" | "canvasWidth" | "canvasHeight" | "padding" | "annotations" | "privacyRegions">;
export const MAX_FIXED_PADDING = 1024;

function contentOrigin(image: CanvasImage, width: number, height: number) {
  const frame = imageFrameSize(image, width, height);
  const border = !image.frame && image.insetBorder.enabled ? image.insetBorder.width : 0;
  const x = -frame.width / 2 + (frame.deviceInsets?.left ?? border);
  const y = -frame.height / 2 + (frame.deviceInsets?.top ?? border + frame.chromeHeight);
  const radians = image.rotation * Math.PI / 180;
  return { x: image.x + x * Math.cos(radians) - y * Math.sin(radians),
    y: image.y + x * Math.sin(radians) + y * Math.cos(radians) };
}

/** Expand a source at 1:1 pixels. Invalid sizes leave the composition untouched. */
export function fixedPaddingCanvas(state: PaddingSource, value: number, previousImages = state.images): Partial<CanvasState> | null {
  if (state.images.length !== 1 || !Number.isFinite(value) || value < 0 || value > MAX_FIXED_PADDING) return null;
  const source = state.images[0]!;
  const previous = previousImages[0] ?? source;
  const hasNaturalSize = [source.naturalWidth, source.naturalHeight].every((n) => typeof n === "number" && Number.isFinite(n) && n > 0);
  const width = hasNaturalSize ? source.naturalWidth! : source.width;
  const height = hasNaturalSize ? source.naturalHeight! : source.height;
  const padding = Math.round(value);
  if (![width, height, source.rotation].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  const frame = imageFrameSize(source, width, height);
  const variant = source.frame?.variant;
  const device = source.frame?.type === "device-mockup" && (variant === "iphone" || variant === "ipad" || variant === "macbook")
    ? DEVICE_MOCKUP_FRAMES[variant] : null;
  const outerWidth = Math.max(frame.width, device ? width / (1 - device.screenInset.left - device.screenInset.right) : 0);
  const outerHeight = Math.max(frame.height, device ? height / (1 - device.screenInset.top - device.screenInset.bottom) : 0);
  const angle = source.rotation * Math.PI / 180;
  const snapAxis = (value: number) => Math.abs(value - Math.round(value)) < 1e-12 ? Math.round(value) : value;
  const cos = snapAxis(Math.cos(angle)), sin = snapAxis(Math.sin(angle));
  // The device artwork can extend past its rounded group bounds. Enclose its
  // actual rotated rectangle in whole pixels before adding the four margins.
  const corners = [[0, 0], [outerWidth, 0], [0, outerHeight], [outerWidth, outerHeight]]
    .map(([x, y]) => ({ x: x! * cos - y! * sin, y: x! * sin + y! * cos }));
  const left = Math.floor(Math.min(...corners.map((point) => point.x)) + 1e-9);
  const top = Math.floor(Math.min(...corners.map((point) => point.y)) + 1e-9);
  const right = Math.ceil(Math.max(...corners.map((point) => point.x)) - 1e-9);
  const bottom = Math.ceil(Math.max(...corners.map((point) => point.y)) - 1e-9);
  const canvasWidth = right - left + padding * 2;
  const canvasHeight = bottom - top + padding * 2;
  if (canvasWidth > 8192 || canvasHeight > 8192 || canvasWidth * canvasHeight > 32_000_000) return null;
  // Match the renderer's center/offset transform while keeping its top-left
  // translation on whole pixels, including quarter-turn native-size images.
  const image = { ...source, width, height,
    x: padding - left + frame.width / 2 * cos - frame.height / 2 * sin,
    y: padding - top + frame.width / 2 * sin + frame.height / 2 * cos, userResized: true };
  const display = imageDisplaySize(previous, state.canvasWidth, state.canvasHeight, state.padding);
  const before = contentOrigin(previous, display.width, display.height);
  const after = contentOrigin(image, width, height);
  const sx = width / display.width, sy = height / display.height;
  const point = (x: number, y: number) => {
    const dx = x - before.x, dy = y - before.y;
    const localX = (dx * cos + dy * sin) * sx, localY = (-dx * sin + dy * cos) * sy;
    return { x: after.x + localX * cos - localY * sin, y: after.y + localX * sin + localY * cos };
  };
  const scale = Math.min(sx, sy);
  const annotation = (item: AnnotationShape): AnnotationShape => {
    const result = { ...item, ...point(item.x, item.y) } as AnnotationShape;
    if ("width" in result) result.width *= sx;
    if ("height" in result) result.height *= sy;
    if ("radiusX" in result) result.radiusX *= sx;
    if ("radiusY" in result) result.radiusY *= sy;
    if ("fontSize" in result) result.fontSize *= scale;
    if ("strokeWidth" in result) result.strokeWidth *= scale;
    if ("cornerRadius" in result) result.cornerRadius *= scale;
    if ("tailSize" in result) result.tailSize *= scale;
    if ("points" in result) result.points = result.points.map((n, index) => n * (index % 2 ? sy : sx));
    return result;
  };
  return { canvasWidth, canvasHeight, padding, canvasSizeMode: "padding", images: [image], imageLayout: null,
    annotations: state.annotations.map(annotation),
    privacyRegions: state.privacyRegions.map((region) => ({ ...region, ...point(region.x, region.y), width: region.width * sx, height: region.height * sy })) };
}
