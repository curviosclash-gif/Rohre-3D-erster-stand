import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SCRIPT_PATH = path.join(REPO_ROOT, '.agents', 'scripts', 'lock-registry-merger.js');

async function createFixture({ registry, personLock }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'curvios-lock-registry-'));
  const lockDir = path.join(root, 'docs', 'lock-status');
  await fs.mkdir(lockDir, { recursive: true });
  await fs.writeFile(path.join(lockDir, 'codex.json'), JSON.stringify(personLock, null, 2) + '\n', 'utf8');
  await fs.writeFile(path.join(lockDir, '_locks-registry.json'), JSON.stringify(registry, null, 2) + '\n', 'utf8');
  return { root, registryPath: path.join(lockDir, '_locks-registry.json') };
}

function runMerger(root, args = ['--validate']) {
  return spawnSync(process.execPath, [SCRIPT_PATH, ...args], {
    cwd: root,
    encoding: 'utf8',
  });
}

function sampleLock() {
  return {
    person: 'codex',
    locks: [
      {
        block_id: 'V999',
        phase: '999.1',
        scope_files: ['scripts/example.mjs'],
        start_date: '2026-05-22',
        target_completion: '2026-05-22',
        status: 'in-progress',
        notes: 'test lock',
      },
    ],
  };
}

function expectedRegistry({ locks, generatedAt = '2026-05-22T00:00:00.000Z' }) {
  return {
    generated_at: generatedAt,
    locks,
    metadata: {
      format_version: '1.0',
      expected_lock_files: ['codex.json'],
    },
  };
}

test('lock registry validate does not rewrite timestamp-only changes', async () => {
  const lock = sampleLock();
  const registry = expectedRegistry({
    locks: [
      {
        person: 'codex',
        block_id: 'V999',
        phase: '999.1',
        scope_files: ['scripts/example.mjs'],
        start_date: '2026-05-22',
        target_completion: '2026-05-22',
        status: 'in-progress',
        notes: 'test lock',
      },
    ],
  });
  const { root, registryPath } = await createFixture({ registry, personLock: lock });
  const before = await fs.readFile(registryPath, 'utf8');

  const result = runMerger(root);

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(await fs.readFile(registryPath, 'utf8'), before);
});

test('lock registry validate writes real lock content changes', async () => {
  const lock = sampleLock();
  const registry = expectedRegistry({ locks: [], generatedAt: '2026-05-01T00:00:00.000Z' });
  const { root, registryPath } = await createFixture({ registry, personLock: lock });

  const result = runMerger(root);
  const after = JSON.parse(await fs.readFile(registryPath, 'utf8'));

  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(after.locks.length, 1);
  assert.equal(after.locks[0].block_id, 'V999');
  assert.notEqual(after.generated_at, registry.generated_at);
});
