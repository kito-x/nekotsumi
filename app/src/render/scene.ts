import type { ArtAssets } from '../platform/assets.js';
import type { Projection } from './projection.js';
import { screenX, screenY } from './projection.js';

export function drawBackdrop(
  ctx: CanvasRenderingContext2D,
  assets: ArtAssets,
  cssWidth: number,
  cssHeight: number
): void {
  const image = assets.background;
  if (image) {
    const scale = Math.max(cssWidth / image.naturalWidth, cssHeight / image.naturalHeight);
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    ctx.drawImage(image, (cssWidth - width) / 2, (cssHeight - height) / 2, width, height);
    return;
  }

  const sky = ctx.createLinearGradient(0, 0, 0, cssHeight);
  sky.addColorStop(0, '#dce9df');
  sky.addColorStop(0.62, '#eef0dc');
  sky.addColorStop(1, '#f4dfc7');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  // Quiet sunroom placeholder: window, light pool and plant silhouette.
  const w = cssWidth;
  const h = cssHeight;
  ctx.fillStyle = 'rgba(255, 251, 238, 0.6)';
  ctx.fillRect(w * 0.12, h * 0.12, w * 0.34, h * 0.34);
  ctx.strokeStyle = 'rgba(134, 118, 92, 0.35)';
  ctx.lineWidth = Math.max(2, w * 0.008);
  ctx.strokeRect(w * 0.12, h * 0.12, w * 0.34, h * 0.34);
  ctx.beginPath();
  ctx.moveTo(w * 0.29, h * 0.12);
  ctx.lineTo(w * 0.29, h * 0.46);
  ctx.moveTo(w * 0.12, h * 0.29);
  ctx.lineTo(w * 0.46, h * 0.29);
  ctx.stroke();
  ctx.fillStyle = 'rgba(118, 146, 102, 0.28)';
  ctx.beginPath();
  ctx.ellipse(w * 0.8, h * 0.6, w * 0.1, h * 0.18, -0.2, 0, Math.PI * 2);
  ctx.fill();
}

export function drawFloor(
  ctx: CanvasRenderingContext2D,
  assets: ArtAssets,
  projection: Projection
): void {
  const image = assets.floor;
  const manifest = assets.manifest;
  if (image && manifest) {
    const floor = manifest.floor;
    const p = projection.scale;
    const scale = (floor.physicalWidth * p) / floor.sourceSize[0];
    const x = screenX(projection, 0) - floor.centerX * scale;
    const y = screenY(projection, 0) - floor.topLineY * scale;
    ctx.drawImage(
      image,
      x,
      y,
      floor.sourceSize[0] * scale,
      floor.sourceSize[1] * scale
    );
    return;
  }

  const p = projection.scale;
  const width = 4.4 * p;
  const x = screenX(projection, 0);
  const y = screenY(projection, 0);
  ctx.fillStyle = '#c9b18d';
  ctx.beginPath();
  ctx.roundRect(x - width / 2, y - 4, width, 18, 8);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 244, 220, 0.65)';
  ctx.fillRect(x - width / 2, y - 2, width, 3);
}
