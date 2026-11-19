/**
 * M4B audit: standardized startup transfer and response headers.
 * Read-only against dist and the accepted loopback preview.
 *
 * Run after `npm run build:test`:
 *   node .test-build/scripts/audit-transfer.js
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { request } from 'node:http';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const appRoot = fileURLToPath(new URL('../..', import.meta.url));
const distRoot = join(appRoot, 'dist');
const evidenceRoot = resolve(appRoot, '..', 'evidence', process.env.M4_EVIDENCE_DIR ?? 'm4b');
const origin = 'http://127.0.0.1:4177';

const artFiles = [
  'assets/production-02/manifest.runtime.json',
  'assets/production-02/runtime/background-main.svg',
  'assets/production-02/runtime/bodies/default.svg',
  'assets/production-02/runtime/bodies/ginger.svg',
  'assets/production-02/runtime/bodies/tuxedo-legibility.svg',
  'assets/production-02/runtime/bodies/calico.svg',
  'assets/production-02/runtime/faces/idle.svg',
  'assets/production-02/runtime/faces/focused.svg',
  'assets/production-02/runtime/faces/happy.svg',
  'assets/production-02/runtime/faces/surprised.svg',
  'assets/production-02/runtime/faces/worried.svg',
  'assets/production-02/runtime/faces/dizzy.svg',
  'assets/production-02/runtime/floor.svg'
] as const;

interface FileMeasure {
  readonly path: string;
  readonly rawBytes: number;
  readonly gzip6: number;
  readonly gzip9: number;
  readonly sha256: string;
  readonly headers: {
    readonly status: number | null;
    readonly contentType: string | null;
    readonly contentLength: string | null;
    readonly contentEncoding: string | null;
    readonly cacheControl: string | null;
    readonly etag: string | null;
  };
}

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(path));
    else if (entry.isFile()) out.push(path);
  }
  return out;
}

function head(path: string): Promise<FileMeasure['headers']> {
  return new Promise((resolvePromise) => {
    const req = request(`${origin}${path}`, { method: 'HEAD', headers: { 'Accept-Encoding': 'gzip' } }, (response) => {
      resolvePromise({
        status: response.statusCode ?? null,
        contentType: response.headers['content-type'] ?? null,
        contentLength: response.headers['content-length'] ?? null,
        contentEncoding: response.headers['content-encoding'] ?? null,
        cacheControl: response.headers['cache-control'] ?? null,
        etag: response.headers.etag ?? null
      });
      response.resume();
    });
    req.on('error', () => {
      resolvePromise({
        status: null,
        contentType: null,
        contentLength: null,
        contentEncoding: null,
        cacheControl: null,
        etag: null
      });
    });
    req.end();
  });
}

async function measure(path: string, headers: FileMeasure['headers']): Promise<FileMeasure> {
  const absolute = join(distRoot, path);
  const buffer = readFileSync(absolute);
  return {
    path,
    rawBytes: buffer.length,
    gzip6: gzipSync(buffer, { level: 6 }).length,
    gzip9: gzipSync(buffer, { level: 9 }).length,
    sha256: createHash('sha256').update(buffer).digest('hex'),
    headers
  };
}

const indexHtml = readFileSync(join(distRoot, 'index.html'), 'utf8');
const referenced = [...indexHtml.matchAll(/(?:src|href)="\.?\/?([^"?#]+\.(?:js|css))"/g)]
  .map((match) => match[1])
  .filter((value): value is string => value !== undefined);
const startupJsCss = [...new Set(referenced)];
const allBuilt = walk(join(distRoot, 'assets'))
  .map((path) => relative(distRoot, path).replaceAll('\\', '/'))
  .filter((path) => path.endsWith('.js') || path.endsWith('.css'))
  .sort();
const diagnostics = allBuilt.filter((path) => path.includes('diagnostics'));

const startupMeasured = await Promise.all(startupJsCss.map(async (path) => measure(path, await head(`/${path}`))));
const startupPaths = new Set(startupMeasured.map((row) => row.path));
const allBuiltMeasured = await Promise.all(allBuilt.map(async (path) => measure(path, await head(`/${path}`))));
const artMeasured = await Promise.all(artFiles.map(async (path) => measure(path, await head(`/${path}`))));
const htmlMeasured = await measure('index.html', await head('/'));

const sum = (rows: readonly FileMeasure[], key: 'rawBytes' | 'gzip6' | 'gzip9'): number =>
  rows.reduce((total, row) => total + row[key], 0);
const distFiles = walk(distRoot);
const distBytes = distFiles.reduce((total, path) => total + statSync(path).size, 0);

const startupRaw = sum(startupMeasured, 'rawBytes');
const startupGzip6 = sum(startupMeasured, 'gzip6');
const startupGzip9 = sum(startupMeasured, 'gzip9');
const artRaw = sum(artMeasured, 'rawBytes');
const artGzip6 = sum(artMeasured, 'gzip6');
const coldLoadRaw = htmlMeasured.rawBytes + startupRaw + artRaw;
const coldLoadGzip6 = htmlMeasured.gzip6 + startupGzip6 + artGzip6;

const result = {
  audit: 'M4B standardized startup transfer',
  origin,
  method: {
    startupJsCss: 'files referenced by dist/index.html as module script or stylesheet, including modulepreload',
    gzip: 'Node zlib.gzipSync per file at level 6 and level 9; never concatenated',
    html: 'index.html raw/gzip measured separately',
    art: 'mapped production runtime files loaded by ordinary play; original unmapped tuxedo.svg excluded',
    coldLoad: 'index.html + startup JS/CSS + mapped art, raw and per-file gzip6'
  },
  dist: {
    bytes: distBytes,
    fileCount: distFiles.length
  },
  index: htmlMeasured,
  startupJsCss: startupMeasured,
  allBuiltJsCss: allBuiltMeasured,
  diagnostics: allBuiltMeasured.filter((row) => diagnostics.includes(row.path)),
  art: artMeasured,
  totals: {
    startupRaw,
    startupGzip6,
    startupGzip9,
    artRaw,
    artGzip6,
    coldLoadRaw,
    coldLoadGzip6,
    coldLoadRequests: 1 + startupMeasured.length + artMeasured.length,
    browserSubresourceRequests: startupMeasured.length + artMeasured.length
  },
  gates: {
    startupJsCssGzip6Limit: 200000,
    startupJsCssGzip6Pass: startupGzip6 <= 200000,
    releaseFirstLoadRawLimit: 2000000,
    releaseFirstLoadRawPass: coldLoadRaw <= 2000000
  },
  server: {
    contentEncodingObserved: startupMeasured.find((row) => row.headers.contentEncoding !== null)?.headers.contentEncoding ?? null,
    cacheControl: htmlMeasured.headers.cacheControl,
    note: 'HEAD with Accept-Encoding: gzip against the loopback Vite preview; no Content-Encoding was returned.'
  }
};

mkdirSync(evidenceRoot, { recursive: true });
writeFileSync(join(evidenceRoot, 'transfer.json'), `${JSON.stringify(result, null, 2)}\n`);
const csvRows: Array<readonly [string, FileMeasure]> = [
  ['html', htmlMeasured],
  ...startupMeasured.map((row) => ['startup', row] as const),
  ...artMeasured.map((row) => ['art', row] as const),
  ...allBuiltMeasured.filter((row) => !startupPaths.has(row.path)).map((row) => ['optional', row] as const)
];
const csv = [
  'group,path,raw_bytes,gzip6,gzip9,content_type,content_length,content_encoding,cache_control',
  ...csvRows.map(([group, row]) => [
    group,
    row.path,
    row.rawBytes,
    row.gzip6,
    row.gzip9,
    row.headers.contentType ?? '',
    row.headers.contentLength ?? '',
    row.headers.contentEncoding ?? '',
    row.headers.cacheControl ?? ''
  ].join(','))
].join('\n');
writeFileSync(join(evidenceRoot, 'transfer.csv'), `${csv}\n`);

console.log(JSON.stringify({
  dist: result.dist,
  startup: { raw: startupRaw, gzip6: startupGzip6, gzip9: startupGzip9, files: startupMeasured.length },
  art: { raw: artRaw, gzip6: artGzip6, files: artMeasured.length },
  coldLoad: { raw: coldLoadRaw, gzip6: coldLoadGzip6, requests: result.totals.coldLoadRequests },
  gates: result.gates,
  contentEncoding: result.server.contentEncodingObserved,
  cacheControl: result.server.cacheControl,
  files: result.startupJsCss.map((row) => `${row.path} raw=${row.rawBytes} g6=${row.gzip6} g9=${row.gzip9}`)
}, null, 2));
