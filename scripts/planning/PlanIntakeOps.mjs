import fs from 'node:fs/promises';
import path from 'node:path';

const COMPLETED_PLAN_STATUSES = new Set(['done', 'closed']);
const INTAKE_LANE_ORDER = ['candidate', 'adopted-open', 'adopted-done', 'bot-training', 'meta'];
const INTAKE_LANE_BY_CLASSIFICATION = {
  'intake-review': 'candidate',
  'adopted-by-open-master-block': 'adopted-open',
  'adopted-by-done-master-block': 'adopted-done',
  'protected-bot-training-intake': 'bot-training',
  'protected-readme': 'meta',
};
const INTAKE_ACTION_BY_LANE = {
  candidate: 'review-for-master-intake',
  'adopted-open': 'open-canonical-block',
  'adopted-done': 'archive-candidate-after-gate',
  'bot-training': 'use-bot-training-governance',
  meta: 'reference-only',
};

export function normalizePlanPath(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/\/{2,}/g, '/');
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean))].sort((left, right) => left.localeCompare(right));
}

function uniqueOrdered(values) {
  return [...new Set(values.filter(Boolean))];
}

function extractBlockId(value) {
  const match = String(value || '').match(/\bV\d+\b/);
  return match ? match[0] : '';
}

function extractPlanFile(value) {
  const match = String(value || '').match(/\bdocs\/plaene\/aktiv\/V\d+\.md\b/i);
  return match ? normalizePlanPath(match[0]) : '';
}

function extractTextIntakeHints(content) {
  const text = String(content || '');
  const suggestedBlockId = text.match(/(?:^|\n)\s*(?:[-*]\s*)?(?:vorgeschlagene\s+)?Block-ID\s*:?\s*`?(V\d+)`?/i)?.[1] || '';
  const targetPlanFile = [
    /(?:^|\n)\s*(?:[-*]\s*)?Geplante aktive Detaildatei(?:\s+nach Intake)?\s*:?\s*`?(docs\/plaene\/aktiv\/V\d+\.md)`?/i,
    /(?:^|\n)\s*(?:[-*]\s*)?vorgeschlagene kanonische Blockdatei\s*:?\s*`?(docs\/plaene\/aktiv\/V\d+\.md)`?/i,
    /(?:^|\n)\s*(?:[-*]\s*)?vorgeschlagene aktive Detaildatei\s*:?\s*`?(docs\/plaene\/aktiv\/V\d+\.md)`?/i,
  ].map((pattern) => text.match(pattern)?.[1]).find(Boolean) || '';
  const targetMaster = text.match(/(?:^|\n)\s*(?:[-*]\s*)?Ziel-Masterplan\s*:?\s*`?(docs\/Umsetzungsplan\.md)`?/i)?.[1] || '';

  return {
    suggestedBlockId,
    targetPlanFile: normalizePlanPath(targetPlanFile),
    targetMaster: normalizePlanPath(targetMaster),
    requiresManualIntakeHint: /Manuelle Uebernahme erforderlich/i.test(text),
  };
}

function intakeLaneForClassification(classification) {
  return INTAKE_LANE_BY_CLASSIFICATION[classification] || 'candidate';
}

function intakeActionForLane(lane) {
  return INTAKE_ACTION_BY_LANE[lane] || 'review-for-master-intake';
}

function laneSortRank(lane) {
  const index = INTAKE_LANE_ORDER.indexOf(lane);
  return index === -1 ? INTAKE_LANE_ORDER.length : index;
}

export function parsePlanFrontmatter(content) {
  const lines = String(content || '').replace(/^\uFEFF/, '').split(/\r?\n/);
  if (lines[0]?.trim() !== '---') return {};

  const data = {};
  let currentKey = null;
  for (let index = 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (line.trim() === '---') break;

    const keyValueMatch = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (keyValueMatch) {
      const [, key, rawValue] = keyValueMatch;
      currentKey = key;
      if (rawValue.trim() === '' || rawValue.trim() === '[]') {
        data[key] = [];
        if (rawValue.trim() === '[]') currentKey = null;
      } else {
        data[key] = rawValue.trim().replace(/^`|`$/g, '').trim();
        currentKey = null;
      }
      continue;
    }

    const listMatch = line.match(/^\s*-\s*(.+?)\s*$/);
    if (listMatch && currentKey) {
      if (!Array.isArray(data[currentKey])) data[currentKey] = [];
      data[currentKey].push(listMatch[1].trim().replace(/^`|`$/g, '').trim());
    }
  }

  return data;
}

export function parsePlanMapMaster(content) {
  const planFileMatches = [...String(content || '').matchAll(/`(docs\/plaene\/aktiv\/V\d+\.md)`/g)]
    .map((match) => normalizePlanPath(match[1]));
  const rows = String(content || '')
    .split(/\r?\n/)
    .map((line) => line.match(/^\|\s*(V\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]*?)\s*\|\s*([^|]+?)\s*\|\s*`(docs\/plaene\/aktiv\/V\d+\.md)`\s*\|$/))
    .filter(Boolean)
    .map((match) => ({
      blockId: match[1],
      title: match[2].trim(),
      status: match[3].trim(),
      priority: match[4].trim(),
      owner: match[5].trim(),
      dependsOn: match[6].trim(),
      phase: match[7].trim(),
      planFile: normalizePlanPath(match[8]),
    }));
  const dependencyIds = [...String(content || '').matchAll(/\b(V\d+)(?:\.\d+)?\b/g)].map((match) => match[1]);

  return {
    referencedPlanFiles: uniqueSorted(planFileMatches),
    referencedBlockIds: uniqueSorted(planFileMatches.map((file) => path.basename(file, '.md'))),
    dependencyIds: uniqueSorted(dependencyIds),
    rows,
  };
}

export function masterStatusFor(master, blockId) {
  return String((master?.rows || []).find((row) => row.blockId === blockId)?.status || '').trim().toLowerCase();
}

function markdownTitle(content, fallback) {
  const heading = String(content || '').match(/^#\s+(.+)$/m)?.[1];
  return String(heading || fallback || '').trim();
}

function normalizePlanFile(value) {
  const raw = String(value || '').replace(/^`|`$/g, '').trim();
  return raw ? normalizePlanPath(raw) : null;
}

export function classifyIntakeDraft({ file, content, master, inferWorkstream = null }) {
  const normalizedFile = normalizePlanPath(file);
  const basename = path.basename(normalizedFile);
  const reasons = [];
  let classification = 'intake-review';

  if (basename.toLowerCase() === 'readme.md') {
    return {
      classification: 'protected-readme',
      intakeLane: 'meta',
      intakeAction: 'reference-only',
      reasons: ['README der Intake-Zone.'],
      referencedBlockIds: [],
      plannedBlockIds: [],
      primaryBlockId: null,
      canonicalBlockId: null,
      ambiguousBlockIds: [],
      blockIdAmbiguous: false,
      requiresUserIntake: false,
      scopeFiles: [],
      targetPlanFile: null,
      targetMaster: null,
      isCanonical: false,
      title: 'README',
      workstream: null,
      workstreamLabel: null,
    };
  }

  const frontmatter = parsePlanFrontmatter(content);
  const textHints = extractTextIntakeHints(content);
  const referencedBlockIds = uniqueSorted([...String(content || '').matchAll(/\bV\d+\b/g)].map((match) => match[0]));
  const targetPlanFile = normalizePlanFile(
    frontmatter.plan_file
    || frontmatter.planned_plan_file
    || frontmatter.target_plan_file
    || textHints.targetPlanFile
  );
  const targetPlanBlockId = extractBlockId(targetPlanFile);
  const explicitBlockIds = uniqueOrdered([
    extractBlockId(frontmatter.planned_block_id),
    textHints.suggestedBlockId,
  ]);
  const filenameBlockIds = uniqueOrdered([...basename.matchAll(/(?:^|[_-])(V\d+)(?:[_\-.]|$)/g)].map((match) => match[1]));
  const plannedBlockIds = uniqueSorted([
    ...explicitBlockIds,
    targetPlanBlockId,
    ...filenameBlockIds,
  ]);
  const title = String(frontmatter.title || markdownTitle(content, basename.replace(/\.md$/i, ''))).trim();
  const targetMaster = normalizePlanPath(frontmatter.target_master || textHints.targetMaster || '');
  const hasStrongTarget = explicitBlockIds.length > 0 || Boolean(targetPlanBlockId);
  const primaryBlockId = (() => {
    if (explicitBlockIds.length > 0) return explicitBlockIds[0];
    if (targetPlanBlockId) return targetPlanBlockId;
    if (filenameBlockIds.length === 1) return filenameBlockIds[0];
    if (filenameBlockIds.length > 1) return null;
    return referencedBlockIds.find((blockId) => master?.referencedBlockIds?.includes(blockId)) || null;
  })();
  const ambiguousBlockIds = uniqueSorted([
    ...filenameBlockIds.filter((blockId) => blockId !== primaryBlockId),
    ...plannedBlockIds.filter((blockId) => !hasStrongTarget && blockId !== primaryBlockId),
  ]);
  const blockIdAmbiguous = ambiguousBlockIds.length > 0 || (!hasStrongTarget && filenameBlockIds.length > 1);

  if (/^BT/i.test(basename) || /Bot/i.test(basename) || normalizedFile.includes('/BT')) {
    classification = 'protected-bot-training-intake';
    reasons.push('Bot-Training-Draft gehoert nicht in den normalen Master-Intake.');
  }

  const masterHits = uniqueOrdered([
    targetPlanBlockId,
    ...explicitBlockIds,
    ...filenameBlockIds,
  ]).filter((blockId) => master?.referencedBlockIds?.includes(blockId));
  if (masterHits.length > 0 && classification !== 'protected-bot-training-intake') {
    const openMasterHits = masterHits.filter((blockId) => !COMPLETED_PLAN_STATUSES.has(masterStatusFor(master, blockId)));
    classification = openMasterHits.length > 0
      ? 'adopted-by-open-master-block'
      : 'adopted-by-done-master-block';
    const hitDetails = masterHits.map((blockId) => `${blockId}:${masterStatusFor(master, blockId) || 'unknown'}`);
    reasons.push(`Geplante Block-ID oder Dateiname ist bereits im Master referenziert: ${hitDetails.join(', ')}.`);
  }

  if (masterHits.length > 0 && classification === 'protected-bot-training-intake') {
    reasons.push(`Geplante Block-ID oder Dateiname passt zu Master-Bloecken, bleibt aber Bot-Training-Sonderfall: ${masterHits.join(', ')}.`);
  }

  const contextualMasterHits = referencedBlockIds.filter((blockId) => (
    master?.referencedBlockIds?.includes(blockId)
    && !masterHits.includes(blockId)
  ));
  if (contextualMasterHits.length > 0 && classification === 'intake-review') {
    reasons.push(`Erwaehnt Master-Bloecke nur als Kontext: ${contextualMasterHits.join(', ')}.`);
  }

  if (blockIdAmbiguous) {
    const ambiguityText = ambiguousBlockIds.length ? ambiguousBlockIds.join(', ') : filenameBlockIds.join(', ');
    if (hasStrongTarget && primaryBlockId) {
      reasons.push(`Weitere Block-IDs nur als Kontext markiert: ${ambiguityText}. Primaerziel bleibt ${primaryBlockId}.`);
    } else {
      reasons.push(`Mehrdeutige Block-IDs ohne explizites Zielfeld: ${ambiguityText}. Kein stiller Primary-Block.`);
    }
  }

  if (classification === 'intake-review') {
    reasons.push('Kein direkter Master-Abgleich; User-Intake-Entscheidung noetig.');
  }

  const intakeLane = intakeLaneForClassification(classification);
  const canonicalBlockId = classification.startsWith('adopted-by-') ? (masterHits[0] || null) : null;
  const workstream = inferWorkstream
    ? inferWorkstream({
      id: primaryBlockId,
      title,
      affectedArea: [frontmatter.affected_area, frontmatter.category, normalizedFile].filter(Boolean).join(' '),
    })
    : null;

  return {
    classification,
    intakeLane,
    intakeAction: intakeActionForLane(intakeLane),
    reasons,
    referencedBlockIds,
    plannedBlockIds,
    primaryBlockId,
    canonicalBlockId,
    ambiguousBlockIds,
    blockIdAmbiguous,
    requiresUserIntake: classification === 'intake-review',
    manualIntakeHint: textHints.requiresManualIntakeHint || String(frontmatter.intake_status || '').toLowerCase().includes('manual'),
    scopeFiles: Array.isArray(frontmatter.scope_files) ? frontmatter.scope_files.map(normalizePlanPath).filter(Boolean) : [],
    targetPlanFile,
    targetMaster,
    isCanonical: false,
    title,
    workstream: workstream?.id || null,
    workstreamLabel: workstream?.label || null,
  };
}

export async function listMarkdownFiles(rootDir, relativeDir) {
  const absoluteDir = path.resolve(rootDir, relativeDir);
  let entries = [];
  try {
    entries = await fs.readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const relativePath = normalizePlanPath(path.join(relativeDir, entry.name));
    if (entry.isDirectory()) {
      files.push(...await listMarkdownFiles(rootDir, relativePath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(relativePath);
    }
  }
  return files.sort((left, right) => left.localeCompare(right));
}

export async function collectIntakePlans({ rootDir, master, relativeDir = 'docs/plaene/neu', inferWorkstream = null }) {
  const files = await listMarkdownFiles(rootDir, relativeDir);
  const plans = await Promise.all(files.map(async (file) => {
    const content = await fs.readFile(path.resolve(rootDir, file), 'utf8');
    return {
      path: file,
      ...classifyIntakeDraft({ file, content, master, inferWorkstream }),
    };
  }));

  return plans.sort((left, right) => (
    laneSortRank(left.intakeLane) - laneSortRank(right.intakeLane)
    || String(left.workstreamLabel || '').localeCompare(String(right.workstreamLabel || ''), 'de')
    || left.classification.localeCompare(right.classification)
    || left.path.localeCompare(right.path)
  ));
}
