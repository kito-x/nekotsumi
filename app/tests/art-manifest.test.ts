import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const appRoot = process.cwd();
const assetRoot = join(appRoot, 'public', 'assets', 'production-02');
const runtimeRoot = join(assetRoot, 'runtime');

function svgFiles(directory: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(directory)) {
    const full = join(directory, entry);
    if (statSync(full).isDirectory()) out.push(...svgFiles(full));
    else if (entry.endsWith('.svg')) out.push(full);
  }
  return out;
}

function sha256(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex');
}

test('approved CT-ART-004 tuxedo variant is the only active tuxedo asset', () => {
  const manifestPath = join(assetRoot, 'manifest.runtime.json');
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
    bodies: Array<{ id: string; url: string }>;
    faces: Array<{ id: string; url: string }>;
    background: { url: string };
    floor: { url: string };
    variantApproval?: { variantId: string; appliesTo: string; appearanceCard: string; sha256: string; bytes: number };
  };
  const tuxedo = manifest.bodies.find((body) => body.id === 'tuxedo');
  assert.ok(tuxedo !== undefined);
  assert.equal(tuxedo.url, 'bodies/tuxedo-legibility.svg');

  const variant = join(runtimeRoot, 'bodies', 'tuxedo-legibility.svg');
  const variantBytes = readFileSync(variant);
  assert.equal(variantBytes.length, 1586);
  assert.equal(
    sha256(variant),
    '5fb79154049506515fb205226a15168ea8904ba5ea05282c843bc48958590cfb'
  );
  assert.match(
    variantBytes.toString('utf8'),
    /width="512" height="384" viewBox="0 0 512 384"/
  );
  assert.deepEqual(
    {
      variantId: manifest.variantApproval?.variantId,
      appliesTo: manifest.variantApproval?.appliesTo,
      appearanceCard: manifest.variantApproval?.appearanceCard,
      bytes: manifest.variantApproval?.bytes
    },
    {
      variantId: 'ct-art-004',
      appliesTo: 'tuxedo',
      appearanceCard: '95e0f689-310e-4984-b68d-a8588f192e1a',
      bytes: 1586
    }
  );

  // The original tuxedo remains physically retained but unmapped.
  const original = join(runtimeRoot, 'bodies', 'tuxedo.svg');
  assert.equal(readFileSync(original).length, 1422);
  assert.equal(
    sha256(original),
    '6759a36ac0a38f7cda377ce71ca7a6c4fbb4102bbf436be4c8c27da6aeaf245a'
  );

  // 13 physical runtime SVGs; only 12 are mapped by the manifest.
  const physical = svgFiles(runtimeRoot);
  assert.equal(physical.length, 13);
  assert.equal(
    physical.reduce((sum, file) => sum + readFileSync(file).length, 0),
    10739
  );
  const mapped = [
    ...manifest.bodies.map((body) => body.url),
    ...manifest.faces.map((face) => face.url),
    manifest.background.url,
    manifest.floor.url
  ];
  assert.equal(mapped.length, 12);
  assert.equal(
    mapped.reduce((sum, url) => sum + readFileSync(join(runtimeRoot, url)).length, 0),
    9317
  );
});
