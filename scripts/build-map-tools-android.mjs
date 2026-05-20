#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const execFile = promisify(execFileCallback);
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const webDir = path.join(repoRoot, 'dist', 'map-tools-android');
const fallbackGithubRepository = 'curviosclash-gif/Rohre-3D-erster-stand';

const copyEntries = [
  ['tools/plan-map/index.html', 'tools/plan-map/index.html'],
  ['tools/plan-map/viewer.css', 'tools/plan-map/viewer.css'],
  ['tools/plan-map/viewer.js', 'tools/plan-map/viewer.js'],
  ['tools/repo-map/index.html', 'tools/repo-map/index.html'],
  ['tools/repo-map/viewer.css', 'tools/repo-map/viewer.css'],
  ['tools/repo-map/viewer.js', 'tools/repo-map/viewer.js'],
  ['tools/map-tools-android/index.html', 'index.html'],
  ['tools/map-tools-android/map-tools-android.css', 'map-tools-android.css'],
  ['tools/map-tools-android/map-tools-android.js', 'map-tools-android.js'],
];

async function copyFile(relativeSource, relativeTarget) {
  const source = path.join(repoRoot, relativeSource);
  const target = path.join(webDir, relativeTarget);
  await fs.mkdir(path.dirname(target), { recursive: true });
  await fs.copyFile(source, target);
}

async function runNode(script, outputPath) {
  await execFile(process.execPath, [script, '--out', outputPath], {
    cwd: repoRoot,
    windowsHide: true,
    timeout: 120_000,
    maxBuffer: 8 * 1024 * 1024,
  });
}

function normalizeGithubRepository(value) {
  const repository = String(value || '').trim()
    .replace(/^https:\/\/github\.com\//, '')
    .replace(/^git@github\.com:/, '')
    .replace(/\.git$/, '')
    .replace(/^\/+|\/+$/g, '');
  return /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository)
    ? repository
    : fallbackGithubRepository;
}

async function detectGithubRepository() {
  if (process.env.CURVIOS_MAP_TOOLS_GITHUB_REPOSITORY) {
    return normalizeGithubRepository(process.env.CURVIOS_MAP_TOOLS_GITHUB_REPOSITORY);
  }
  try {
    const { stdout } = await execFile('git', ['config', '--get', 'remote.origin.url'], {
      cwd: repoRoot,
      windowsHide: true,
      timeout: 10_000,
      maxBuffer: 64 * 1024,
    });
    return normalizeGithubRepository(stdout);
  } catch {
    return fallbackGithubRepository;
  }
}

function createGithubUpdateConfig(repository) {
  return {
    provider: 'github-releases',
    repository,
    apiUrl: `https://api.github.com/repos/${repository}/releases/latest`,
    latestReleaseUrl: `https://github.com/${repository}/releases/latest`,
  };
}

async function writeManifest() {
  const githubRepository = await detectGithubRepository();
  const manifest = {
    contract: 'curvios.map-tools-android.v1',
    generatedAt: new Date().toISOString(),
    readOnly: true,
    app: {
      id: 'de.curviosclash.maps',
      name: 'Curvios Map Tools',
    },
    views: [
      {
        id: 'plan',
        label: 'Plan Map',
        path: './tools/plan-map/index.html',
        data: './tmp/plan-map/plan-map.json',
      },
      {
        id: 'repo',
        label: 'Repo Map',
        path: './tools/repo-map/index.html',
        data: './tmp/repo-map/repo-map.json',
      },
    ],
    updates: createGithubUpdateConfig(githubRepository),
  };
  await fs.writeFile(
    path.join(webDir, 'map-tools-android.manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );
}

async function main() {
  await fs.rm(webDir, { recursive: true, force: true });
  await fs.mkdir(webDir, { recursive: true });

  await Promise.all(copyEntries.map(([source, target]) => copyFile(source, target)));
  await runNode('scripts/export-plan-map.mjs', 'dist/map-tools-android/tmp/plan-map/plan-map.json');
  await runNode('scripts/export-repo-map.mjs', 'dist/map-tools-android/tmp/repo-map/repo-map.json');
  await writeManifest();

  process.stdout.write(`map-tools-android: wrote ${path.relative(repoRoot, webDir)}\n`);
}

main().catch((error) => {
  process.stderr.write(`map-tools-android: ${error.stack || error.message}\n`);
  process.exitCode = 1;
});
