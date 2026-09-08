import { useCanvasStore } from "../stores/canvas.store";
import { editorExportResolution, type ExportScale } from "../lib/export-resolution";

export function useExportResolution(choice: ExportScale) {
  const images = useCanvasStore((s) => s.images);
  const canvasWidth = useCanvasStore((s) => s.canvasWidth);
  const canvasHeight = useCanvasStore((s) => s.canvasHeight);
  const padding = useCanvasStore((s) => s.padding);
  return editorExportResolution({ images, canvasWidth, canvasHeight, padding }, choice);
}
