import type { ArtAssets, BodyId, FaceId } from '../platform/assets.js';
import { BALANCE_V1 } from '../domain/balance.js';
import { drawCat } from './art.js';
import { drawBackdrop, drawFloor } from './scene.js';
import { createProjection, screenX, screenY } from './projection.js';

const BODY_IDS: readonly BodyId[] = ['default', 'ginger', 'tuxedo', 'calico'];
const FACE_IDS: readonly FaceId[] = ['idle', 'focused', 'happy', 'surprised', 'worried', 'dizzy'];

export interface DiagnosticRenderOptions {
  readonly dpr: 1 | 2;
}

export function renderDiagnosticGrid(
  canvas: HTMLCanvasElement,
  assets: ArtAssets,
  options: DiagnosticRenderOptions
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cssWidth = 980;
  const cssHeight = 900;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.width = cssWidth * options.dpr;
  canvas.height = cssHeight * options.dpr;
  ctx.setTransform(options.dpr, 0, 0, options.dpr, 0, 0);
  ctx.imageSmoothingEnabled = true;

  const sky = ctx.createLinearGradient(0, 0, 0, cssHeight);
  sky.addColorStop(0, '#edf1e4');
  sky.addColorStop(1, '#d8e1d2');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, cssWidth, cssHeight);

  ctx.fillStyle = '#24322d';
  ctx.font = '700 22px system-ui, sans-serif';
  ctx.fillText('Production-02 art diagnostics', 24, 36);
  ctx.font = '13px ui-monospace, monospace';
  ctx.fillStyle = '#46564d';
  ctx.fillText(
    `forced DPR ${options.dpr} | 4 coats x 6 faces | 80 CSS px body width | face 36 px | provisional technical check`,
    24,
    57
  );

  const cellWidth = 150;
  const cellHeight = 160;
  const originX = 24;
  const originY = 76;
  const bodyWidth = 80;

  for (let row = 0; row < BODY_IDS.length; row += 1) {
    for (let col = 0; col < FACE_IDS.length; col += 1) {
      const x = originX + col * cellWidth;
      const y = originY + row * cellHeight;
      const bottom = y + 132;
      ctx.fillStyle = 'rgba(255,255,245,0.5)';
      ctx.fillRect(x, y, cellWidth - 12, cellHeight - 12);
      drawCat(ctx, assets, {
        bodyId: BODY_IDS[row]!,
        faceId: FACE_IDS[col]!,
        xPx: x + (cellWidth - 12) / 2,
        bottomPx: bottom,
        logicalWidthPx: bodyWidth,
        overlay: true,
        label: `${BODY_IDS[row]} / ${FACE_IDS[col]}`
      });
    }
  }

  const stressY = originY + BODY_IDS.length * cellHeight + 30;
  ctx.fillStyle = '#24322d';
  ctx.font = '700 15px system-ui, sans-serif';
  ctx.fillText('Shared squash / tilt around bottom-center pivot (2 deg, 1.06 / 0.94)', originX, stressY - 18);
  BODY_IDS.forEach((bodyId, index) => {
    drawCat(ctx, assets, {
      bodyId,
      faceId: FACE_IDS[(index + 2) % FACE_IDS.length]!,
      xPx: 100 + index * 210,
      bottomPx: stressY + 125,
      logicalWidthPx: 88,
      overlay: true,
      transform: { tiltDeg: index % 2 === 0 ? 2 : -2, scaleX: 0.94, scaleY: 1.06 },
      label: `${bodyId} transform`
    });
  });

  ctx.strokeStyle = 'rgba(89, 108, 92, 0.35)';
  ctx.beginPath();
  ctx.moveTo(0, originY + BODY_IDS.length * cellHeight + 4);
  ctx.lineTo(cssWidth, originY + BODY_IDS.length * cellHeight + 4);
  ctx.stroke();
}

export function renderDiagnosticProjection(
  canvas: HTMLCanvasElement,
  assets: ArtAssets,
  options: DiagnosticRenderOptions
): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const cssWidth = 980;
  const cssHeight = 260;
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${cssHeight}px`;
  canvas.width = cssWidth * options.dpr;
  canvas.height = cssHeight * options.dpr;
  ctx.setTransform(options.dpr, 0, 0, options.dpr, 0, 0);
  const projection = createProjection(cssWidth, cssHeight, -0.8);
  drawBackdrop(ctx, assets, cssWidth, cssHeight);
  drawFloor(ctx, assets, projection);

  const bodyWidth = 80;
  const positions = [-BALANCE_V1.amplitude, 0, BALANCE_V1.amplitude];
  positions.forEach((worldX, index) => {
    drawCat(ctx, assets, {
      bodyId: index === 1 ? 'default' : index === 0 ? 'ginger' : 'calico',
      faceId: index === 1 ? 'happy' : 'focused',
      xPx: screenX(projection, worldX),
      bottomPx: screenY(projection, 0),
      logicalWidthPx: bodyWidth,
      overlay: true,
      label: `travel ${worldX.toFixed(1)}`
    });
  });

  ctx.fillStyle = '#24322d';
  ctx.font = '12px ui-monospace, monospace';
  ctx.fillText('worldWidth 10 | floor y0 | travel extremes +/-3.2 | cameraBottom -0.8', 16, 20);
  ctx.fillText('Floor source topLineY 22 maps to world y0; 4.4-wide physical floor', 16, cssHeight - 10);
}
