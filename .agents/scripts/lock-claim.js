#!/usr/bin/env node
/**
 * lock-claim.js
 * CLI: node .agents/scripts/lock-claim.js V64 alice --phase=64.8.1 --target="2026-04-20"
 *
 * Creates or updates docs/lock-status/alice.json with a new lock for V64.
 * Validates for conflicts with other locks.
 *
 * Exit codes:
 *   0 = OK
 *   1 = Dependency fehlt oder Lock-Konflikt
 *   2 = Soft warning / usage error
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(process.cwd());
const LOCK_DIR = join(ROOT, 'docs', 'lock-status');
const PLANS_ACTIVE = join(ROOT, 'docs', 'plaene', 'aktiv');

// Parse positional and named args
const args = process.argv.slice(2);
const blockArg = args.find(a => !a.startsWith('-'));
const personArg = args.filter(a => !a.startsWith('-'))[1];
const phaseArg = args.find(a => a.startsWith('--phase='))?.split('=')[1];
const targetArg = args.find(a => a.startsWith('--target='))?.split('=')[1];
const notesArg = args.find(a => a.startsWith('--notes='))?.split('=')[1] || '';

if (!blockArg || !personArg) {
  console.error('Verwendung: node .agents/scripts/lock-claim.js <BlockId> <person> --phase=<phase> [--target=<date>] [--notes=<text>]');
  console.error('Beispiel:   node .agents/scripts/lock-claim.js V64 alice --phase=64.8.1 --target="2026-04-20"');
  process.exit(2);
}

const blockId = blockArg.startsWith('V') ? blockArg : `V${blockArg}`;
const person = personArg;
const phase = phaseArg || null;
const targetCompletion = targetArg || '';
const today = new Date().toISOString().split('T')[0];

/**
 * Parse YAML frontmatter.
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};
  const yaml = match[1];
  const result = {};
  let currentKey = null;
  let currentList = null;
  for (const line of yaml.split('\n')) {
    if (line.match(/^  - /)) {
      const val = line.replace(/^  - /, '').trim();
      if (currentList) currentList.push(val);
      continue;
    }
    const kvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const val = kvMatch[2].trim();
      if (val === '') {
        currentList = [];
        result[currentKey] = currentList;
      } else {
        result[currentKey] = val;
        currentList = null;
      }
    }
  }
  return result;
}

/**
 * Find VXX.md.
 */
function findPlanFile(blockId) {
  const candidate = join(PLANS_ACTIVE, `${blockId}.md`);
  if (existsSync(candidate)) return candidate;
  if (existsSync(PLANS_ACTIVE)) {
    for (const f of readdirSync(PLANS_ACTIVE)) {
      if (f.startsWith(blockId) && f.endsWith('.md')) return join(PLANS_ACTIVE, f);
    }
  }
  return null;
}

/**
 * Simple glob matching.
 */
function manualGlobMatch(pattern, filePath) {
  const p = pattern.replace(/\\/g, '/');
  const f = filePath.replace(/\\/g, '/');
  let regexStr = p
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\\\*\\\*/g, '__DOUBLESTAR__')
    .replace(/\*/g, '[^/]*')
    .replace(/__DOUBLESTAR__\//g, '(?:.+/)?')
    .replace(/__DOUBLESTAR__/g, '.*');
  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(f);
}

/**
 * Load all other person lock files.
 */
function loadOtherLocks(excludePerson) {
  const locks = [];
  if (!existsSync(LOCK_DIR)) return locks;
  for (const file of readdirSync(LOCK_DIR)) {
    if (!file.endsWith('.json')) continue;
    if (file.startsWith('_')) continue;
    if (file.includes('.example.')) continue;
    const data = JSON.parse(readFileSync(join(LOCK_DIR, file), 'utf8'));
    if (data.person === excludePerson) continue;
    for (const lock of (data.locks || [])) {
      if (lock.status === 'in-progress') {
        locks.push({ person: data.person, ...lock });
      }
    }
  }
  return locks;
}

/**
 * Check for scope conflicts.
 */
function checkConflicts(newScopeFiles, otherLocks) {
  const conflicts = [];
  for (const lock of otherLocks) {
    for (const newFile of newScopeFiles) {
      for (const existingFile of (lock.scope_files || [])) {
        if (manualGlobMatch(existingFile, newFile) || manualGlobMatch(newFile, existingFile) || newFile === existingFile) {
          conflicts.push({ file: newFile, person: lock.person, phase: `${lock.block_id} ${lock.phase}` });
        }
      }
    }
  }
  return conflicts;
}

async function main() {
  // Find plan file and extract scope_files for the phase
  const planFile = findPlanFile(blockId);
  if (!planFile) {
    console.error(`  ✗ Kein Plan-File fuer Block ${blockId} in ${PLANS_ACTIVE}`);
    process.exit(2);
  }

  const content = readFileSync(planFile, 'utf8');
  const fm = parseFrontmatter(content);
  const scopeFiles = fm.scope_files || [];

  if (scopeFiles.length === 0) {
    console.warn(`  ⚠ Keine scope_files in ${blockId} Plan-File - Lock wird ohne Scope erstellt.`);
  }

  // Check conflicts with other locks
  const otherLocks = loadOtherLocks(person);
  const conflicts = checkConflicts(scopeFiles, otherLocks);

  if (conflicts.length > 0) {
    console.error(`\n  ✗ Lock-Konflikte fuer ${blockId} ${phase || ''}:`);
    for (const c of conflicts) {
      console.error(`    ${c.file} -> bereits gelockt von ${c.person} (${c.phase})`);
    }
    console.error('\n  Aktion: Abstimmung mit dem Lock-Holder erforderlich.');
    process.exit(1);
  }

  // Load or initialize person's lock file
  const lockFile = join(LOCK_DIR, `${person}.json`);
  let lockData;
  if (existsSync(lockFile)) {
    lockData = JSON.parse(readFileSync(lockFile, 'utf8'));
  } else {
    lockData = {
      person,
      timestamp: new Date().toISOString(),
      locks: [],
      current_phase_evidence: {
        phase_id: phase || '',
        completed_items: [],
        last_commit: '',
      },
    };
  }

  // Check if lock for this block+phase already exists
  const existingIdx = lockData.locks.findIndex(
    l => l.block_id === blockId && l.phase === (phase || '') && l.status === 'in-progress'
  );

  const newLock = {
    block_id: blockId,
    phase: phase || '',
    scope_files: scopeFiles,
    start_date: today,
    target_completion: targetCompletion,
    status: 'in-progress',
    notes: notesArg,
  };

  if (existingIdx >= 0) {
    console.log(`  Aktualisiere bestehenden Lock fuer ${blockId} ${phase || ''} (${person})`);
    lockData.locks[existingIdx] = newLock;
  } else {
    console.log(`  Erstelle neuen Lock fuer ${blockId} ${phase || ''} (${person})`);
    lockData.locks.push(newLock);
  }

  lockData.timestamp = new Date().toISOString();
  lockData.current_phase_evidence = {
    phase_id: phase || '',
    completed_items: [],
    last_commit: '',
  };

  writeFileSync(lockFile, JSON.stringify(lockData, null, 2) + '\n', 'utf8');
  console.log(`  ✓ Lock gespeichert: ${lockFile.replace(ROOT, '.')}`);
  console.log(`    Block: ${blockId}, Phase: ${phase || 'n/a'}, Person: ${person}`);
  console.log(`    Scope-Dateien: ${scopeFiles.length}`);
  if (targetCompletion) console.log(`    Ziel: ${targetCompletion}`);

  // Regenerate registry
  const { execSync } = await import('child_process');
  try {
    execSync('node .agents/scripts/lock-registry-merger.js', { cwd: ROOT, stdio: 'pipe' });
    console.log('  Registry aktualisiert.');
  } catch (_) {
    console.warn('  Registry-Update fehlgeschlagen - manuell: npm run lock:validate');
  }

  console.log('\n  Naechster Schritt:');
  console.log(`    git add docs/lock-status/${person}.json`);
  console.log(`    git commit -m "docs(${blockId}): ${person} started ${phase || blockId}"`);

  process.exit(0);
}

main().catch(err => {
  console.error('Fehler in lock-claim:', err.message);
  process.exit(2);
});
