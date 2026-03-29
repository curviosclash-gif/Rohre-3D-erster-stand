#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const checkOnly = args.has('--check');
const writeMode = args.has('--write') || !checkOnly;

const ACTIVE_SCAN_ROOTS = ['.agents', 'docs'];
const EXCLUDED_PREFIXES = ['docs/archive'];
const EXTRA_ACTIVE_FILES = ['AGENTS.md', 'walkthrough.md', 'README.md', 'CLAUDE.md'];

const STAMPED_FILES = [
  'docs/referenz/ai_project_onboarding.md',
  'docs/referenz/ai_architecture_context.md',
  'docs/referenz/architektur_ausfuehrlich.md'
];

const REQUIRED_FILES = [
  'README.md',
  'docs/INDEX.md',
  'docs/referenz/ai_project_onboarding.md',
  'docs/referenz/ai_architecture_context.md',
  'docs/Umsetzungsplan.md',
  '.agents/test_mapping.md',
  '.agents/workflows/aktualitaet-check.md'
];

const LEGACY_PATH_ALLOWLIST = new Set([
  '.agents/rules/documentation_freshness.md',
  'docs/referenz/ai_project_onboarding.md'
]);

const REPORT_FILE = 'docs/prozess/Dokumentationsstatus.md';
const ONBOARDING_FILE = 'docs/referenz/ai_project_onboarding.md';

function todayLocalISO() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

async function exists(relPath) {
  try {
    await fs.access(path.join(ROOT, relPath));
    return true;
  } catch {
    return false;
  }
}

function normalize(relPath) {
  return relPath.replace(/\\/g, '/');
}

function isExcluded(relPath) {
  const n = normalize(relPath);
  return EXCLUDED_PREFIXES.some((prefix) => n === prefix || n.startsWith(`${prefix}/`));
}

async function listFilesRec(relDir) {
  const fullDir = path.join(ROOT, relDir);
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(fullDir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const relPath = normalize(path.join(relDir, entry.name));
    if (isExcluded(relPath)) {
      continue;
    }

    if (entry.isDirectory()) {
      out.push(...(await listFilesRec(relPath)));
      continue;
    }

    if (entry.isFile() && relPath.endsWith('.md')) {
      out.push(relPath);
    }
  }
  return out;
}

function findLineNumbers(text, regex) {
  const lines = text.split(/\r?\n/);
  const hits = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (regex.test(lines[i])) {
      hits.push(i + 1);
    }
    regex.lastIndex = 0;
  }
  return hits;
}

async function readUtf8(relPath) {
  return fs.readFile(path.join(ROOT, relPath), 'utf8');
}

async function writeUtf8(relPath, content) {
  await fs.writeFile(path.join(ROOT, relPath), content, 'utf8');
}

function collectLegacyPathFindings(filesToScan, contentByFile) {
  const legacyPattern = /js\/main\.js|js\/modules\//;
  const findings = [];

  for (const file of filesToScan) {
    if (LEGACY_PATH_ALLOWLIST.has(file)) {
      continue;
    }
    const text = contentByFile.get(file);
    if (typeof text !== 'string') {
      continue;
    }

    const lines = findLineNumbers(text, legacyPattern);
    if (lines.length === 0) {
      continue;
    }

    findings.push({ file, lines });
  }

  return findings;
}

function collectMojibakeWarnings(filesToScan, contentByFile) {
  const mojibakePattern = /Ã|Â|â€“|â€”|â€¦|�/;
  const warnings = [];

  for (const file of filesToScan) {
    const text = contentByFile.get(file);
    if (typeof text !== 'string') {
      continue;
    }

    const lines = findLineNumbers(text, mojibakePattern);
    if (lines.length === 0) {
      continue;
    }

    warnings.push({ file, lines });
  }

  return warnings;
}

function applyStampUpdate(text, today) {
  const stampPattern = /^Stand:\s+\d{4}-\d{2}-\d{2}$/m;
  if (!stampPattern.test(text)) {
    return { updated: false, content: text };
  }

  const next = text.replace(stampPattern, `Stand: ${today}`);
  return { updated: next !== text, content: next };
}

function escapeRegex(input) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function extractOnboardingCanonicalRefs(onboardingText) {
  const sectionMatch = onboardingText.match(
    /## 2\. Canonical Quellen \(zuerst lesen\)([\s\S]*?)(?:\r?\n##\s|\s*$)/
  );
  if (!sectionMatch) {
    return [];
  }

  const refs = [];
  const refRegex = /`([^`]+)`/g;
  let match = refRegex.exec(sectionMatch[1]);
  while (match) {
    const ref = normalize(match[1].trim());
    if (ref.length > 0) {
      refs.push(ref);
    }
    match = refRegex.exec(sectionMatch[1]);
  }

  return Array.from(new Set(refs));
}

function canonicalRefPatternToRegex(refPattern) {
  const escaped = escapeRegex(refPattern);
  const withDateToken = escaped.replace(/YYYY-MM-DD/g, '\\d{4}-\\d{2}-\\d{2}');
  const withWildcards = withDateToken.replace(/\\\*/g, '[^/]+');
  return new RegExp(`^${withWildcards}$`);
}

async function collectOnboardingCanonicalFindings(onboardingText, filesToScan) {
  const refs = extractOnboardingCanonicalRefs(onboardingText);
  const findings = [];

  if (refs.length === 0) {
    findings.push({
      ref: ONBOARDING_FILE,
      reason: 'missing-canonical-section'
    });
    return { refs, findings };
  }

  for (const ref of refs) {
    const isPattern = ref.includes('*') || ref.includes('YYYY-MM-DD');
    if (!isPattern) {
      if (!(await exists(ref))) {
        findings.push({ ref, reason: 'missing-file' });
      }
      continue;
    }

    const patternRegex = canonicalRefPatternToRegex(ref);
    const hasMatch = filesToScan.some((file) => patternRegex.test(file));
    if (!hasMatch) {
      findings.push({ ref, reason: 'pattern-no-match' });
    }
  }

  return { refs, findings };
}

function buildReport({
  today,
  modeLabel,
  updatedFiles,
  missingFiles,
  onboardingRefs,
  onboardingFindings,
  legacyFindings,
  mojibakeWarnings,
  canPass
}) {
  const lines = [];
  lines.push('# Dokumentationsstatus');
  lines.push('');
  lines.push(`Stand: ${today}`);
  lines.push(`Modus: ${modeLabel}`);
  lines.push(`Gate: ${canPass ? 'PASS' : 'FAIL'}`);
  lines.push('');

  lines.push('## Automatisch aktualisiert');
  if (updatedFiles.length === 0) {
    lines.push('- Keine inhaltlichen Datumsupdates noetig.');
  } else {
    for (const f of updatedFiles) {
      lines.push(`- ${f}`);
    }
  }
  lines.push('');

  lines.push('## Pflichtdateien');
  if (missingFiles.length === 0) {
    lines.push('- Alle Pflichtdateien vorhanden.');
  } else {
    for (const f of missingFiles) {
      lines.push(`- FEHLT: ${f}`);
    }
  }
  lines.push('');

  lines.push('## Onboarding-Canonical-Quellen');
  if (onboardingRefs.length === 0) {
    lines.push(`- FEHLT: Keine Canonical-Quellen in ${ONBOARDING_FILE} gefunden.`);
  } else if (onboardingFindings.length === 0) {
    lines.push('- Alle Canonical-Quellen aus dem Onboarding sind valide.');
  } else {
    for (const finding of onboardingFindings) {
      if (finding.reason === 'missing-file') {
        lines.push(`- FEHLT: ${finding.ref}`);
      } else if (finding.reason === 'pattern-no-match') {
        lines.push(`- KEIN TREFFER FUER MUSTER: ${finding.ref}`);
      } else {
        lines.push(`- FEHLT: Canonical-Section in ${ONBOARDING_FILE}`);
      }
    }
  }
  lines.push('');

  lines.push('## Legacy-Pfad-Funde (aktiv, ohne docs/archive)');
  if (legacyFindings.length === 0) {
    lines.push('- Keine Legacy-Pfade gefunden.');
  } else {
    for (const item of legacyFindings) {
      lines.push(`- ${item.file}: Zeilen ${item.lines.join(', ')}`);
    }
  }
  lines.push('');

  lines.push('## Encoding-Warnungen (Mojibake)');
  if (mojibakeWarnings.length === 0) {
    lines.push('- Keine Mojibake-Muster gefunden.');
  } else {
    for (const item of mojibakeWarnings) {
      lines.push(`- ${item.file}: Zeilen ${item.lines.join(', ')}`);
    }
  }
  lines.push('');

  lines.push('## Ergebnis');
  if (canPass) {
    lines.push(`- Dokumentation aktuell (geprueft am ${today}).`);
  } else {
    lines.push('- Aktualisierung erforderlich: siehe oben.');
  }

  lines.push('');
  return `${lines.join('\n')}`;
}

async function main() {
  const today = todayLocalISO();

  const activeDocs = [];
  for (const root of ACTIVE_SCAN_ROOTS) {
    activeDocs.push(...(await listFilesRec(root)));
  }

  for (const extra of EXTRA_ACTIVE_FILES) {
    if (await exists(extra)) {
      activeDocs.push(extra);
    }
  }

  const filesToScan = Array.from(new Set(activeDocs.map(normalize))).sort();
  const contentByFile = new Map();

  for (const file of filesToScan) {
    try {
      contentByFile.set(file, await readUtf8(file));
    } catch {
      // skip unreadable file
    }
  }

  const updatedFiles = [];

  for (const file of STAMPED_FILES) {
    if (!contentByFile.has(file)) {
      continue;
    }
    const original = contentByFile.get(file);
    const { updated, content } = applyStampUpdate(original, today);
    if (updated) {
      if (writeMode) {
        await writeUtf8(file, content);
      }
      contentByFile.set(file, content);
      updatedFiles.push(file);
    }
  }

  const missingFiles = [];
  for (const file of REQUIRED_FILES) {
    if (!(await exists(file))) {
      missingFiles.push(file);
    }
  }

  const onboardingText = contentByFile.get(ONBOARDING_FILE) || '';
  const { refs: onboardingRefs, findings: onboardingFindings } =
    await collectOnboardingCanonicalFindings(onboardingText, filesToScan);

  const legacyFindings = collectLegacyPathFindings(filesToScan, contentByFile);
  const mojibakeWarnings = collectMojibakeWarnings(filesToScan, contentByFile);

  const hasBlockingIssues = missingFiles.length > 0 || onboardingFindings.length > 0;
  if (legacyFindings.length > 0) {
    console.log(`[docs] WARNUNG: ${legacyFindings.length} Legacy-Pfad-Funde (nicht blockierend)`);
  }
  const hasPendingUpdates = checkOnly && updatedFiles.length > 0;
  const canPass = !hasBlockingIssues && !hasPendingUpdates;

  const modeLabel = checkOnly ? 'check' : 'sync';
  const report = buildReport({
    today,
    modeLabel,
    updatedFiles,
    missingFiles,
    onboardingRefs,
    onboardingFindings,
    legacyFindings,
    mojibakeWarnings,
    canPass
  });

  if (writeMode) {
    await writeUtf8(REPORT_FILE, report);
  }

  // Short console output for CI/workflow visibility.
  console.log(`[docs] mode=${modeLabel}`);
  console.log(`[docs] updated=${updatedFiles.length}`);
  console.log(`[docs] missing=${missingFiles.length}`);
  console.log(`[docs] onboarding=${onboardingFindings.length}`);
  console.log(`[docs] legacy=${legacyFindings.length}`);
  console.log(`[docs] mojibake=${mojibakeWarnings.length}`);

  if (!canPass) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[docs] fatal:', err?.message || err);
  process.exit(1);
});
