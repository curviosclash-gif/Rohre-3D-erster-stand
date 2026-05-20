#!/usr/bin/env node
import { execFile as execFileCallback } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = path.join(repoRoot, 'tools', 'mobile-classic-app');
const capacitorCli = path.join(repoRoot, 'node_modules', '@capacitor', 'cli', 'bin', 'capacitor');

const action = String(process.argv[2] || 'sync').trim().toLowerCase();

async function runNodeScript(scriptRelativePath) {
  await execFile(process.execPath, [path.join(repoRoot, scriptRelativePath)], {
    cwd: repoRoot,
    windowsHide: true,
    timeout: 180_000,
    maxBuffer: 8 * 1024 * 1024,
  });
}

async function runCapacitor(args, timeout = 180_000) {
  await execFile(process.execPath, [capacitorCli, ...args], {
    cwd: appRoot,
    windowsHide: true,
    timeout,
    maxBuffer: 16 * 1024 * 1024,
  });
}

async function main() {
  if (!['add', 'sync', 'copy', 'open', 'apk', 'doctor'].includes(action)) {
    throw new Error(`Unsupported action: ${action}`);
  }

  if (action === 'doctor') {
    await runCapacitor(['doctor', 'android']);
    return;
  }

  if (action !== 'open') {
    await runNodeScript('scripts/build-mobile-classic-app.mjs');
  }

  if (action === 'add') {
    await runCapacitor(['add', 'android'], 240_000);
  } else if (action === 'copy') {
    await runCapacitor(['copy', 'android']);
  } else if (action === 'sync') {
    await runCapacitor(['sync', 'android'], 240_000);
  } else if (action === 'open') {
    await runCapacitor(['open', 'android']);
  } else if (action === 'apk') {
    await runCapacitor(['sync', 'android'], 240_000);
    await runCapacitor(['build', 'android', '--androidreleasetype', 'APK'], 600_000);
  }
}

main().catch((error) => {
  process.stderr.write(`mobile-classic-capacitor: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
