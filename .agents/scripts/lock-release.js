#!/usr/bin/env node
/**
 * lock-release.js
 * CLI: node .agents/scripts/lock-release.js V64 alice
 *
 * Removes in-progress lock entries for alice's V64 from docs/lock-status/alice.json.
 *
 * Exit codes:
 *   0 = OK
 *   1 = Error
 *   2 = Usage error / file not found
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(process.cwd());
const LOCK_DIR = join(ROOT, 'docs', 'lock-status');

// Parse positional args
const args = process.argv.slice(2);
const blockArg = args.find(a => !a.startsWith('-'));
const personArg = args.filter(a => !a.startsWith('-'))[1];
const allFlag = args.includes('--all');

if (!blockArg || !personArg) {
  console.error('Verwendung: node .agents/scripts/lock-release.js <BlockId> <person> [--all]');
  console.error('Beispiel:   node .agents/scripts/lock-release.js V64 alice');
  process.exit(2);
}

const blockId = blockArg.startsWith('V') ? blockArg : `V${blockArg}`;
const person = personArg;

async function main() {
  const lockFile = join(LOCK_DIR, `${person}.json`);

  if (!existsSync(lockFile)) {
    console.error(`  ✗ Lock-File nicht gefunden: ${lockFile.replace(ROOT, '.')}`);
    console.error(`    Person ${person} hat noch keine Lock-File.`);
    process.exit(2);
  }

  const lockData = JSON.parse(readFileSync(lockFile, 'utf8'));
  const before = lockData.locks.length;

  // Filter: remove in-progress locks for this block (or all locks for this block if --all)
  lockData.locks = lockData.locks.filter(lock => {
    if (lock.block_id !== blockId) return true; // keep locks for other blocks
    if (allFlag) return false; // remove all for this block
    return lock.status !== 'in-progress'; // remove only active
  });

  const removed = before - lockData.locks.length;

  if (removed === 0) {
    console.warn(`  ⚠ Keine in-progress Locks fuer ${blockId} bei ${person} gefunden.`);
    process.exit(2);
  }

  lockData.timestamp = new Date().toISOString();
  writeFileSync(lockFile, JSON.stringify(lockData, null, 2) + '\n', 'utf8');

  console.log(`  ✓ ${removed} Lock(s) fuer ${blockId} (${person}) entfernt.`);
  console.log(`    Lock-File: ${lockFile.replace(ROOT, '.')}`);

  // Regenerate registry
  try {
    execSync('node .agents/scripts/lock-registry-merger.js', { cwd: ROOT, stdio: 'pipe' });
    console.log('  Registry aktualisiert.');
  } catch (_) {
    console.warn('  Registry-Update fehlgeschlagen - manuell: npm run lock:validate');
  }

  console.log('\n  Naechster Schritt:');
  console.log(`    git add docs/lock-status/${person}.json`);
  console.log(`    git commit -m "docs(${blockId}): ${person} released lock"`);

  process.exit(0);
}

main().catch(err => {
  console.error('Fehler in lock-release:', err.message);
  process.exit(1);
});
