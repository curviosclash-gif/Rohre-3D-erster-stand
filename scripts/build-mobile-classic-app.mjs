#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(repoRoot, 'dist', 'mobile-classic');

process.env.VITE_APP_MODE = 'app';
process.env.VITE_APP_TARGET = 'mobile-classic';

async function writeManifest() {
  const manifest = {
    contract: 'curvios.mobile-classic-app.v1',
    generatedAt: new Date().toISOString(),
    app: {
      id: 'de.curviosclash.classic',
      name: 'Curvios Clash Classic',
      target: 'mobile-classic',
    },
    modeScope: {
      sessionType: 'single',
      modePath: 'normal',
      gameMode: 'CLASSIC',
    },
    webDir: 'dist/mobile-classic',
  };
  await fs.writeFile(
    path.join(webDir, 'mobile-classic.manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

async function main() {
  const { build } = await import('vite');
  await build({ mode: 'app' });
  await writeManifest();
  process.stdout.write(`mobile-classic-app: wrote ${path.relative(repoRoot, webDir)}\n`);
}

main().catch((error) => {
  process.stderr.write(`mobile-classic-app: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
