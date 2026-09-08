import afternoon from "../assets/backgrounds/afternoon.jpg?inline";
import type { CanvasPreset } from "../stores/preset.store";

// Desktop image presets complement the solid/gradient presets shared with the CLI.
// Inline assets keep saved projects portable and require no access to the original file.
export const BUILTIN_IMAGE_PRESETS: Omit<CanvasPreset, "id">[] = [
  {
    name: "afternoon",
    canvasWidth: 1600,
    canvasHeight: 883,
    padding: 64,
    background: {
      type: "image",
      color: "#0f172a",
      gradientColors: ["#667eea", "#764ba2"],
      gradientAngle: 135,
      imageSrc: afternoon,
      blur: 0,
      grain: 0,
    },
    cornerRadius: 12,
    shadowEnabled: true,
    shadowBlur: 20,
    shadowOffsetY: 10,
    insetBorderEnabled: false,
    insetBorderWidth: 0,
  },
];
