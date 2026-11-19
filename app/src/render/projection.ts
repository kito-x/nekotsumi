import { BALANCE_V1 } from '../domain/balance.js';

export interface Projection {
  readonly cssWidth: number;
  readonly cssHeight: number;
  readonly scale: number;
  readonly worldHeight: number;
  readonly cameraBottom: number;
}

export function createProjection(
  cssWidth: number,
  cssHeight: number,
  cameraBottom: number
): Projection {
  const scale = cssWidth / 10;
  return {
    cssWidth,
    cssHeight,
    scale,
    worldHeight: cssHeight / scale,
    cameraBottom
  };
}

export function screenX(projection: Projection, worldX: number): number {
  return (worldX + 5) * projection.scale;
}

export function screenY(projection: Projection, worldY: number): number {
  return projection.cssHeight - (worldY - projection.cameraBottom) * projection.scale;
}

/** Camera target from 03-hld: support top at about 40% of the viewport. */
export function cameraBottomTarget(supportTop: number, worldHeight: number): number {
  return Math.max(-0.8, supportTop - 0.4 * worldHeight);
}

export function catHeightPx(projection: Projection): number {
  return BALANCE_V1.height * projection.scale;
}

export function catWidthPx(projection: Projection): number {
  return BALANCE_V1.width * projection.scale;
}
