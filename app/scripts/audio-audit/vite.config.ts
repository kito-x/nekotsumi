import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const appRoot = fileURLToPath(new URL('../..', import.meta.url));
const evidenceRoot = resolve(appRoot, '..', 'evidence', process.env.M4_AUDIO_EVIDENCE_DIR ?? 'm4d');

export default defineConfig({
  root: appRoot,
  server: { host: '127.0.0.1', port: 4182, strictPort: true },
  plugins: [
    {
      name: 'cat-tower-audio-audit-write',
      configureServer(server) {
        server.middlewares.use('/__audio-write', (request, response) => {
          if (request.method !== 'POST') {
            response.statusCode = 405;
            response.end('POST required');
            return;
          }
          const chunks: Buffer[] = [];
          request.on('data', (chunk: Buffer) => chunks.push(chunk));
          request.on('end', () => {
            try {
              const payload = JSON.parse(Buffer.concat(chunks).toString('utf8')) as {
                measurements: unknown;
                overlap: unknown;
                cancellation: unknown;
                recipe: unknown;
                wavBase64: string;
                index: string;
                note: string;
              };
              mkdirSync(evidenceRoot, { recursive: true });
              writeFileSync(resolve(evidenceRoot, 'audio-offline.json'), `${JSON.stringify({
                measurements: payload.measurements,
                overlap: payload.overlap,
                cancellation: payload.cancellation,
                recipe: payload.recipe,
                note: payload.note
              }, null, 2)}\n`);
              writeFileSync(resolve(evidenceRoot, 'audition-reel.wav'), Buffer.from(payload.wavBase64, 'base64'));
              writeFileSync(resolve(evidenceRoot, 'audition-index.txt'), `${payload.index}\n`);
              response.statusCode = 200;
              response.end('written');
            } catch (error) {
              response.statusCode = 500;
              response.end(String(error));
            }
          });
        });
      }
    }
  ]
});
