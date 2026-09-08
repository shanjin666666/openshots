import type Konva from "konva";

export const EDITOR_OVERLAY_NAME = "editor-overlay";

/** Capture artwork without changing selection, geometry, or undo history. */
function withoutEditorOverlays<T>(stage: Pick<Konva.Stage, "find">, render: () => T): T {
  const overlays = stage.find((node: Konva.Node) =>
    node.getClassName() === "Transformer" || node.hasName(EDITOR_OVERLAY_NAME),
  );
  const visibility = overlays.map((node) => node.visible());
  try {
    overlays.forEach((node) => node.hide());
    // Konva renders synchronously into an offscreen canvas. Restore before the
    // next browser paint, including when encoding fails, to keep editing intact.
    return render();
  } finally {
    overlays.forEach((node, index) => node.visible(visibility[index]!));
  }
}

export function exportStageImage(stage: Pick<Konva.Stage, "find" | "toDataURL">, options: Parameters<Konva.Stage["toDataURL"]>[0]): string {
  return withoutEditorOverlays(stage, () => stage.toDataURL(options));
}

/** Raw pixels avoid lossy intermediate encodes and a second resize. */
export function exportStageCanvas(stage: Pick<Konva.Stage, "find" | "toCanvas">, options: Parameters<Konva.Stage["toCanvas"]>[0]): HTMLCanvasElement {
  return withoutEditorOverlays(stage, () => stage.toCanvas(options));
}
