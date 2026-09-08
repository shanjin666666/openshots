import type { CanvasBackground } from "../stores/canvas.store";

/** Same gradient geometry as the editor; shared by preview and full-size output. */
export function backgroundGradient(background: CanvasBackground, width: number, height: number) {
  const halfW = width / 2, halfH = height / 2;
  const stops = [0, background.gradientColors[0], 1, background.gradientColors[1]];
  if (background.type === "radial-gradient") return {
    fillRadialGradientStartPoint: { x: halfW, y: halfH }, fillRadialGradientEndPoint: { x: halfW, y: halfH },
    fillRadialGradientStartRadius: 0, fillRadialGradientEndRadius: Math.max(halfW, halfH), fillRadialGradientColorStops: stops,
  };
  const angle = background.gradientAngle * Math.PI / 180;
  return {
    fillLinearGradientStartPoint: { x: halfW - Math.cos(angle) * halfW, y: halfH - Math.sin(angle) * halfH },
    fillLinearGradientEndPoint: { x: halfW + Math.cos(angle) * halfW, y: halfH + Math.sin(angle) * halfH },
    fillLinearGradientColorStops: stops,
  };
}
