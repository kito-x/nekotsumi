import type { ArtAssets, BodyId, FaceId } from '../platform/assets.js';

export interface CatTransform {
  readonly tiltDeg?: number;
  readonly scaleX?: number;
  readonly scaleY?: number;
  readonly alpha?: number;
}

export interface DrawCatOptions {
  readonly bodyId: BodyId;
  readonly faceId: FaceId;
  readonly xPx: number;
  readonly bottomPx: number;
  readonly logicalWidthPx: number;
  readonly transform?: CatTransform;
  readonly overlay?: boolean;
  readonly label?: string;
}

export interface CatMetrics {
  readonly x: number;
  readonly bottom: number;
  readonly width: number;
  readonly height: number;
  readonly pivotX: number;
  readonly pivotY: number;
  readonly faceX: number;
  readonly faceY: number;
  readonly faceSize: number;
}

const FALLBACK_SOURCE_SIZE: readonly [number, number] = [512, 384];
const FALLBACK_LOGICAL_RECT: readonly [number, number, number, number] = [48, 80, 416, 416 / 1.55];
const FALLBACK_PIVOT: readonly [number, number] = [256, 80 + 416 / 1.55];
const FALLBACK_FACE_UV: readonly [number, number] = [0.5, 0.48];
const FALLBACK_FACE_FRACTION = 0.45;

const COAT_COLORS: Readonly<Record<BodyId, { body: string; belly: string; patch: string; line: string }>> = {
  default: { body: '#f3dfc4', belly: '#fff4e2', patch: '#d9b78f', line: '#5b4135' },
  ginger: { body: '#e29650', belly: '#f8d3a8', patch: '#c87531', line: '#5b4135' },
  tuxedo: { body: '#3c3945', belly: '#f5ead8', patch: '#6e687b', line: '#17151d' },
  calico: { body: '#f0d7bd', belly: '#fff3df', patch: '#d7824d', line: '#5b4135' }
};

const FACE_LABEL: Readonly<Record<FaceId, string>> = {
  idle: 'idle',
  focused: 'focused',
  happy: 'happy',
  surprised: 'surprised',
  worried: 'worried',
  dizzy: 'dizzy'
};

function catMetrics(
  x: number,
  bottom: number,
  width: number,
  logicalRect: readonly [number, number, number, number],
  pivot: readonly [number, number],
  faceUV: readonly [number, number],
  faceFraction: number
): CatMetrics {
  const scale = width / logicalRect[2];
  const height = logicalRect[3] * scale;
  const faceOffsetY = (pivot[1] - (logicalRect[1] + faceUV[1] * logicalRect[3])) * scale;
  return {
    x,
    bottom,
    width,
    height,
    pivotX: x,
    pivotY: bottom,
    faceX: x + (logicalRect[0] + faceUV[0] * logicalRect[2] - pivot[0]) * scale,
    faceY: bottom - faceOffsetY,
    faceSize: width * faceFraction
  };
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  radius: number
): void {
  const r = Math.min(radius, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawPlaceholderBody(
  ctx: CanvasRenderingContext2D,
  bodyId: BodyId,
  width: number,
  height: number
): void {
  const colors = COAT_COLORS[bodyId];
  const left = -width / 2;
  const top = -height;

  // Tail, body, ears and a cream bib remain inside the declared logical box.
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colors.line;
  ctx.lineWidth = Math.max(1.5, width * 0.022);
  ctx.fillStyle = colors.body;

  ctx.beginPath();
  ctx.moveTo(width * 0.34, top + height * 0.42);
  ctx.quadraticCurveTo(width * 0.58, top + height * 0.36, width * 0.5, top + height * 0.12);
  ctx.quadraticCurveTo(width * 0.47, top + height * 0.03, width * 0.36, top + height * 0.1);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(left + width * 0.12, top + height * 0.34);
  ctx.lineTo(left + width * 0.2, top + height * 0.02);
  ctx.lineTo(left + width * 0.38, top + height * 0.2);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(left + width * 0.62, top + height * 0.2);
  ctx.lineTo(left + width * 0.8, top + height * 0.02);
  ctx.lineTo(left + width * 0.88, top + height * 0.34);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  roundedRect(ctx, left, top + height * 0.18, width, height * 0.82, width * 0.18);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = colors.belly;
  ctx.beginPath();
  ctx.ellipse(0, top + height * 0.7, width * 0.2, height * 0.25, 0, 0, Math.PI * 2);
  ctx.fill();

  if (bodyId === 'calico') {
    ctx.fillStyle = colors.patch;
    ctx.beginPath();
    ctx.ellipse(-width * 0.25, top + height * 0.35, width * 0.16, height * 0.14, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(width * 0.22, top + height * 0.52, width * 0.12, height * 0.12, 0.3, 0, Math.PI * 2);
    ctx.fill();
  }
  if (bodyId === 'tuxedo') {
    ctx.fillStyle = colors.belly;
    ctx.beginPath();
    ctx.ellipse(0, top + height * 0.48, width * 0.18, height * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPlaceholderFace(
  ctx: CanvasRenderingContext2D,
  faceId: FaceId,
  centerX: number,
  centerY: number,
  size: number,
  line: string
): void {
  const eyeY = centerY - size * 0.05;
  const eyeX = size * 0.16;
  const eyeR = size * 0.055;
  ctx.fillStyle = line;
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(1, size * 0.035);
  ctx.lineCap = 'round';

  if (faceId === 'happy') {
    ctx.beginPath();
    ctx.arc(centerX - eyeX, eyeY, eyeR, Math.PI, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(centerX + eyeX, eyeY, eyeR, Math.PI, Math.PI * 2);
    ctx.stroke();
  } else if (faceId === 'dizzy') {
    ctx.beginPath();
    ctx.moveTo(centerX - eyeX - eyeR, eyeY - eyeR);
    ctx.lineTo(centerX - eyeX + eyeR, eyeY + eyeR);
    ctx.moveTo(centerX - eyeX + eyeR, eyeY - eyeR);
    ctx.lineTo(centerX - eyeX - eyeR, eyeY + eyeR);
    ctx.moveTo(centerX + eyeX - eyeR, eyeY - eyeR);
    ctx.lineTo(centerX + eyeX + eyeR, eyeY + eyeR);
    ctx.moveTo(centerX + eyeX + eyeR, eyeY - eyeR);
    ctx.lineTo(centerX + eyeX - eyeR, eyeY + eyeR);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.ellipse(centerX - eyeX, eyeY, eyeR, eyeR * (faceId === 'surprised' ? 1.5 : 1), 0, 0, Math.PI * 2);
    ctx.ellipse(centerX + eyeX, eyeY, eyeR, eyeR * (faceId === 'surprised' ? 1.5 : 1), 0, 0, Math.PI * 2);
    ctx.fill();
  }

  if (faceId === 'surprised') {
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + size * 0.1, size * 0.06, size * 0.08, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (faceId === 'worried' || faceId === 'focused') {
    ctx.beginPath();
    ctx.moveTo(centerX - size * 0.1, centerY + size * 0.12);
    ctx.quadraticCurveTo(centerX, centerY + size * 0.05, centerX + size * 0.1, centerY + size * 0.12);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(centerX, centerY + size * 0.03, size * 0.1, 0.15, Math.PI - 0.15);
    ctx.stroke();
  }

  // Small nose.
  ctx.beginPath();
  ctx.moveTo(centerX - size * 0.03, centerY + size * 0.015);
  ctx.lineTo(centerX + size * 0.03, centerY + size * 0.015);
  ctx.lineTo(centerX, centerY + size * 0.055);
  ctx.closePath();
  ctx.fill();
}

function drawBodyImage(
  ctx: CanvasRenderingContext2D,
  image: HTMLImageElement,
  scale: number,
  sourceSize: readonly [number, number],
  pivot: readonly [number, number]
): void {
  ctx.drawImage(
    image,
    -pivot[0] * scale,
    -pivot[1] * scale,
    sourceSize[0] * scale,
    sourceSize[1] * scale
  );
}

/**
 * Draws one cat with the approved source/pivot mapping. Body and face share the
 * pivot transform; logical collision geometry is never derived from the image.
 */
export function drawCat(
  ctx: CanvasRenderingContext2D,
  assets: ArtAssets,
  options: DrawCatOptions
): CatMetrics {
  const body = assets.bodies[options.bodyId];
  const face = assets.faces[options.faceId];
  const sourceSize = body?.spec.sourceSize ?? FALLBACK_SOURCE_SIZE;
  const logicalRect = body?.spec.logicalRectPx ?? FALLBACK_LOGICAL_RECT;
  const pivot = body?.spec.pivotPx ?? FALLBACK_PIVOT;
  const faceUV = body?.spec.faceAnchorBodyUV ?? FALLBACK_FACE_UV;
  const faceFraction = assets.manifest?.faceRenderWidthBodyFraction ?? FALLBACK_FACE_FRACTION;
  const metrics = catMetrics(
    options.xPx,
    options.bottomPx,
    options.logicalWidthPx,
    logicalRect,
    pivot,
    faceUV,
    faceFraction
  );
  const transform = options.transform ?? {};
  const scale = options.logicalWidthPx / logicalRect[2];

  ctx.save();
  ctx.translate(metrics.pivotX, metrics.pivotY);
  if (transform.tiltDeg !== undefined) ctx.rotate((transform.tiltDeg * Math.PI) / 180);
  ctx.scale(transform.scaleX ?? 1, transform.scaleY ?? 1);
  if (transform.alpha !== undefined) ctx.globalAlpha = transform.alpha;

  if (body?.image) {
    drawBodyImage(ctx, body.image, scale, sourceSize, pivot);
  } else {
    drawPlaceholderBody(ctx, options.bodyId, metrics.width, metrics.height);
  }

  const faceCenterX = metrics.faceX - metrics.pivotX;
  const faceCenterY = metrics.faceY - metrics.pivotY;
  if (face?.image) {
    ctx.drawImage(
      face.image,
      faceCenterX - metrics.faceSize / 2,
      faceCenterY - metrics.faceSize / 2,
      metrics.faceSize,
      metrics.faceSize
    );
  } else {
    drawPlaceholderFace(
      ctx,
      options.faceId,
      faceCenterX,
      faceCenterY,
      metrics.faceSize,
      COAT_COLORS[options.bodyId].line
    );
  }
  ctx.restore();

  if (options.overlay) {
    drawCatOverlay(ctx, metrics, options.label ?? FACE_LABEL[options.faceId]);
  }
  return metrics;
}

function drawCatOverlay(ctx: CanvasRenderingContext2D, metrics: CatMetrics, label: string): void {
  const left = metrics.x - metrics.width / 2;
  const top = metrics.bottom - metrics.height;
  ctx.save();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(0, 120, 180, 0.85)';
  ctx.setLineDash([4, 3]);
  ctx.strokeRect(left, top, metrics.width, metrics.height);
  ctx.setLineDash([]);
  ctx.fillStyle = 'rgba(0, 120, 180, 0.9)';
  ctx.beginPath();
  ctx.arc(metrics.pivotX, metrics.pivotY, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(180, 40, 110, 0.95)';
  ctx.beginPath();
  ctx.moveTo(metrics.faceX - 5, metrics.faceY);
  ctx.lineTo(metrics.faceX + 5, metrics.faceY);
  ctx.moveTo(metrics.faceX, metrics.faceY - 5);
  ctx.lineTo(metrics.faceX, metrics.faceY + 5);
  ctx.stroke();
  ctx.fillStyle = '#23323b';
  ctx.font = '11px system-ui, sans-serif';
  ctx.fillText(label, left, top - 4);
  ctx.fillStyle = 'rgba(35, 50, 59, 0.85)';
  ctx.font = '10px ui-monospace, monospace';
  ctx.fillText('pivot', metrics.pivotX + 4, metrics.pivotY + 11);
  ctx.restore();
}

export { FACE_LABEL, COAT_COLORS, catMetrics, roundedRect };
