import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const appRoot = fileURLToPath(new URL('../..', import.meta.url));
const evidenceRoot = resolve(appRoot, '..', 'evidence', 'm4b');

export default defineConfig({
  root: appRoot,
  server: {
    host: '127.0.0.1',
    port: 4181,
    strictPort: true
  },
  plugins: [
    {
      name: 'cat-tower-audit-write',
      configureServer(server) {
        server.middlewares.use('/__audit-write', (request, response) => {
          if (request.method !== 'POST') {
            response.statusCode = 405;
            response.end('POST required');
            return;
          }
          const chunks: Buffer[] = [];
          request.on('data', (chunk: Buffer) => chunks.push(chunk));
          request.on('end', () => {
            try {
              const body = Buffer.concat(chunks).toString('utf8');
              writeFileSync(resolve(evidenceRoot, 'renderer.json'), `${body}\n`);
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
