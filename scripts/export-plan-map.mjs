#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

const DEFAULT_OUTPUT = 'tmp/plan-map/plan-map.json';
const MASTER_PLAN_PATH = 'docs/Umsetzungsplan.md';
const CHANGELOG_PATH = 'docs/plaene/CHANGELOG.md';
const OPEN_FINDINGS_PATH = 'docs/prozess/Open_Findings.md';
const KNOWLEDGE_GRAPH_PATH = 'docs/generated/knowledge-graph.json';
const KNOWLEDGE_GRAPH_COVERAGE_PATH = 'docs/generated/knowledge-graph.coverage.json';
const KNOWLEDGE_GRAPH_SCORECARD_PATH = 'docs/generated/knowledge-graph.scorecard.json';
const LOCK_REGISTRY_PATH = 'docs/lock-status/_locks-registry.json';
const execFile = promisify(execFileCallback);

const MASTER_BLOCK_SECTIONS = [
  {
    heading: '### Abgeschlossene Bloecke (aktuell referenziert)',
    group: 'done-referenced',
    label: 'Abgeschlossen referenziert',
  },
  {
    heading: '### Abgeschlossene Bloecke (offener Abgleich vor Archivierung)',
    group: 'done-reconcile',
    label: 'Abgeschlossen im Abgleich',
  },
  {
    heading: '### Aktive und geplante Bloecke',
    group: 'active-planned',
    label: 'Aktiv und geplant',
  },
];

function cleanCell(value) {
  return String(value || '')
    .trim()
    .replace(/^`|`$/g, '')
    .trim();
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.flatMap((entry) => normalizeList(entry));
  }

  const raw = cleanCell(value);
  if (!raw || raw === '-' || raw === '[]') {
    return [];
  }

  return raw
    .split(',')
    .map((entry) => cleanCell(entry))
    .filter(Boolean);
}

function normalizeBlockId(value) {
  const match = String(value || '').match(/\b([A-Z]+[0-9]+)\b/);
  return match ? match[1] : null;
}

function normalizeDependency(value) {
  const raw = cleanCell(value);
  const blockId = normalizeBlockId(raw);
  if (!blockId) {
    return null;
  }

  const phaseMatch = raw.match(/\b[A-Z]+[0-9]+\.([0-9]+(?:\.[0-9]+)?)\b/);
  return {
    raw,
    blockId,
    phase: phaseMatch ? `${blockId}.${phaseMatch[1]}` : null,
  };
}

function getSection(markdown, heading, nextHeadingPattern = /\n##\s+/g) {
  const start = markdown.indexOf(heading);
  if (start < 0) {
    return '';
  }

  const afterHeading = markdown.slice(start);
  nextHeadingPattern.lastIndex = heading.length;
  const next = nextHeadingPattern.exec(afterHeading);
  return next ? afterHeading.slice(0, next.index) : afterHeading;
}

function splitMarkdownTableRow(line) {
  return String(line || '')
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cleanCell);
}

function parseMarkdownTable(section) {
  const lines = String(section || '')
    .split(/\r?\n/)
    .filter((line) => line.trim().startsWith('|'));

  if (lines.length < 3) {
    return [];
  }

  const headers = splitMarkdownTableRow(lines[0]);
  return lines.slice(2).map((line) => {
    const cells = splitMarkdownTableRow(line);
    const row = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] || '';
    });
    return row;
  });
}

function parseFrontmatter(markdown) {
  const normalized = String(markdown || '').replace(/^\uFEFF/, '');
  const match = normalized.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    return {};
  }

  const frontmatter = {};
  let currentKey = null;

  for (const line of match[1].split(/\r?\n/)) {
    const keyValue = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (keyValue) {
      currentKey = keyValue[1];
      const value = cleanCell(keyValue[2]);
      frontmatter[currentKey] = value === '[]' ? [] : value;
      continue;
    }

    const listItem = line.match(/^\s+-\s*(.*)$/);
    if (listItem && currentKey) {
      if (!Array.isArray(frontmatter[currentKey])) {
        frontmatter[currentKey] = frontmatter[currentKey] ? [frontmatter[currentKey]] : [];
      }
      frontmatter[currentKey].push(cleanCell(listItem[1]));
    }
  }

  return frontmatter;
}

async function readTextIfExists(rootDir, relativePath) {
  try {
    return await fs.readFile(path.join(rootDir, relativePath), 'utf8');
  } catch (error) {
    if (error && error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

async function readJsonIfExists(rootDir, relativePath) {
  const text = await readTextIfExists(rootDir, relativePath);
  return text ? JSON.parse(text) : null;
}

function parsePhaseProgress(markdown, blockId) {
  const numericId = String(blockId || '').replace(/^[A-Z]+/, '');
  if (!numericId) {
    return { total: 0, done: 0, open: 0, percent: 0 };
  }

  const checkboxPattern = new RegExp(`^- \\[([ xX])\\]\\s+${numericId}\\.`, 'gm');
  const matches = [...String(markdown || '').matchAll(checkboxPattern)];
  const done = matches.filter((match) => match[1].toLowerCase() === 'x').length;
  return {
    total: matches.length,
    done,
    open: matches.length - done,
    percent: matches.length > 0 ? Math.round((done / matches.length) * 1000) / 10 : 0,
  };
}

function parseDodProgress(markdown) {
  const section = getSection(String(markdown || ''), '## Definition of Done', /\n##\s+/g);
  const matches = [...section.matchAll(/^- \[([ xX])\]\s+/gm)];
  const done = matches.filter((match) => match[1].toLowerCase() === 'x').length;
  return {
    total: matches.length,
    done,
    open: matches.length - done,
    percent: matches.length > 0 ? Math.round((done / matches.length) * 1000) / 10 : 0,
  };
}

function parsePhases(markdown) {
  const text = String(markdown || '');
  const matches = [...text.matchAll(/^###\s+([0-9]+\.[0-9]+(?:\.[0-9]+)?)\s+(.+)$/gm)];

  return matches.map((match, index) => {
    const start = match.index || 0;
    const end = index + 1 < matches.length ? matches[index + 1].index || text.length : text.length;
    const body = text.slice(start, end);
    const checkboxMatches = [...body.matchAll(/^- \[([ xX])\]\s+/gm)];
    const done = checkboxMatches.filter((checkbox) => checkbox[1].toLowerCase() === 'x').length;
    const statusMatch = body.match(/^status:\s*(.+)$/m);
    const goalMatch = body.match(/^goal:\s*(.+)$/m);
    const outputMatch = body.match(/^output:\s*(.+)$/m);

    return {
      id: match[1],
      title: cleanCell(match[2]),
      status: statusMatch ? cleanCell(statusMatch[1]) : null,
      goal: goalMatch ? cleanCell(goalMatch[1]) : null,
      output: outputMatch ? cleanCell(outputMatch[1]) : null,
      progress: {
        total: checkboxMatches.length,
        done,
        open: checkboxMatches.length - done,
      },
    };
  });
}

async function enrichBlock(rootDir, row) {
  const planFile = row.plan_file || null;
  const planText = planFile ? await readTextIfExists(rootDir, planFile) : null;
  const frontmatter = planText ? parseFrontmatter(planText) : {};
  const phaseProgress = planText ? parsePhaseProgress(planText, row.id) : { total: 0, done: 0, open: 0, percent: 0 };
  const dodProgress = planText ? parseDodProgress(planText) : { total: 0, done: 0, open: 0, percent: 0 };

  return {
    id: row.id,
    title: row.title,
    status: row.status,
    priority: row.priority,
    owner: row.owner,
    currentPhase: row.currentPhase,
    planFile,
    group: row.group,
    groupLabel: row.groupLabel,
    dependsOn: normalizeList(row.dependsOn).map(normalizeDependency).filter(Boolean),
    affectedArea: frontmatter.affected_area || null,
    scopeFiles: normalizeList(frontmatter.scope_files),
    scopeReferenceFiles: normalizeList(frontmatter.scope_reference_files),
    verification: normalizeList(frontmatter.verification),
    relatedFollowupBlocks: normalizeList(frontmatter.related_followup_blocks),
    blockedBy: normalizeList(frontmatter.blocked_by).map(normalizeDependency).filter(Boolean),
    sourceFindings: normalizeList(frontmatter.source_findings),
    phaseProgress,
    dodProgress,
    phases: planText ? parsePhases(planText) : [],
    hasPlanFile: Boolean(planText),
  };
}

async function parseMasterBlocks(rootDir, markdown) {
  const blocks = [];

  for (const sectionConfig of MASTER_BLOCK_SECTIONS) {
    const section = getSection(markdown, sectionConfig.heading, /\n#{2,3}\s+/g);
    const rows = parseMarkdownTable(section);
    for (const row of rows) {
      const id = cleanCell(row.id);
      if (!/^V[0-9]+$/.test(id)) {
        continue;
      }

      blocks.push(await enrichBlock(rootDir, {
        id,
        title: cleanCell(row.titel),
        status: cleanCell(row.status),
        priority: cleanCell(row.prio),
        owner: cleanCell(row.owner),
        dependsOn: cleanCell(row.depends_on),
        currentPhase: cleanCell(row.current_phase),
        plan_file: cleanCell(row.plan_file),
        group: sectionConfig.group,
        groupLabel: sectionConfig.label,
      }));
    }
  }

  return blocks;
}

function dependencyEdgeId(from, to, phase, kind, source) {
  return [from, to, phase || '', kind || '', source || ''].join('|');
}

function parseDependencyEdges(markdown, blocks) {
  const blockIds = new Set(blocks.map((block) => block.id));
  const edgesById = new Map();
  const dependencySection = getSection(markdown, '## Abhaengigkeiten', /\n##\s+/g);

  for (const row of parseMarkdownTable(dependencySection)) {
    const from = normalizeBlockId(row.Block);
    if (!from || !blockIds.has(from)) {
      continue;
    }

    for (const dependency of normalizeList(row['Depends-On']).map(normalizeDependency).filter(Boolean)) {
      const id = dependencyEdgeId(from, dependency.blockId, dependency.phase, cleanCell(row.Typ), 'master-dependency-table');
      edgesById.set(id, {
        id,
        from,
        to: dependency.blockId,
        raw: dependency.raw,
        phase: dependency.phase,
        kind: cleanCell(row.Typ) || 'hard',
        fulfilled: /^ja$/i.test(cleanCell(row.Erfuellt)),
        hint: cleanCell(row.Hinweis),
        source: 'master-dependency-table',
      });
    }
  }

  for (const block of blocks) {
    for (const dependency of block.dependsOn) {
      const id = dependencyEdgeId(block.id, dependency.blockId, dependency.phase, 'unknown', 'master-block-row');
      const equivalentExists = [...edgesById.values()].some((edge) => (
        edge.from === block.id && edge.to === dependency.blockId && (edge.phase === dependency.phase || !dependency.phase)
      ));
      if (!equivalentExists) {
        edgesById.set(id, {
          id,
          from: block.id,
          to: dependency.blockId,
          raw: dependency.raw,
          phase: dependency.phase,
          kind: 'unknown',
          fulfilled: null,
          hint: '',
          source: 'master-block-row',
        });
      }
    }
  }

  return [...edgesById.values()].sort((left, right) => (
    left.from.localeCompare(right.from, 'en', { numeric: true })
    || left.to.localeCompare(right.to, 'en', { numeric: true })
    || String(left.phase || '').localeCompare(String(right.phase || ''), 'en', { numeric: true })
  ));
}

function parseRecommendedOrder(markdown) {
  const section = getSection(markdown, '## Empfohlene Reihenfolge', /\n##\s+/g);
  return section
    .split(/\r?\n/)
    .map((line) => line.match(/^\d+\.\s+`?(V[0-9]+)`?\s*(.*)$/))
    .filter(Boolean)
    .map((match, index) => ({
      rank: index + 1,
      blockId: match[1],
      text: cleanCell(match[2]),
    }));
}

function parseMasterLockRows(markdown) {
  const section = getSection(markdown, '## Lock-Status', /\n##\s+/g);
  return parseMarkdownTable(section)
    .map((row) => ({
      agent: cleanCell(row.Agent),
      blockId: normalizeBlockId(row['Block / Stream']),
      stream: cleanCell(row['Block / Stream']),
      startDate: cleanCell(row['Start-Datum']),
      status: cleanCell(row.Status),
      targetCompletion: cleanCell(row['Ziel-Abschluss']),
    }))
    .filter((row) => row.blockId);
}

function parseOpenFindings(markdown) {
  const section = getSection(markdown || '', '## Offene Findings', /\n##\s+/g);
  return parseMarkdownTable(section)
    .map((row) => ({
      id: cleanCell(row.id),
      files: normalizeList(row.datei || row.Datei),
      finding: cleanCell(row.finding || row.Finding || row.befund),
      severity: cleanCell(row.prio || row.Prio || row.risiko || row.Risiko),
    }))
    .filter((finding) => finding.id);
}

function summarizeKnowledgeGraph(graph) {
  if (!graph) {
    return null;
  }

  const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
  const edges = Array.isArray(graph.edges) ? graph.edges : [];
  const nodeTypes = {};
  const edgeTypes = {};

  for (const node of nodes) {
    const type = node.type || 'unknown';
    nodeTypes[type] = (nodeTypes[type] || 0) + 1;
  }

  for (const edge of edges) {
    const type = edge.type || 'unknown';
    edgeTypes[type] = (edgeTypes[type] || 0) + 1;
  }

  return {
    schemaVersion: graph.schema_version ?? null,
    contract: graph.contract || null,
    nodeCount: nodes.length,
    edgeCount: edges.length,
    nodeTypes,
    edgeTypes,
  };
}

function summarizeScorecard(scorecard) {
  if (!scorecard) {
    return null;
  }

  return {
    contract: scorecard.contract || null,
    status: scorecard.current?.status || null,
    score: scorecard.current?.score ?? null,
    metrics: scorecard.current?.metrics || {},
    trend: scorecard.trend || null,
    criticalPaths: Array.isArray(scorecard.criticalPaths) ? scorecard.criticalPaths : [],
  };
}

function summarizeCoverage(coverage) {
  if (!coverage) {
    return null;
  }

  return {
    contract: coverage.contract || null,
    summary: coverage.summary || {},
    gate: coverage.gate || {},
    overlayBlocks: Array.isArray(coverage.overlayBlocks) ? coverage.overlayBlocks : [],
  };
}

function buildScopeCollisions(graph, blocks) {
  if (!graph || !Array.isArray(graph.edges)) {
    return [];
  }

  const masterBlockIds = new Set(blocks.map((block) => block.id));
  const fileToBlocks = new Map();

  for (const edge of graph.edges) {
    if (edge.type !== 'scope' || !masterBlockIds.has(edge.from) || typeof edge.to !== 'string') {
      continue;
    }

    if (!fileToBlocks.has(edge.to)) {
      fileToBlocks.set(edge.to, new Set());
    }
    fileToBlocks.get(edge.to).add(edge.from);
  }

  const pairToFiles = new Map();
  for (const [filePath, blockSet] of fileToBlocks.entries()) {
    const sortedBlocks = [...blockSet].sort((left, right) => left.localeCompare(right, 'en', { numeric: true }));
    for (let leftIndex = 0; leftIndex < sortedBlocks.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < sortedBlocks.length; rightIndex += 1) {
        const pairId = `${sortedBlocks[leftIndex]}|${sortedBlocks[rightIndex]}`;
        if (!pairToFiles.has(pairId)) {
          pairToFiles.set(pairId, []);
        }
        pairToFiles.get(pairId).push(filePath);
      }
    }
  }

  return [...pairToFiles.entries()]
    .map(([pairId, sharedFiles]) => {
      const [leftBlock, rightBlock] = pairId.split('|');
      return {
        leftBlock,
        rightBlock,
        sharedFiles: sharedFiles.sort(),
        sharedFileCount: sharedFiles.length,
      };
    })
    .filter((collision) => collision.sharedFileCount > 0)
    .sort((left, right) => (
      right.sharedFileCount - left.sharedFileCount
      || left.leftBlock.localeCompare(right.leftBlock, 'en', { numeric: true })
      || left.rightBlock.localeCompare(right.rightBlock, 'en', { numeric: true })
    ));
}

async function readCuratedScopeCollisions(rootDir) {
  try {
    const { stdout } = await execFile(
      process.execPath,
      ['scripts/query-knowledge-graph.mjs', 'scope-collisions', '--json'],
      {
        cwd: rootDir,
        windowsHide: true,
        timeout: 30_000,
        maxBuffer: 2 * 1024 * 1024,
      },
    );
    const payload = JSON.parse(stdout);
    if (!Array.isArray(payload.collisions)) {
      return null;
    }
    return payload.collisions.map((collision) => ({
      leftBlock: collision.leftBlock,
      rightBlock: collision.rightBlock,
      sharedFiles: Array.isArray(collision.sharedFiles) ? collision.sharedFiles : [],
      sharedFileCount: Array.isArray(collision.sharedFiles) ? collision.sharedFiles.length : 0,
      source: 'query-knowledge-graph:scope-collisions',
    }));
  } catch {
    return null;
  }
}

function summarizeLocks(lockRegistry, masterLockRows) {
  const registryLocks = Array.isArray(lockRegistry?.locks) ? lockRegistry.locks : [];
  const activeStatuses = new Set(['active', 'in-progress', 'open', 'claimed']);
  const active = registryLocks
    .filter((lock) => activeStatuses.has(String(lock.status || '').toLowerCase()))
    .map((lock) => ({
      person: lock.person || null,
      blockId: lock.block_id || null,
      phase: lock.phase || null,
      status: lock.status || null,
      startDate: lock.start_date || null,
      targetCompletion: lock.target_completion || null,
      scopeFiles: Array.isArray(lock.scope_files) ? lock.scope_files : [],
      notes: lock.notes || '',
    }));

  return {
    generatedAt: lockRegistry?.generated_at || null,
    active,
    masterRows: masterLockRows,
  };
}

function isGovernanceFile(filePath) {
  return /^(AGENTS\.md|\.agents\/|docs\/Umsetzungsplan\.md|docs\/plaene\/aktiv\/|docs\/plaene\/CHANGELOG\.md)/.test(filePath);
}

function summarizeFileImpact(scopeFiles, collisions) {
  const concreteScopeFiles = scopeFiles.filter((filePath) => !filePath.includes('*'));
  const sharedFiles = new Set(collisions.flatMap((collision) => collision.sharedFiles || []));
  const packageFileCount = scopeFiles.filter((filePath) => /(^|\/)(package-lock\.json|package\.json|pnpm-lock\.yaml|yarn\.lock)$/.test(filePath)).length;
  const governanceFileCount = scopeFiles.filter(isGovernanceFile).length;
  const sourceFileCount = scopeFiles.filter((filePath) => /^(src|dev|scripts|electron)\//.test(filePath)).length;
  const testFileCount = scopeFiles.filter((filePath) => /^(tests|playwright|test)\//.test(filePath)).length;
  const docsFileCount = scopeFiles.filter((filePath) => /^docs\//.test(filePath)).length;
  const wildcardCount = scopeFiles.length - concreteScopeFiles.length;
  const score = scopeFiles.length
    + sharedFiles.size
    + packageFileCount * 5
    + governanceFileCount * 4
    + wildcardCount * 2;

  return {
    score,
    level: score >= 40 ? 'high' : score >= 16 ? 'medium' : 'low',
    scopeFileCount: scopeFiles.length,
    concreteScopeFileCount: concreteScopeFiles.length,
    wildcardCount,
    sharedFileCount: sharedFiles.size,
    packageFileCount,
    governanceFileCount,
    sourceFileCount,
    testFileCount,
    docsFileCount,
  };
}

function buildBlockInsights(blocks, dependencies, collisions, locks, recommendedOrder) {
  const activeLockByBlock = new Map(locks.active.map((lock) => [lock.blockId, lock]));
  const dependenciesByBlock = new Map();
  const consumersByBlock = new Map();
  const collisionsByBlock = new Map();
  const orderByBlock = new Map(recommendedOrder.map((entry) => [entry.blockId, entry]));

  for (const dependency of dependencies) {
    if (!dependenciesByBlock.has(dependency.from)) {
      dependenciesByBlock.set(dependency.from, []);
    }
    dependenciesByBlock.get(dependency.from).push(dependency);

    if (!consumersByBlock.has(dependency.to)) {
      consumersByBlock.set(dependency.to, []);
    }
    consumersByBlock.get(dependency.to).push(dependency);
  }

  for (const collision of collisions) {
    for (const blockId of [collision.leftBlock, collision.rightBlock]) {
      if (!collisionsByBlock.has(blockId)) {
        collisionsByBlock.set(blockId, []);
      }
      collisionsByBlock.get(blockId).push(collision);
    }
  }

  return blocks.map((block) => {
    const blockDependencies = dependenciesByBlock.get(block.id) || [];
    const blockConsumers = consumersByBlock.get(block.id) || [];
    const blockCollisions = collisionsByBlock.get(block.id) || [];
    const activeLock = activeLockByBlock.get(block.id) || null;
    const openDependencies = blockDependencies.filter((dependency) => dependency.fulfilled === false);
    const openHardDependencies = openDependencies.filter((dependency) => dependency.kind === 'hard');
    const openSoftDependencies = openDependencies.filter((dependency) => dependency.kind === 'soft');
    const openUnknownDependencies = openDependencies.filter((dependency) => dependency.kind !== 'hard' && dependency.kind !== 'soft');
    const order = orderByBlock.get(block.id) || null;

    let readiness = {
      status: 'done',
      label: 'abgeschlossen',
      reason: 'Block ist laut Master abgeschlossen.',
    };

    if (block.status !== 'done') {
      if (activeLock) {
        readiness = {
          status: 'locked',
          label: 'in Arbeit',
          reason: `Aktiver Lock auf ${activeLock.phase || block.id}.`,
        };
      } else if (openHardDependencies.length > 0) {
        readiness = {
          status: 'blocked',
          label: 'blockiert',
          reason: `${openHardDependencies.length} harte Dependency offen.`,
        };
      } else if (openSoftDependencies.length > 0 || openUnknownDependencies.length > 0) {
        readiness = {
          status: 'ready-with-risk',
          label: 'startklar mit Risiko',
          reason: `${openSoftDependencies.length + openUnknownDependencies.length} Soft/unklare Gates offen.`,
        };
      } else {
        readiness = {
          status: 'ready',
          label: 'startklar',
          reason: 'Keine offenen harten Dependencies gefunden.',
        };
      }
    }

    return {
      ...block,
      readiness: {
        ...readiness,
        openDependencyCount: openDependencies.length,
        openHardDependencyCount: openHardDependencies.length,
        openSoftDependencyCount: openSoftDependencies.length,
        openUnknownDependencyCount: openUnknownDependencies.length,
        dependencyCount: blockDependencies.length,
        consumerCount: blockConsumers.length,
        collisionCount: blockCollisions.length,
        activeLock: activeLock ? {
          person: activeLock.person,
          phase: activeLock.phase,
          status: activeLock.status,
          startDate: activeLock.startDate,
        } : null,
        recommendedRank: order?.rank || null,
        recommendedText: order?.text || '',
      },
      impact: summarizeFileImpact(block.scopeFiles || [], blockCollisions),
    };
  });
}

function buildFileIndex(blocks, collisions) {
  const entries = new Map();

  function ensureEntry(filePath) {
    if (!entries.has(filePath)) {
      entries.set(filePath, {
        path: filePath,
        blocks: new Set(),
        collisionBlocks: new Set(),
        collisionCount: 0,
      });
    }
    return entries.get(filePath);
  }

  for (const block of blocks) {
    for (const filePath of block.scopeFiles || []) {
      ensureEntry(filePath).blocks.add(block.id);
    }
  }

  for (const collision of collisions) {
    for (const filePath of collision.sharedFiles || []) {
      const entry = ensureEntry(filePath);
      entry.collisionBlocks.add(collision.leftBlock);
      entry.collisionBlocks.add(collision.rightBlock);
      entry.collisionCount += 1;
    }
  }

  return [...entries.values()]
    .map((entry) => ({
      path: entry.path,
      blocks: [...entry.blocks].sort((left, right) => left.localeCompare(right, 'en', { numeric: true })),
      collisionBlocks: [...entry.collisionBlocks].sort((left, right) => left.localeCompare(right, 'en', { numeric: true })),
      collisionCount: entry.collisionCount,
      isGovernance: isGovernanceFile(entry.path),
    }))
    .sort((left, right) => (
      right.collisionCount - left.collisionCount
      || left.path.localeCompare(right.path)
    ));
}

function buildSummary(blocks, dependencies, collisions, locks) {
  const byStatus = {};
  const byPriority = {};
  const byGroup = {};
  const byReadiness = {};
  for (const block of blocks) {
    byStatus[block.status] = (byStatus[block.status] || 0) + 1;
    byPriority[block.priority] = (byPriority[block.priority] || 0) + 1;
    byGroup[block.group] = (byGroup[block.group] || 0) + 1;
    const readiness = block.readiness?.status || 'unknown';
    byReadiness[readiness] = (byReadiness[readiness] || 0) + 1;
  }

  return {
    blockCount: blocks.length,
    dependencyCount: dependencies.length,
    collisionCount: collisions.length,
    activeLockCount: locks.active.length,
    byStatus,
    byPriority,
    byGroup,
    byReadiness,
  };
}

export async function buildPlanMapData(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const masterPlan = await readTextIfExists(rootDir, MASTER_PLAN_PATH);
  if (!masterPlan) {
    throw new Error(`Missing required input: ${MASTER_PLAN_PATH}`);
  }

  const [
    openFindingsText,
    graph,
    coverage,
    scorecard,
    lockRegistry,
  ] = await Promise.all([
    readTextIfExists(rootDir, OPEN_FINDINGS_PATH),
    readJsonIfExists(rootDir, KNOWLEDGE_GRAPH_PATH),
    readJsonIfExists(rootDir, KNOWLEDGE_GRAPH_COVERAGE_PATH),
    readJsonIfExists(rootDir, KNOWLEDGE_GRAPH_SCORECARD_PATH),
    readJsonIfExists(rootDir, LOCK_REGISTRY_PATH),
  ]);

  const parsedBlocks = await parseMasterBlocks(rootDir, masterPlan);
  const dependencies = parseDependencyEdges(masterPlan, parsedBlocks);
  const recommendedOrder = parseRecommendedOrder(masterPlan);
  const locks = summarizeLocks(lockRegistry, parseMasterLockRows(masterPlan));
  const scopeCollisions = await readCuratedScopeCollisions(rootDir) ?? buildScopeCollisions(graph, parsedBlocks);
  const blocks = buildBlockInsights(parsedBlocks, dependencies, scopeCollisions, locks, recommendedOrder);
  const fileIndex = buildFileIndex(blocks, scopeCollisions);

  return {
    schema_version: 1,
    contract: 'curvios.plan-map.v1',
    generatedAt: new Date().toISOString(),
    readOnly: true,
    sources: {
      masterPlan: MASTER_PLAN_PATH,
      changelog: CHANGELOG_PATH,
      openFindings: OPEN_FINDINGS_PATH,
      knowledgeGraph: graph ? KNOWLEDGE_GRAPH_PATH : null,
      knowledgeGraphCoverage: coverage ? KNOWLEDGE_GRAPH_COVERAGE_PATH : null,
      knowledgeGraphScorecard: scorecard ? KNOWLEDGE_GRAPH_SCORECARD_PATH : null,
      lockRegistry: lockRegistry ? LOCK_REGISTRY_PATH : null,
    },
    blocks,
    dependencies,
    recommendedOrder,
    locks,
    scopeCollisions,
    fileIndex,
    openFindings: parseOpenFindings(openFindingsText),
    graph: summarizeKnowledgeGraph(graph),
    coverage: summarizeCoverage(coverage),
    scorecard: summarizeScorecard(scorecard),
    summary: buildSummary(blocks, dependencies, scopeCollisions, locks),
  };
}

function parseArgs(argv) {
  const args = {
    output: DEFAULT_OUTPUT,
    stdout: false,
    pretty: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--stdout') {
      args.stdout = true;
    } else if (arg === '--compact') {
      args.pretty = false;
    } else if (arg === '--out') {
      args.output = argv[index + 1] || args.output;
      index += 1;
    } else if (arg.startsWith('--out=')) {
      args.output = arg.slice('--out='.length);
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    }
  }

  return args;
}

function printHelp() {
  process.stdout.write([
    'Usage: node scripts/export-plan-map.mjs [--out <path>] [--stdout] [--compact]',
    '',
    `Default output: ${DEFAULT_OUTPUT}`,
    '',
  ].join('\n'));
}

async function writeOutput(rootDir, relativePath, payload) {
  const absolutePath = path.resolve(rootDir, relativePath);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, payload, 'utf8');
  return absolutePath;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const rootDir = process.cwd();
  const data = await buildPlanMapData({ rootDir });
  const json = JSON.stringify(data, null, args.pretty ? 2 : 0);

  if (args.stdout) {
    process.stdout.write(`${json}\n`);
    return;
  }

  const outputPath = await writeOutput(rootDir, args.output, `${json}\n`);
  process.stdout.write(`plan-map: wrote ${path.relative(rootDir, outputPath)}\n`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`plan-map: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
