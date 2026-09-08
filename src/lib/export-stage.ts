import type Konva from "konva";

export const EDITOR_OVERLAY_NAME = "editor-overlay";

/** Capture artwork without changing selection, geometry, or undo history. */
export function exportStageImage(
  stage: Pick<Konva.Stage, "find" | "toDataURL">,
  options: Parameters<Konva.Stage["toDataURL"]>[0],
): string {
  const overlays = stage.find((node: Konva.Node) =>
    node.getClassName() === "Transformer" || node.hasName(EDITOR_OVERLAY_NAME),
  );
  const visibility = overlays.map((node) => node.visible());
  try {
    overlays.forEach((node) => node.hide());
    // Konva renders synchronously into an offscreen canvas. Restore before the
    // next browser paint, including when encoding fails, to keep editing intact.
    return stage.toDataURL(options);
  } finally {
    overlays.forEach((node, index) => node.visible(visibility[index]!));
  }
}
