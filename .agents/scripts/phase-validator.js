#!/usr/bin/env node
/**
 * phase-validator.js
 * CLI: node .agents/scripts/phase-validator.js [--phase=V64.8.2] [--allow-rerun]
 *
 * Exit codes:
 *   0 = OK
 *   1 = Dependency nicht erfuellt (hard fail)
 *   2 = Soft warning (phase not found, missing info, etc.)
 */

import { execSync } from 'child_process';
import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(process.cwd());
const PLANS_ACTIVE = join(ROOT, 'docs', 'plaene', 'aktiv');

// Parse CLI args
const args = process.argv.slice(2);
const phaseArg = args.find(a => a.startsWith('--phase='))?.split('=')[1];
const allowRerun = args.includes('--allow-rerun');

/**
 * Parse YAML frontmatter from a markdown file.
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
 * Find VXX.md for a given block id like "V64" or phase "V64.8.2".
 */
function findPlanFile(blockId) {
  const id = blockId.startsWith('V') ? blockId : `V${blockId.split('.')[0]}`;
  const candidate = join(PLANS_ACTIVE, `${id}.md`);
  if (existsSync(candidate)) return candidate;
  if (existsSync(PLANS_ACTIVE)) {
    for (const f of readdirSync(PLANS_ACTIVE)) {
      if (f.startsWith(id) && f.endsWith('.md')) return join(PLANS_ACTIVE, f);
    }
  }
  return null;
}

/**
 * Extract phase list from markdown content.
 * Looks for headings like "## Phase 64.8.1" or "### 64.8.1" or "## 64.8" etc.
 */
function extractPhases(content) {
  const phases = [];
  // Match headings that look like phase numbers (e.g. ## Phase 64.8.1 or ## 64.8.1)
  const phaseHeadingRegex = /^#{1,4}\s+(?:Phase\s+)?(\d+\.\d+(?:\.\d+)?)\b/gm;
  let m;
  while ((m = phaseHeadingRegex.exec(content)) !== null) {
    phases.push(m[1]);
  }
  return [...new Set(phases)];
}

/**
 * Check git log for commit messages that indicate a phase was completed.
 * Looks for commit messages matching the phase ID.
 */
function isPhaseCommitted(phaseId) {
  try {
    // Search for commits referencing this phase in the subject line
    const log = execSync(`git log --oneline --all`, { encoding: 'utf8', cwd: ROOT });
    const lines = log.trim().split('\n');
    // Pattern: feat(V64 64.8.1): ... or docs(V64 64.8.1): ...
    const pattern = new RegExp(`\\b${phaseId.replace('.', '\\.')}\\b`, 'i');
    return lines.some(line => pattern.test(line));
  } catch (_) {
    return false;
  }
}

/**
 * Parse phase sequence from block: numeric ordering.
 */
function getPreviousPhase(phases, currentPhase) {
  const sorted = phases
    .map(p => ({ raw: p, parts: p.split('.').map(Number) }))
    .sort((a, b) => {
      for (let i = 0; i < Math.max(a.parts.length, b.parts.length); i++) {
        const diff = (a.parts[i] || 0) - (b.parts[i] || 0);
        if (diff !== 0) return diff;
      }
      return 0;
    });

  const idx = sorted.findIndex(p => p.raw === currentPhase);
  if (idx <= 0) return null;
  return sorted[idx - 1].raw;
}

async function main() {
  if (!phaseArg) {
    console.warn('  Verwendung: node .agents/scripts/phase-validator.js --phase=V64.8.2');
    console.warn('  Verfuegbare Plan-Dateien in', PLANS_ACTIVE + ':');
    if (existsSync(PLANS_ACTIVE)) {
      for (const f of readdirSync(PLANS_ACTIVE)) {
        if (f.endsWith('.md')) console.warn(`    - ${f}`);
      }
    }
    process.exit(2);
  }

  // Parse phase and block
  const cleanPhase = phaseArg.replace(/^V/, '');
  const blockNum = cleanPhase.split('.')[0];
  const blockId = `V${blockNum}`;

  console.log(`\nPhase-Validation fuer ${blockId} Phase ${cleanPhase}`);

  const planFile = findPlanFile(blockId);
  if (!planFile) {
    console.error(`  ✗ Kein Plan-File fuer Block ${blockId} in ${PLANS_ACTIVE}`);
    process.exit(2);
  }
  console.log(`  Plan-File: ${planFile.replace(ROOT, '.')}`);

  const content = readFileSync(planFile, 'utf8');
  const fm = parseFrontmatter(content);

  // Check block dependencies
  const dependsOn = fm.depends_on || [];
  if (dependsOn.length > 0) {
    console.log(`\n  Block-Abhaengigkeiten (${dependsOn.length}):`);
    let depFail = false;
    for (const dep of dependsOn) {
      const depCommitted = isPhaseCommitted(dep.replace(/^V/, '') + '.99') ||
                           isPhaseCommitted(dep);
      if (depCommitted) {
        console.log(`    ✓ ${dep} (in git log gefunden)`);
      } else {
        // Soft check - dependency might be satisfied even if not in log format
        console.warn(`    ⚠ ${dep} (kein Commit-Nachweis gefunden - manuell pruefen)`);
      }
    }
  }

  // Extract phases from plan
  const phases = extractPhases(content);
  if (phases.length === 0) {
    console.warn('  ⚠ Keine Phasen in Plan-File gefunden.');
    process.exit(2);
  }

  console.log(`\n  Bekannte Phasen in ${blockId}: ${phases.join(', ')}`);

  // Check if requested phase exists
  if (!phases.includes(cleanPhase)) {
    console.error(`  ✗ Phase ${cleanPhase} nicht in Plan-File gefunden.`);
    console.error(`  Verfuegbare Phasen: ${phases.join(', ')}`);
    process.exit(1);
  }

  // Check previous phase completion
  const prevPhase = getPreviousPhase(phases, cleanPhase);
  if (prevPhase) {
    const prevCommitted = isPhaseCommitted(prevPhase);
    const prevWithBlock = isPhaseCommitted(`${blockNum}.${prevPhase.split('.').slice(1).join('.')}`);
    const committed = prevCommitted || prevWithBlock;

    if (committed) {
      console.log(`  ✓ Vorphase ${prevPhase} ist in git log belegt.`);
    } else {
      console.warn(`  ⚠ Vorphase ${prevPhase} hat keinen eindeutigen Commit-Nachweis.`);
      if (!allowRerun) {
        console.warn('    Verwende --allow-rerun um fortzufahren (Soft-Warning).');
      }
    }
  } else {
    console.log(`  ✓ ${cleanPhase} ist die erste Phase - keine Vorphase erforderlich.`);
  }

  // Check if current phase already has a commit (re-run detection)
  const alreadyCommitted = isPhaseCommitted(cleanPhase);
  if (alreadyCommitted && !allowRerun) {
    console.warn(`  ⚠ Phase ${cleanPhase} hat bereits einen Commit. Verwende --allow-rerun fuer Re-Run.`);
    process.exit(2);
  }

  console.log(`\n  ✓ Phase ${cleanPhase} kann bearbeitet werden.`);
  process.exit(0);
}

main().catch(err => {
  console.error('Fehler in phase-validator:', err.message);
  process.exit(2);
});
