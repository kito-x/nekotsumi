import { loadArtAssets } from './platform/assets.js';
import type { AssetFault, ArtAssets } from './platform/assets.js';
import {
  renderDiagnosticGrid,
  renderDiagnosticProjection
} from './render/diagnostics.js';

const FAULTS: readonly AssetFault[] = [
  'invalid-manifest',
  'missing-body',
  'missing-face',
  'missing-background',
  'decode-body',
  'stall-manifest',
  'stall-image',
  'late-manifest'
];

const params = new URLSearchParams(window.location.search);
const rawDpr = params.get('dpr');
const dpr: 1 | 2 = rawDpr === '2' ? 2 : 1;
const rawFault = params.get('fault');
const fault = FAULTS.includes(rawFault as AssetFault) ? (rawFault as AssetFault) : null;
const status = document.querySelector<HTMLElement>('#diag-status');
const grid = document.querySelector<HTMLCanvasElement>('#diag-grid');
const projection = document.querySelector<HTMLCanvasElement>('#diag-projection');

function setStatus(text: string): void {
  if (status) status.textContent = text;
}

function describe(assets: ArtAssets): string {
  const approval = assets.manifest?.appearanceApproval;
  const count = Object.values(assets.bodies).filter((body) => body?.image !== null && body !== null).length +
    Object.values(assets.faces).filter((face) => face?.image !== null && face !== null).length +
    (assets.background ? 1 : 0) +
    (assets.floor ? 1 : 0);
  const prefix = `forced DPR ${dpr} | device DPR ${window.devicePixelRatio} | ${count}/12 mapped runtime SVGs decoded | artReady=${String(assets.artReady)}`;
  const approvalText = approval
    ? ` | appearance card ${approval.card} (appearance only; technical checks provisional)`
    : ' | appearance approval metadata unavailable';
  const variant = assets.manifest?.variantApproval;
  const variantText = variant
    ? ` | variant ${variant.variantId} on ${variant.appliesTo} (${variant.sha256.slice(0, 12)}…, ${variant.bytes} B)`
    : '';
  if (assets.errors.length === 0) return `${prefix}${approvalText}${variantText}`;
  return `${prefix} | fallback: ${assets.errors.slice(0, 3).join('; ')}${approvalText}${variantText}`;
}

async function main(): Promise<void> {
  if (!grid || !projection) {
    setStatus('Diagnostic canvases are missing.');
    return;
  }
  const baseHref = new URL('assets/production-02/', document.baseURI).href;
  let assets: ArtAssets;
  try {
    assets = await loadArtAssets(baseHref, { fault });
  } catch (error) {
    setStatus(`Asset load failed: ${String(error)}`);
    return;
  }
  setStatus(describe(assets));
  renderDiagnosticGrid(grid, assets, { dpr });
  renderDiagnosticProjection(projection, assets, { dpr });
  document.documentElement.dataset.diagDpr = String(dpr);
  document.documentElement.dataset.diagFault = fault ?? 'none';
}

void main();
