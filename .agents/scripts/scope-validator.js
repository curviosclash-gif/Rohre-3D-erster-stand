#!/usr/bin/env node
/**
 * scope-validator.js
 * CLI: node .agents/scripts/scope-validator.js [--phase=V64.8.2] [--person=alice] [--strict]
 *
 * Exit codes:
 *   0 = OK (all staged files in scope)
 *   1 = Scope violation (hard fail)
 *   2 = Soft warning (no phase given, or non-blocking issue)
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { createRequire } from 'module';
import { join, resolve } from 'path';

const ROOT = resolve(process.cwd());
const LOCK_DIR = join(ROOT, 'docs', 'lock-status');
const PLANS_ACTIVE = join(ROOT, 'docs', 'plaene', 'aktiv');
const require = createRequire(import.meta.url);

// Parse CLI args
const args = process.argv.slice(2);
const phaseArg = args.find(a => a.startsWith('--phase='))?.split('=')[1];
const personArg = args.find(a => a.startsWith('--person='))?.split('=')[1];
const strict = args.includes('--strict');

/**
 * Simple glob matching without external deps (supports ** and * wildcards).
 * Falls back to minimatch if available.
 */
function matchGlob(pattern, filePath) {
  // Try minimatch first (transitive dep available)
  try {
    const { minimatch } = await_minimatch();
    if (minimatch) return minimatch(filePath, pattern, { matchBase: false });
  } catch (_) {
    // fall through to manual impl
  }
  return manualGlobMatch(pattern, filePath);
}

function await_minimatch() {
  try {
    // Use require-style resolution via a sync check
    const modPath = join(ROOT, 'node_modules', 'minimatch', 'dist', 'cjs', 'index.js');
    if (existsSync(modPath)) {
      return require('minimatch');
    }
  } catch (_) {}
  return null;
}

function manualGlobMatch(pattern, filePath) {
  // Normalize separators
  const p = pattern.replace(/\\/g, '/');
  const f = filePath.replace(/\\/g, '/');

  // Convert glob to regex
  let regexStr = p
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // escape regex special chars (not * or ?)
    .replace(/\\\*\\\*/g, '__DOUBLESTAR__')  // protect **
    .replace(/\*/g, '[^/]*')                  // * matches within segment
    .replace(/__DOUBLESTAR__\//g, '(?:.+/)?') // **/ matches any prefix
    .replace(/__DOUBLESTAR__/g, '.*');         // ** at end

  const regex = new RegExp(`^${regexStr}$`);
  return regex.test(f);
}

/**
 * Parse YAML frontmatter from a markdown file.
 * Returns object with key-value pairs (handles lists under keys).
 */
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return {};

  const yaml = match[1];
  const result = {};
  let currentKey = null;
  let currentList = null;

  for (const line of yaml.split('\n')) {
    // List item
    if (line.match(/^  - /)) {
      const val = line.replace(/^  - /, '').trim();
      if (currentList) currentList.push(val);
      continue;
    }
    // Key-value or key with list
    const kvMatch = line.match(/^([a-zA-Z_][a-zA-Z0-9_-]*):\s*(.*)/);
    if (kvMatch) {
      currentKey = kvMatch[1];
      const val = kvMatch[2].trim();
      if (val === '') {
        // List follows
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
 * Find VXX.md for a given block id like "V64" or phase "64.8.2".
 */
function findPlanFile(blockId) {
  const id = blockId.startsWith('V') ? blockId : `V${blockId.split('.')[0]}`;
  const candidate = join(PLANS_ACTIVE, `${id}.md`);
  if (existsSync(candidate)) return candidate;
  // Try all files in aktiv
  if (existsSync(PLANS_ACTIVE)) {
    for (const f of readdirSync(PLANS_ACTIVE)) {
      if (f.startsWith(id) && f.endsWith('.md')) return join(PLANS_ACTIVE, f);
    }
  }
  return null;
}

/**
 * Get staged files from git.
 */
function getStagedFiles() {
  try {
    const out = execSync('git diff --cached --name-only', { encoding: 'utf8', cwd: ROOT });
    return out.trim().split('\n').filter(Boolean);
  } catch (_) {
    return [];
  }
}

/**
 * Load lock files and return all active locks.
 */
function loadActiveLocks() {
  const locks = [];
  if (!existsSync(LOCK_DIR)) return locks;
  for (const file of readdirSync(LOCK_DIR)) {
    if (!file.endsWith('.json') || file.startsWith('_') || file.includes('.example.')) continue;
    try {
      const data = JSON.parse(readFileSync(join(LOCK_DIR, file), 'utf8'));
      if (data.locks) {
        for (const lock of data.locks) {
          if (lock.status === 'in-progress') {
            locks.push({ person: data.person, ...lock });
          }
        }
      }
    } catch (_) {}
  }
  return locks;
}

async function main() {
  const staged = getStagedFiles();

  if (staged.length === 0) {
    console.log('  (keine staged files - nichts zu pruefen)');
    process.exit(0);
  }

  // If no phase given, show warning with active locks
  if (!phaseArg) {
    const activeLocks = loadActiveLocks();
    if (activeLocks.length === 0) {
      console.log('  Keine aktiven Locks gefunden.');
      console.log('  Tipp: npm run lock:claim <block> <person> -- --phase=<phase>');
    } else {
      console.warn('  Aktive Locks:');
      for (const lock of activeLocks) {
        console.warn(`    ${lock.person}: ${lock.block_id} Phase ${lock.phase} (${lock.status})`);
      }
      console.warn('  Tipp: --phase=V64.8.2 um spezifische Phase zu pruefen.');
    }
    process.exit(2);
  }

  // Parse phase/block from phaseArg (e.g. "V64.8.2" or "64.8.2")
  const cleanPhase = phaseArg.replace(/^V/, '');
  const blockId = 'V' + cleanPhase.split('.')[0];

  const planFile = findPlanFile(blockId);
  if (!planFile) {
    console.error(`  Kein Plan-File gefunden fuer Block ${blockId} in ${PLANS_ACTIVE}`);
    process.exit(2);
  }

  const content = readFileSync(planFile, 'utf8');
  const fm = parseFrontmatter(content);
  const scopeFiles = fm.scope_files || [];

  if (scopeFiles.length === 0) {
    console.warn(`  Keine scope_files in ${planFile} gefunden.`);
    process.exit(2);
  }

  // Check strict: does person hold the lock?
  if (strict && personArg) {
    const activeLocks = loadActiveLocks();
    const personLock = activeLocks.find(
      l => l.person === personArg && l.block_id === blockId && l.phase === cleanPhase
    );
    if (!personLock) {
      console.error(`  ✗ STRICT: ${personArg} haelt keinen Lock fuer ${blockId} Phase ${cleanPhase}`);
      process.exit(1);
    }
  }

  // Validate each staged file against scope_files patterns
  const violations = [];
  const ok = [];

  for (const staged of getStagedFiles()) {
    const inScope = scopeFiles.some(pattern => manualGlobMatch(pattern, staged));
    if (inScope) {
      ok.push(staged);
    } else {
      // Check if it's a docs/lock-status or governance file - allow those
      const isGovernance =
        staged.startsWith('docs/lock-status/') ||
        staged.startsWith('.agents/') ||
        staged === 'docs/Umsetzungsplan.md' ||
        staged === 'AGENTS.md' ||
        staged === 'CLAUDE.md';
      if (isGovernance) {
        ok.push(staged + ' (governance - erlaubt)');
      } else {
        violations.push(staged);
      }
    }
  }

  // Output
  console.log(`\nScope-Validation fuer ${blockId} Phase ${cleanPhase}`);
  console.log(`Plan-File: ${planFile.replace(ROOT, '.')}`);
  console.log(`Scope-Patterns (${scopeFiles.length}):`);
  for (const p of scopeFiles) console.log(`  - ${p}`);
  console.log();

  if (ok.length > 0) {
    console.log('  Dateien im Scope:');
    for (const f of ok) console.log(`    ✓ ${f}`);
  }

  if (violations.length > 0) {
    console.error('\n  Scope-Verletzungen:');
    for (const f of violations) {
      console.error(`    ✗ ${f}`);
      // Find which lock owns this file
      const activeLocks = loadActiveLocks();
      for (const lock of activeLocks) {
        if (lock.scope_files) {
          const owns = lock.scope_files.some(p => manualGlobMatch(p, f));
          if (owns && lock.person !== personArg) {
            console.error(`      -> Lock gehalten von: ${lock.person} (Phase ${lock.phase}, seit ${lock.start_date})`);
          }
        }
      }
    }
    console.error('\n  Aktion: Andere Datei bearbeiten ODER mit dem Lock-Holder abstimmen.');
    process.exit(1);
  }

  console.log('\n  ✓ Alle staged files sind im Scope.');
  process.exit(0);
}

main().catch(err => {
  console.error('Fehler in scope-validator:', err.message);
  process.exit(2);
});
