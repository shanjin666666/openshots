import { backgroundGradient } from "../../lib/background-gradient";
import { backgroundImageCrop } from "../../lib/background-image";
import { Rect, Image as KonvaImage, Layer } from "react-konva";
import { useCanvasStore } from "../../stores/canvas.store";
import { useEffect, useRef, useState } from "react";
import Konva from "konva";

/**
 * Renders the canvas background: solid color, gradient, or image.
 * Supports blur effect via Konva filters.
 */
export default function BackgroundLayer() {
  const { canvasWidth, canvasHeight, background } = useCanvasStore();
  const rectRef = useRef<Konva.Rect>(null);
  const imgRef = useRef<Konva.Image>(null);
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);

  // Load background image if type is "image"
  useEffect(() => {
    let disposed = false;
    setBgImage(null);
    if (background.type === "image" && background.imageSrc) {
      const img = new window.Image();
      img.crossOrigin = "anonymous";
      img.onload = () => { if (!disposed) setBgImage(img); };
      img.onerror = () => console.error("[Screenshots] Failed to load background image");
      img.src = background.imageSrc;
    }
    return () => { disposed = true; };
  }, [background.type, background.imageSrc]);

  // Apply blur filter to gradient/solid rect
  useEffect(() => {
    const node = rectRef.current;
    if (!node) return;
    node.clearCache();
    if (background.blur > 0) {
      node.filters([Konva.Filters.Blur]);
      node.blurRadius(background.blur);
      node.cache();
    } else {
      node.filters([]);
    }
  }, [background, canvasWidth, canvasHeight]);

  // Apply blur filter to background image
  useEffect(() => {
    const node = imgRef.current;
    if (!node) return;
    node.clearCache();
    if (background.blur > 0) {
      node.filters([Konva.Filters.Blur]);
      node.blurRadius(background.blur);
      node.cache();
    } else {
      node.filters([]);
    }
  }, [background.blur, bgImage, canvasWidth, canvasHeight]);


  return (
    <Layer listening={false}>
      {background.type === "image" && bgImage ? (
        <KonvaImage
          ref={imgRef}
          image={bgImage}
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
          crop={backgroundImageCrop(bgImage.naturalWidth, bgImage.naturalHeight, canvasWidth, canvasHeight)}
        />
      ) : background.type === "solid" ? (
        <Rect
          ref={rectRef}
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
          fill={background.color}
        />
      ) : (
        <Rect
          ref={rectRef}
          x={0}
          y={0}
          width={canvasWidth}
          height={canvasHeight}
          {...backgroundGradient(background, canvasWidth, canvasHeight)}
        />
      )}
    </Layer>
  );
}
