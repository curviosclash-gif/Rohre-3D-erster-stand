#!/usr/bin/env node
/**
 * lock-advance.js
 * CLI: node .agents/scripts/lock-advance.js V64.8.1 V64.8.2 alice
 *
 * Marks current phase as completed and adds next phase as a new in-progress lock.
 * Extracts scope_files from VXX.md frontmatter for the new phase.
 *
 * Exit codes:
 *   0 = OK
 *   1 = Error (lock not found, conflict, etc.)
 *   2 = Usage error
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

const ROOT = resolve(process.cwd());
const LOCK_DIR = join(ROOT, 'docs', 'lock-status');
const PLANS_ACTIVE = join(ROOT, 'docs', 'plaene', 'aktiv');

// Parse positional args: fromPhase toPhase person
const args = process.argv.slice(2);
const posArgs = args.filter(a => !a.startsWith('-'));
const fromPhaseArg = posArgs[0]; // e.g. "V64.8.1" or "64.8.1"
const toPhaseArg = posArgs[1];   // e.g. "V64.8.2" or "64.8.2"
const personArg = posArgs[2];

if (!fromPhaseArg || !toPhaseArg || !personArg) {
  console.error('Verwendung: node .agents/scripts/lock-advance.js <fromPhase> <toPhase> <person>');
  console.error('Beispiel:   node .agents/scripts/lock-advance.js V64.8.1 V64.8.2 alice');
  process.exit(2);
}

// Normalize phases: strip leading V, extract block number
function normalizePhase(p) {
  return p.replace(/^V/, '');
}

const fromPhase = normalizePhase(fromPhaseArg);
const toPhase = normalizePhase(toPhaseArg);
const person = personArg;
const fromBlockNum = fromPhase.split('.')[0];
const toBlockNum = toPhase.split('.')[0];

if (fromBlockNum !== toBlockNum) {
  console.error(`  ✗ fromPhase und toPhase muessen zum selben Block gehoeren (${fromBlockNum} != ${toBlockNum})`);
  process.exit(2);
}

const blockId = `V${fromBlockNum}`;
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
 * Load other people's locks to check conflicts.
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
      if (lock.status === 'in-progress') locks.push({ person: data.person, ...lock });
    }
  }
  return locks;
}

async function main() {
  const lockFile = join(LOCK_DIR, `${person}.json`);

  if (!existsSync(lockFile)) {
    console.error(`  ✗ Lock-File nicht gefunden: ${lockFile.replace(ROOT, '.')}`);
    process.exit(2);
  }

  const lockData = JSON.parse(readFileSync(lockFile, 'utf8'));

  // Find the from-phase lock
  const fromIdx = lockData.locks.findIndex(
    l => l.block_id === blockId && l.phase === fromPhase && l.status === 'in-progress'
  );

  if (fromIdx < 0) {
    // Also check by partial phase match (e.g. "64.8.1" vs "8.1")
    const altIdx = lockData.locks.findIndex(
      l => l.block_id === blockId && l.phase.endsWith(fromPhase) && l.status === 'in-progress'
    );
    if (altIdx < 0) {
      console.error(`  ✗ Kein aktiver Lock fuer ${blockId} Phase ${fromPhase} bei ${person} gefunden.`);
      console.log('  Aktuelle Locks:');
      for (const l of lockData.locks) {
        console.log(`    ${l.block_id} ${l.phase} (${l.status})`);
      }
      process.exit(1);
    }
  }

  const actualFromIdx = fromIdx >= 0 ? fromIdx :
    lockData.locks.findIndex(l => l.block_id === blockId && l.phase.endsWith(fromPhase) && l.status === 'in-progress');

  // Mark from-phase as completed
  lockData.locks[actualFromIdx].status = 'completed';
  console.log(`  ✓ Phase ${fromPhase} als 'completed' markiert.`);

  // Get scope_files for to-phase from plan file
  const planFile = findPlanFile(blockId);
  let newScopeFiles = lockData.locks[actualFromIdx].scope_files || [];

  if (planFile) {
    const content = readFileSync(planFile, 'utf8');
    const fm = parseFrontmatter(content);
    const blockScopeFiles = fm.scope_files || [];
    if (blockScopeFiles.length > 0) {
      newScopeFiles = blockScopeFiles;
      console.log(`  scope_files aus ${blockId}.md extrahiert (${newScopeFiles.length} Dateien).`);
    }
  }

  // Check conflicts for new phase
  const otherLocks = loadOtherLocks(person);
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

  if (conflicts.length > 0) {
    console.error(`\n  ✗ Lock-Konflikte fuer neue Phase ${toPhase}:`);
    for (const c of conflicts) {
      console.error(`    ${c.file} -> bereits gelockt von ${c.person} (${c.phase})`);
    }
    console.error('\n  Aktion: Abstimmung mit dem Lock-Holder erforderlich.');
    process.exit(1);
  }

  // Add new lock for to-phase
  const newLock = {
    block_id: blockId,
    phase: toPhase,
    scope_files: newScopeFiles,
    start_date: today,
    target_completion: lockData.locks[actualFromIdx].target_completion || '',
    status: 'in-progress',
    notes: '',
  };

  lockData.locks.push(newLock);
  lockData.timestamp = new Date().toISOString();
  lockData.current_phase_evidence = {
    phase_id: toPhase,
    completed_items: [],
    last_commit: '',
  };

  writeFileSync(lockFile, JSON.stringify(lockData, null, 2) + '\n', 'utf8');
  console.log(`  ✓ Neuer Lock fuer Phase ${toPhase} hinzugefuegt.`);
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
  console.log(`    git commit -m "docs(${blockId}): ${person} advanced from ${fromPhase} to ${toPhase}"`);

  process.exit(0);
}

main().catch(err => {
  console.error('Fehler in lock-advance:', err.message);
  process.exit(1);
});
