/** Center-crop the source to fill the canvas without stretching either axis. */
export function backgroundImageCrop(sourceWidth: number, sourceHeight: number, width: number, height: number) {
  const scale = Math.max(width / sourceWidth, height / sourceHeight);
  const cropWidth = width / scale;
  const cropHeight = height / scale;
  return { x: (sourceWidth - cropWidth) / 2, y: (sourceHeight - cropHeight) / 2, width: cropWidth, height: cropHeight };
}
