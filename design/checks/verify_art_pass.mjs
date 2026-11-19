import { readFileSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import assert from 'node:assert/strict';

// Static handoff checks only: no browser decoder, pixel bounds or visual claims.
const project = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const root = resolve(project, 'art/production-01');
const manifestPath = resolve(root, 'manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const archive = resolve(project, 'art/cat-tower-art-pass-01-approved.tar.gz');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const close = (a, b) => assert.ok(Math.abs(a - b) < 1e-8);
const local = url => {
  assert.match(url, /^[a-zA-Z0-9_./-]+$/);
  assert.ok(!url.startsWith('/') && !url.split('/').includes('..'));
  return resolve(root, url);
};
const source = url => readFileSync(local(url), 'utf8');
const header = (url, width, height) => {
  const svg = source(url);
  assert.match(svg, new RegExp(`viewBox="0 0 ${width} ${height}"`));
  assert.match(svg, new RegExp(`width="${width}"`));
  assert.match(svg, new RegExp(`height="${height}"`));
};

assert.equal(manifest.manifestVersion, 1);
assert.equal(manifest.files.length, 21);
assert.equal(new Set(manifest.files.map(f => f.url)).size, 21);
for (const file of manifest.files) {
  assert.equal(statSync(local(file.url)).size, file.bytes);
  const svg = source(file.url);
  assert.match(svg, /^<svg\s/);
  assert.match(svg, /xmlns="http:\/\/www.w3.org\/2000\/svg"/);
  assert.match(svg, /<\/svg>\s*$/);
  // These delivered files are simple paths/shapes. This is a source scan,
  // not a general-purpose SVG parser or a browser compatibility test.
  assert.doesNotMatch(svg, /<(?:script|foreignObject|image|text|style)\b|\bon\w+\s*=|(?:xlink:)?href\s*=/i);
  for (const ref of svg.matchAll(/url\(([^)]+)\)/g)) assert.match(ref[1], /^#[\w-]+$/);
}
assert.deepEqual(manifest.bodies.map(b => b.id).sort(), ['calico', 'default', 'ginger', 'tuxedo']);
for (const b of manifest.bodies) {
  assert.deepEqual(b.sourceSize, [512, 384]);
  header(b.url, ...b.sourceSize);
  const [x, y, w, h] = b.logicalRectPx;
  [x, y, w, h, ...b.pivotPx].forEach(n => assert.ok(Number.isFinite(n)));
  assert.ok(w > 0 && h > 0);
  close(w / h, 1.55); close(b.pivotPx[0], x + w / 2); close(b.pivotPx[1], y + h);
  assert.deepEqual(b.faceAnchorBodyUV, [0.5, 0.48]);
  assert.ok(x >= 0 && y >= 0 && x + w <= 512 && y + h <= 384);
}
assert.deepEqual(manifest.faces.map(f => f.id).sort(), ['dizzy', 'focused', 'happy', 'idle', 'surprised', 'worried']);
for (const f of manifest.faces) {
  assert.deepEqual(f.sourceSize, [128, 128]); header(f.url, 128, 128);
  assert.deepEqual(f.anchorPx, [64, 64]);
  close(f.renderWidthBodyFraction, 0.45);
}
header(manifest.background.url, ...manifest.background.sourceSize);
assert.deepEqual(manifest.background.sourceSize, [576, 1024]);
assert.equal(manifest.floor.topPx, 4);
const members = execFileSync('tar', ['-tzf', archive], { encoding: 'utf8' }).trim().split('\n');
const member = suffix => {
  const found = members.filter(n => n.endsWith('/' + suffix));
  assert.equal(found.length, 1);
  return execFileSync('tar', ['-xOzf', archive, found[0]]);
};
const historical = JSON.parse(member('manifest.json'));
for (const file of manifest.files) assert.ok(member(file.url).equals(readFileSync(local(file.url))));
const bytesFor = urls => urls.reduce((n, url) => n + statSync(local(url)).size, 0);
const defaultAndFaces = bytesFor([manifest.bodies.find(b => b.id === 'default').url, ...manifest.faces.map(f => f.url)]);
const optionalCoats = bytesFor(manifest.bodies.filter(b => b.id !== 'default').map(b => b.url));
assert.ok(defaultAndFaces <= 250000 && optionalCoats <= 600000);
assert.ok(statSync(local(manifest.background.url)).size <= 350000);
console.log(JSON.stringify({
  checkedAt: new Date().toISOString(), scope: 'static files/metadata/archive only',
  runtimeFiles: manifest.files.length, runtimeBytes: bytesFor(manifest.files.map(f => f.url)),
  defaultAndFacesBytes: defaultAndFaces, optionalCoatsBytes: optionalCoats,
  backgroundBytes: statSync(local(manifest.background.url)).size,
  geometryMetadata: 'pass', localPathsAndSourceScan: 'pass', archiveRuntimeFilesIdentical: true,
  currentArtStatus: manifest.artStatus, archiveArtStatus: historical.artStatus,
  approvalReference: manifest.approvalReference,
  manifestSHA256: hash(readFileSync(manifestPath)), archiveSHA256: hash(readFileSync(archive)),
  unchecked: ['browser decoding', 'painted decorative bounds/alpha', '80px expression legibility', 'renderer anchors/transforms', 'portrait/landscape gameplay', 'real devices', 'final selected-source runtime pack and adaptation approval']
}, null, 2));
