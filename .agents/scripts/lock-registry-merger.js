#!/usr/bin/env node
/**
 * lock-registry-merger.js
 * CLI: node .agents/scripts/lock-registry-merger.js [--validate] [--status]
 *
 * Reads all docs/lock-status/*.json (excluding _locks-registry.json and *.example.json),
 * merges into _locks-registry.json, and optionally validates for scope conflicts.
 *
 * Exit codes:
 *   0 = OK
 *   1 = Konflikt gefunden (hard fail)
 *   2 = Soft warning / no locks
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(process.cwd());
const LOCK_DIR = join(ROOT, 'docs', 'lock-status');
const REGISTRY_FILE = join(LOCK_DIR, '_locks-registry.json');

// Parse CLI args
const args = process.argv.slice(2);
const validate = args.includes('--validate');
const status = args.includes('--status');

/**
 * Simple glob matching (same as scope-validator.js - no external deps).
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
 * Load all person lock files (not registry, not examples).
 */
function loadAllLockFiles() {
  const allLocks = [];
  if (!existsSync(LOCK_DIR)) {
    return allLocks;
  }
  for (const file of readdirSync(LOCK_DIR).sort((a, b) => a.localeCompare(b))) {
    if (!file.endsWith('.json')) continue;
    if (file.startsWith('_')) continue;
    if (file.includes('.example.')) continue;
    const filePath = join(LOCK_DIR, file);
    try {
      const data = JSON.parse(readFileSync(filePath, 'utf8'));
      allLocks.push({ file, person: data.person || file.replace('.json', ''), data });
    } catch (e) {
      console.error(`  Fehler beim Lesen von ${file}: ${e.message}`);
    }
  }
  return allLocks;
}

/**
 * Build the generated registry object from all lock files.
 */
function buildRegistry(allLockFiles, generatedAt = new Date().toISOString()) {
  const locks = [];
  for (const { person, data } of allLockFiles) {
    if (!data.locks) continue;
    for (const lock of data.locks) {
      locks.push({
        person: data.person || person,
        block_id: lock.block_id,
        phase: lock.phase,
        scope_files: lock.scope_files || [],
        start_date: lock.start_date,
        target_completion: lock.target_completion,
        status: lock.status,
        notes: lock.notes || '',
      });
    }
  }
  return {
    generated_at: generatedAt,
    locks,
    metadata: {
      format_version: '1.0',
      expected_lock_files: allLockFiles.map(f => f.file),
    },
  };
}

function readExistingRegistry() {
  if (!existsSync(REGISTRY_FILE)) {
    return null;
  }
  try {
    return JSON.parse(readFileSync(REGISTRY_FILE, 'utf8'));
  } catch {
    return null;
  }
}

function semanticRegistry(registry) {
  return {
    locks: Array.isArray(registry?.locks) ? registry.locks : [],
    metadata: registry?.metadata || {},
  };
}

function registryContent(registry) {
  return JSON.stringify(registry, null, 2) + '\n';
}

function hasSameSemanticContent(left, right) {
  return JSON.stringify(semanticRegistry(left)) === JSON.stringify(semanticRegistry(right));
}

/**
 * Merge all lock files into the registry.
 */
function mergeRegistry(allLockFiles) {
  const existing = readExistingRegistry();
  const generatedAt = new Date().toISOString();
  const candidate = buildRegistry(allLockFiles, existing?.generated_at || generatedAt);

  if (existing && hasSameSemanticContent(existing, candidate)) {
    return { registry: existing, written: false, reason: 'semantic-unchanged' };
  }

  candidate.generated_at = generatedAt;
  const nextContent = registryContent(candidate);
  const previousContent = existsSync(REGISTRY_FILE) ? readFileSync(REGISTRY_FILE, 'utf8') : '';
  if (previousContent !== nextContent) {
    writeFileSync(REGISTRY_FILE, nextContent, 'utf8');
    return { registry: candidate, written: true, reason: 'semantic-changed' };
  }

  return { registry: candidate, written: false, reason: 'content-unchanged' };
}

/**
 * Detect scope_file overlaps between different persons with in-progress locks.
 * Returns array of conflict descriptions.
 */
function detectConflicts(locks) {
  const conflicts = [];
  const activeLocks = locks.filter(l => l.status === 'in-progress');

  for (let i = 0; i < activeLocks.length; i++) {
    for (let j = i + 1; j < activeLocks.length; j++) {
      const lockA = activeLocks[i];
      const lockB = activeLocks[j];

      // Skip same person
      if (lockA.person === lockB.person) continue;

      // Check each file in lockA against patterns in lockB
      for (const fileA of (lockA.scope_files || [])) {
        // fileA could be a pattern or a literal
        for (const fileB of (lockB.scope_files || [])) {
          // Check if either matches the other
          const ab = manualGlobMatch(fileB, fileA) || manualGlobMatch(fileA, fileB);
          // Also check literal equality
          const eq = fileA === fileB;
          if (ab || eq) {
            conflicts.push({
              file: fileA === fileB ? fileA : `${fileA} <-> ${fileB}`,
              personA: lockA.person,
              phaseA: `${lockA.block_id} ${lockA.phase}`,
              personB: lockB.person,
              phaseB: `${lockB.block_id} ${lockB.phase}`,
            });
          }
        }
      }
    }
  }
  return conflicts;
}

/**
 * Print status table of all locks.
 */
function printStatus(locks) {
  if (locks.length === 0) {
    console.log('  Keine Lock-Eintraege vorhanden.');
    return;
  }

  const header = ['Person', 'Block', 'Phase', 'Status', 'Start', 'Ziel', 'Scope-Dateien'];
  const rows = locks.map(l => [
    l.person || '-',
    l.block_id || '-',
    l.phase || '-',
    l.status || '-',
    l.start_date || '-',
    l.target_completion || '-',
    (l.scope_files || []).length.toString(),
  ]);

  // Calculate column widths
  const widths = header.map((h, i) =>
    Math.max(h.length, ...rows.map(r => (r[i] || '').length))
  );

  const sep = widths.map(w => '-'.repeat(w)).join('-+-');
  const fmt = row => row.map((cell, i) => (cell || '').padEnd(widths[i])).join(' | ');

  console.log('\n  ' + fmt(header));
  console.log('  ' + sep);
  for (const row of rows) {
    const lock = locks[rows.indexOf(row)];
    const prefix = lock.status === 'in-progress' ? '  ' : '  ';
    console.log(prefix + fmt(row));
  }
  console.log();
}

async function main() {
  if (!existsSync(LOCK_DIR)) {
    console.warn('  docs/lock-status/ Verzeichnis nicht gefunden.');
    process.exit(2);
  }

  const allLockFiles = loadAllLockFiles();

  // Always merge into registry
  const mergeResult = mergeRegistry(allLockFiles);
  const registry = mergeResult.registry;

  if (status) {
    console.log('\nLock-Status aller Personen:');
    printStatus(registry.locks);

    const active = registry.locks.filter(l => l.status === 'in-progress');
    const completed = registry.locks.filter(l => l.status === 'completed');
    console.log(`  Aktiv: ${active.length}  Abgeschlossen: ${completed.length}  Gesamt: ${registry.locks.length}`);
  }

  if (validate) {
    console.log('\nPruefe auf Lock-Konflikte...');
    const conflicts = detectConflicts(registry.locks);

    if (conflicts.length === 0) {
      console.log('  ✓ Keine Scope-Konflikte gefunden.');
      if (!status) process.exit(0);
    } else {
      console.error(`\n  ✗ ${conflicts.length} Scope-Konflikt(e) gefunden:\n`);
      for (const c of conflicts) {
        console.error(`  KONFLIKT: ${c.file}`);
        console.error(`    ${c.personA} (${c.phaseA}) <-> ${c.personB} (${c.phaseB})`);
        console.error(`    Aktion: Abstimmung zwischen ${c.personA} und ${c.personB} erforderlich.`);
        console.error();
      }
      process.exit(1);
    }
  }

  if (!status && !validate) {
    // Default: just merge and report
    if (mergeResult.written) {
      console.log(`  Registry aktualisiert: ${registry.locks.length} Lock(s) in ${REGISTRY_FILE.replace(ROOT, '.')}`);
    } else {
      console.log(`  Registry aktuell: ${registry.locks.length} Lock(s) in ${REGISTRY_FILE.replace(ROOT, '.')} (${mergeResult.reason})`);
    }
  }

  process.exit(0);
}

main().catch(err => {
  console.error('Fehler in lock-registry-merger:', err.message);
  process.exit(2);
});
