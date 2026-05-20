#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import {
  createMobileClassicGithubUpdateConfig,
  normalizeMobileClassicGithubRepository,
} from '../src/mobile-classic/MobileClassicUpdateConfig.js';

const execFile = promisify(execFileCallback);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(repoRoot, 'dist', 'mobile-classic');

process.env.VITE_APP_MODE = 'app';
process.env.VITE_APP_TARGET = 'mobile-classic';

async function detectGithubRepository() {
  if (process.env.CURVIOS_CLASSIC_APP_GITHUB_REPOSITORY) {
    return normalizeMobileClassicGithubRepository(process.env.CURVIOS_CLASSIC_APP_GITHUB_REPOSITORY);
  }
  try {
    const { stdout } = await execFile('git', ['config', '--get', 'remote.origin.url'], {
      cwd: repoRoot,
      windowsHide: true,
      timeout: 10_000,
      maxBuffer: 64 * 1024,
    });
    return normalizeMobileClassicGithubRepository(stdout);
  } catch {
    return normalizeMobileClassicGithubRepository();
  }
}

async function writeManifest() {
  const githubRepository = await detectGithubRepository();
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
    updates: createMobileClassicGithubUpdateConfig(githubRepository),
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
