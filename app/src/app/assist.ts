import { BALANCE_V1, supportCenterX } from '../domain/balance.js';
import { evaluatePlacement, prepareDrop } from '../domain/placement.js';
import type { BalanceConfig, PlacementResult, SettledCat } from '../domain/types.js';

export interface AssistPreview {
  readonly offset: number;
  readonly overlapRatio: number;
  readonly snappedX: number;
  readonly result: PlacementResult;
  readonly onFloor: boolean;
}

export function computeAssistPreview(
  cats: readonly SettledCat[],
  incomingX: number,
  config: BalanceConfig = BALANCE_V1
): AssistPreview {
  const supportX = supportCenterX(cats);
  const prepared = prepareDrop(incomingX, supportX, config);
  const result = evaluatePlacement(cats, prepared.finalX, prepared.releaseOffset, config);
  const supportLeft = cats.length === 0 ? -config.floorWidth / 2 : supportX - config.width / 2;
  const supportRight = cats.length === 0 ? config.floorWidth / 2 : supportX + config.width / 2;
  const left = Math.max(prepared.finalX - config.width / 2, supportLeft);
  const right = Math.min(prepared.finalX + config.width / 2, supportRight);
  const overlap = Math.max(0, right - left);
  return Object.freeze({
    offset: prepared.releaseOffset,
    overlapRatio: Math.min(1, overlap / config.width),
    snappedX: prepared.finalX,
    result,
    onFloor: cats.length === 0
  });
}

export function safetyBand(safety: number): 'steady' | 'caution' | 'danger' {
  if (safety >= 0.35) return 'steady';
  if (safety >= 0.15) return 'caution';
  return 'danger';
}

export function safetyLabel(safety: number): string {
  const band = safetyBand(safety);
  return band === 'steady' ? 'Steady' : band === 'caution' ? 'Wobbly' : 'Very wobbly';
}

export function formatOffset(offset: number, onFloor = false): string {
  const support = onFloor ? 'the floor center' : 'the top cat';
  if (Math.abs(offset) < 0.005) return onFloor ? 'Centered on the floor' : 'Centered on the top cat';
  return `${Math.abs(offset).toFixed(2)} ${offset > 0 ? 'right' : 'left'} of ${support}`;
}

export function assistPrediction(preview: AssistPreview): string {
  const result = preview.result;
  if (result.ok) {
    return `Stable if dropped (${safetyLabel(result.safety).toLowerCase()})`;
  }
  if (result.reason === 'MISS_TOP') {
    return preview.onFloor ? 'Will miss the platform' : 'Will miss the top cat';
  }
  return `Tower will tip at joint ${result.failureJoint}`;
}
