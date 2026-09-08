import type { CanvasImage } from "../stores/canvas.store";

/** Draw only the outside shadow, leaving transparent image pixels and other layers intact. */
export function drawShadowOnly(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  radius: number,
  shadow: CanvasImage["shadow"],
): void {
  if (!shadow.enabled || width <= 0 || height <= 0) return;
  const cornerRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  const transform = context.getTransform();
  const scale = Math.max(Math.hypot(transform.a, transform.b), Math.hypot(transform.c, transform.d));
  const margin = Math.max(0, shadow.blur) * 4 + Math.abs(shadow.offsetX) + Math.abs(shadow.offsetY) + 2;

  context.save();
  try {
    // Clip out the opaque caster before drawing. Erasing it afterwards would also erase other images.
    context.beginPath();
    context.rect(-margin, -margin, width + margin * 2, height + margin * 2);
    context.roundRect(0, 0, width, height, cornerRadius);
    context.clip("evenodd");
    context.shadowColor = shadow.color;
    context.shadowBlur = Math.max(0, shadow.blur) * scale;
    context.shadowOffsetX = transform.a * shadow.offsetX + transform.c * shadow.offsetY;
    context.shadowOffsetY = transform.b * shadow.offsetX + transform.d * shadow.offsetY;
    context.fillStyle = "#000000";
    context.beginPath();
    context.roundRect(0, 0, width, height, cornerRadius);
    context.fill();
  } finally {
    context.restore();
  }
}
