/**
 * Local timing report for placement evaluation. VPS numbers are not phone
 * validation; they only show the evaluator's scaling on this machine.
 *
 * Run: npm run bench
 */
import { performance } from 'node:perf_hooks';
import { BALANCE_V1 } from '../src/domain/balance.js';
import { evaluatePlacement } from '../src/domain/placement.js';
import type { SettledCat } from '../src/domain/types.js';

const SIZES = [100, 250, 500, 1000, 2000] as const;
const ITERATIONS: Readonly<Record<(typeof SIZES)[number], number>> = {
  100: 5000,
  250: 3000,
  500: 2000,
  1000: 1000,
  2000: 500
};

function tower(size: number): readonly SettledCat[] {
  const cats: SettledCat[] = [];
  for (let i = 0; i < size; i += 1) {
    cats.push(
      Object.freeze({
        id: i + 1,
        x: 0,
        bottom: i * BALANCE_V1.height,
        skinId: 'default'
      })
    );
  }
  return Object.freeze(cats);
}

function percentile(sorted: readonly number[], fraction: number): number {
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(fraction * sorted.length) - 1));
  return sorted[index] ?? 0;
}

console.log(
  `Nekotsumi placement benchmark | Node ${process.version} | ${process.arch} | balance v${BALANCE_V1.version}`
);
console.log('cats\titerations\tmean_ms\tp50_ms\tp95_ms\n');

for (const size of SIZES) {
  const cats = tower(size);
  for (let i = 0; i < 20; i += 1) {
    const warm = evaluatePlacement(cats, 0, 0);
    if (!warm.ok) throw new Error(`unexpected warmup failure at ${size} cats`);
  }

  const iterations = ITERATIONS[size];
  const samples: number[] = [];
  for (let i = 0; i < iterations; i += 1) {
    const start = performance.now();
    const result = evaluatePlacement(cats, 0, 0);
    const elapsed = performance.now() - start;
    if (!result.ok) throw new Error(`unexpected failure at ${size} cats`);
    if (Math.abs(result.safety - 1) > 1e-12) {
      throw new Error(`unexpected safety at ${size} cats: ${result.safety}`);
    }
    samples.push(elapsed);
  }

  samples.sort((a, b) => a - b);
  const mean = samples.reduce((sum, value) => sum + value, 0) / samples.length;
  console.log(
    `${size}\t${iterations}\t${mean.toFixed(4)}\t${percentile(samples, 0.5).toFixed(4)}\t${percentile(samples, 0.95).toFixed(4)}`
  );
}

console.log('\nLinear scan per evaluation; no recursion and no per-frame history scan.');
