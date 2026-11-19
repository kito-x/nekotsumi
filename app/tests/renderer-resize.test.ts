import assert from 'node:assert/strict';
import test from 'node:test';
import { emptyArtAssets } from '../src/platform/assets.js';
import { GameRenderer } from '../src/render/renderer.js';

interface StubCanvas {
  readonly canvas: HTMLCanvasElement;
  readonly context: CanvasRenderingContext2D;
}

function stubCanvas(): StubCanvas {
  const context = {
    setTransform: () => undefined,
    imageSmoothingEnabled: false
  } as unknown as CanvasRenderingContext2D;
  const canvas = {
    clientWidth: 320,
    clientHeight: 480,
    width: 0,
    height: 0,
    style: { width: '', height: '' },
    getContext: () => context
  } as unknown as HTMLCanvasElement;
  return { canvas, context };
}

function allocated(width: number, height: number, dpr: number): { width: number; height: number } {
  const { canvas } = stubCanvas();
  const renderer = new GameRenderer(canvas, emptyArtAssets(), false);
  renderer.resize(width, height, dpr);
  return { width: canvas.width, height: canvas.height };
}

test('real renderer resize preserves normal backing and enforces the 2M cap', () => {
  assert.deepEqual(allocated(390, 844, 2), { width: 780, height: 1688 });
  assert.deepEqual(allocated(844, 390, 2), { width: 780, height: 780 });
  assert.deepEqual(allocated(100, 5000, 2), { width: 200, height: 10000 });

  for (const [width, height, dpr] of [
    [1000, 1600, 2],
    [2160, 3840, 2]
  ] as const) {
    const backing = allocated(width, height, dpr);
    assert.ok(Number.isFinite(backing.width) && Number.isFinite(backing.height));
    assert.ok(backing.width >= 1 && backing.height >= 1);
    assert.ok(
      backing.width * backing.height <= 2_000_000,
      `${width}x${height}@${dpr} produced ${backing.width}x${backing.height} = ${backing.width * backing.height}`
    );
  }
});
