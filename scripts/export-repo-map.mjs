#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';

import { collectArchitectureReport } from './architecture/ArchitectureAnalysis.mjs';
import { queryCriticalPathHealth, queryScopeCollisions } from './query-knowledge-graph.mjs';

const DEFAULT_OUTPUT = 'tmp/repo-map/repo-map.json';
const KNOWLEDGE_GRAPH_PATH = 'docs/generated/knowledge-graph.json';
const KNOWLEDGE_GRAPH_COVERAGE_PATH = 'docs/generated/knowledge-graph.coverage.json';
const KNOWLEDGE_GRAPH_SCORECARD_PATH = 'docs/generated/knowledge-graph.scorecard.json';
const execFile = promisify(execFileCallback);

const ACTIVE_UNCOVERED_CLASSIFICATION_RANK = Object.freeze({
  'product-code': 0,
  'governance-tooling': 1,
  'dev-tooling': 2,
  'product-docs': 3,
  other: 4,
});

function normalizePath(value) {
  return String(value || '')
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\.\/+/, '')
    .replace(/\/{2,}/g, '/');
}

function topPathSegment(filePath) {
  const normalized = normalizePath(filePath);
  if (!normalized.includes('/')) {
    return '<root>';
  }
  return normalized.split('/')[0] || '<root>';
}

async function readTextIfExists(rootDir, relativePath) {
  try {
    return await fs.readFile(path.join(rootDir, relativePath), 'utf8');
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw error;
  }
}

async function readJsonIfExists(rootDir, relativePath) {
  const text = await readTextIfExists(rootDir, relativePath);
  return text ? JSON.parse(text) : null;
}

async function readTrackedFiles(rootDir) {
  try {
    const { stdout } = await execFile('git', ['ls-files', '-z'], {
      cwd: rootDir,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    });
    return stdout
      .split('\0')
      .map(normalizePath)
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right));
  } catch {
    return [];
  }
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function addToSetMap(map, key, values) {
  const normalizedKey = normalizePath(key);
  if (!normalizedKey) return;
  if (!map.has(normalizedKey)) map.set(normalizedKey, new Set());
  for (const value of toArray(values).filter(Boolean)) {
    map.get(normalizedKey).add(String(value));
  }
}

function getNodeCriticalPaths(node) {
  const attributes = node?.attributes || {};
  const raw = Array.isArray(attributes.criticalPaths)
    ? attributes.criticalPaths
    : [attributes.criticalPath];
  return raw.map((entry) => String(entry || '').trim()).filter(Boolean);
}

function buildGraphIndexes(graph) {
  const nodes = toArray(graph?.nodes);
  const edges = toArray(graph?.edges);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const fileNodes = nodes.filter((node) => node.type === 'file');
  const fileNodeByPath = new Map(fileNodes.map((node) => [normalizePath(node.id), node]));
  const criticalPathsByFile = new Map();
  const graphSourcesByFile = new Map();
  const scopeBlocksByFile = new Map();
  const surfacesByFile = new Map();

  for (const fileNode of fileNodes) {
    addToSetMap(graphSourcesByFile, fileNode.id, fileNode.attributes?.source || []);
    addToSetMap(scopeBlocksByFile, fileNode.id, fileNode.attributes?.scopeBlocks || []);
  }

  for (const node of nodes) {
    const criticalPaths = getNodeCriticalPaths(node);
    const filePath = normalizePath(node.attributes?.file || '');
    if (filePath && criticalPaths.length > 0) {
      addToSetMap(criticalPathsByFile, filePath, criticalPaths);
    }
  }

  for (const edge of edges) {
    if (edge.type === 'implements') {
      const targetNode = nodeById.get(edge.to);
      const criticalPaths = getNodeCriticalPaths(targetNode);
      if (criticalPaths.length > 0) addToSetMap(criticalPathsByFile, edge.from, criticalPaths);
    }
    if (edge.type === 'scope') {
      addToSetMap(scopeBlocksByFile, edge.to, [edge.from]);
    }
    if (edge.type === 'touches') {
      addToSetMap(surfacesByFile, edge.from, [edge.to]);
    }
  }

  return {
    nodes,
    edges,
    nodeById,
    fileNodes,
    fileNodeByPath,
    criticalPathsByFile,
    graphSourcesByFile,
    scopeBlocksByFile,
    surfacesByFile,
  };
}

function addArchitectureFlag(flagsByFile, filePath, flag) {
  const normalizedFilePath = normalizePath(filePath);
  if (!normalizedFilePath) return;
  if (!flagsByFile.has(normalizedFilePath)) flagsByFile.set(normalizedFilePath, []);
  flagsByFile.get(normalizedFilePath).push(flag);
}

function buildArchitectureFlags(report) {
  const flagsByFile = new Map();
  const findings = report?.findings || {};
  const edgeGroups = [
    ['core-to-ui-import', findings.coreToUiImports],
    ['ui-to-core-import', findings.uiToCoreImports],
    ['ui-to-state-import', findings.uiToStateImports],
    ['state-to-ui-import', findings.stateToUiImports],
    ['entities-to-core-import', findings.entitiesToCoreImports],
    ['state-to-core-import', findings.stateToCoreImports],
    ['shared-contracts-to-core-import', findings.sharedContractsToCoreImports],
  ];

  for (const [kind, entries] of edgeGroups) {
    for (const entry of toArray(entries)) {
      addArchitectureFlag(flagsByFile, entry.from, {
        kind,
        line: entry.line ?? null,
        allowed: entry.allowed === true,
        target: entry.to || null,
      });
    }
  }

  for (const entry of toArray(findings.configWrites)) {
    addArchitectureFlag(flagsByFile, entry.file, {
      kind: 'config-write',
      line: entry.line ?? null,
      allowed: entry.allowed === true,
    });
  }

  for (const entry of toArray(findings.domAccessesOutsideUi)) {
    addArchitectureFlag(flagsByFile, entry.file, {
      kind: 'dom-outside-ui',
      line: entry.line ?? null,
      allowed: entry.allowed === true,
    });
  }

  for (const entry of toArray(findings.constructorGameMatches)) {
    addArchitectureFlag(flagsByFile, entry.file, {
      kind: entry.kind || 'constructor-game',
      line: entry.line ?? null,
      allowed: entry.allowed === true,
    });
  }

  for (const entry of toArray(findings.legacySurfaceReads)) {
    addArchitectureFlag(flagsByFile, entry.file, {
      kind: `legacy-surface:${entry.surfaceId || 'unknown'}`,
      line: entry.line ?? null,
      allowed: entry.allowed === true,
    });
  }

  return flagsByFile;
}

function buildFileEntries({ trackedFiles, coverage, graphIndexes, architectureFlagsByFile }) {
  const trackedFileSet = new Set(trackedFiles);
  const coverageByPath = new Map(
    toArray(coverage?.files).map((entry) => [normalizePath(entry.path), entry]),
  );
  const allFilePaths = new Set([
    ...trackedFiles,
    ...coverageByPath.keys(),
    ...graphIndexes.fileNodeByPath.keys(),
  ]);

  return [...allFilePaths]
    .map((filePath) => {
      const coverageEntry = coverageByPath.get(filePath) || null;
      const fileNode = graphIndexes.fileNodeByPath.get(filePath) || null;
      const architectureFlags = architectureFlagsByFile.get(filePath) || [];
      const disallowedArchitectureFlags = architectureFlags.filter((flag) => flag.allowed !== true);
      const scopeBlocks = new Set([
        ...toArray(coverageEntry?.scopeBlocks),
        ...(graphIndexes.scopeBlocksByFile.get(filePath) || []),
      ]);
      const surfaces = new Set([
        ...toArray(coverageEntry?.surfaces).map((surface) => surface.surface || surface).filter(Boolean),
        ...(graphIndexes.surfacesByFile.get(filePath) || []),
      ]);

      return {
        path: filePath,
        topLevel: topPathSegment(filePath),
        inCoverage: coverageEntry != null,
        classification: coverageEntry?.classification || 'unknown',
        tracked: trackedFileSet.has(filePath) || coverageEntry?.tracked === true,
        covered: coverageEntry?.covered === true,
        coveredInCore: coverageEntry?.coveredInCore === true,
        coveredByOverlay: coverageEntry?.coveredByOverlay === true,
        excludedFromCoverage: coverageEntry?.excludedFromCoverage === true,
        excludeReason: coverageEntry?.excludeReason || null,
        coverageSources: toArray(coverageEntry?.coverageSources),
        scopeBlocks: [...scopeBlocks].sort((left, right) => left.localeCompare(right, 'en', { numeric: true })),
        surfaces: [...surfaces].sort((left, right) => left.localeCompare(right, 'en', { numeric: true })),
        criticalPaths: [...(graphIndexes.criticalPathsByFile.get(filePath) || [])]
          .sort((left, right) => left.localeCompare(right)),
        graphSources: [...(graphIndexes.graphSourcesByFile.get(filePath) || [])]
          .sort((left, right) => left.localeCompare(right)),
        existsInGraph: fileNode != null,
        graphFileExists: fileNode?.attributes?.exists ?? null,
        architectureFlags: architectureFlags.slice(0, 8),
        architectureFlagCount: architectureFlags.length,
        disallowedArchitectureFlagCount: disallowedArchitectureFlags.length,
      };
    })
    .sort((left, right) => left.path.localeCompare(right.path));
}

function incrementCounter(object, key, amount = 1) {
  const normalizedKey = String(key || 'unknown');
  object[normalizedKey] = (object[normalizedKey] || 0) + amount;
}

function buildFolderGroups(files) {
  const groups = new Map();
  for (const file of files) {
    if (!groups.has(file.topLevel)) {
      groups.set(file.topLevel, {
        id: file.topLevel,
        label: file.topLevel === '<root>' ? 'Root files' : file.topLevel,
        fileCount: 0,
        coverageFileCount: 0,
        coveredCount: 0,
        uncoveredActiveCount: 0,
        excludedCount: 0,
        unknownCoverageCount: 0,
        graphFileCount: 0,
        criticalFileCount: 0,
        architectureFlagCount: 0,
        disallowedArchitectureFlagCount: 0,
        scopeBlockCount: 0,
        classifications: {},
      });
    }

    const group = groups.get(file.topLevel);
    group.fileCount += 1;
    if (file.inCoverage) group.coverageFileCount += 1;
    if (!file.inCoverage) group.unknownCoverageCount += 1;
    if (file.covered) group.coveredCount += 1;
    if (file.inCoverage && !file.covered && !file.excludedFromCoverage) group.uncoveredActiveCount += 1;
    if (file.excludedFromCoverage) group.excludedCount += 1;
    if (file.existsInGraph) group.graphFileCount += 1;
    if (file.criticalPaths.length > 0) group.criticalFileCount += 1;
    group.architectureFlagCount += file.architectureFlagCount;
    group.disallowedArchitectureFlagCount += file.disallowedArchitectureFlagCount;
    group.scopeBlockCount += file.scopeBlocks.length;
    incrementCounter(group.classifications, file.classification);
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      coveragePercent: group.fileCount > 0
        ? Math.round((group.coveredCount / Math.max(1, group.coverageFileCount)) * 1000) / 10
        : 0,
    }))
    .sort((left, right) => (
      right.uncoveredActiveCount - left.uncoveredActiveCount
      || right.disallowedArchitectureFlagCount - left.disallowedArchitectureFlagCount
      || right.fileCount - left.fileCount
      || left.id.localeCompare(right.id)
    ));
}

function buildBlocks(graphIndexes) {
  return graphIndexes.nodes
    .filter((node) => node.type === 'block')
    .map((node) => {
      const source = toArray(node.attributes?.source);
      return {
        id: node.id,
        title: node.title || node.id,
        status: node.status || 'unknown',
        priority: node.attributes?.priority || null,
        owner: node.attributes?.owner || null,
        currentPhase: node.attributes?.currentPhase || null,
        planFile: node.attributes?.planFile || null,
        source,
        isMasterIndexed: source.includes('master-index'),
        isAuditPlan: source.includes('audit-plan'),
        isArchive: source.includes('archive-index') || source.includes('archive-summary'),
      };
    })
    .sort((left, right) => left.id.localeCompare(right.id, 'en', { numeric: true }));
}

function buildCriticalPaths(graphIndexes, scorecard, health) {
  const scorecardByPath = new Map(toArray(scorecard?.criticalPaths).map((entry) => [entry.criticalPath, entry]));
  const healthByPath = new Map(toArray(health?.criticalPaths).map((entry) => [entry.criticalPath, entry]));
  const allCriticalPaths = new Set([
    ...scorecardByPath.keys(),
    ...healthByPath.keys(),
    ...graphIndexes.nodes.flatMap(getNodeCriticalPaths),
  ]);

  return [...allCriticalPaths]
    .filter(Boolean)
    .sort((left, right) => left.localeCompare(right))
    .map((criticalPath) => {
      const pathNodes = graphIndexes.nodes.filter((node) => getNodeCriticalPaths(node).includes(criticalPath));
      const nodeIds = new Set(pathNodes.map((node) => node.id));
      const implementedFiles = graphIndexes.edges
        .filter((edge) => edge.type === 'implements' && nodeIds.has(edge.to))
        .map((edge) => edge.from);
      const attributeFiles = pathNodes.map((node) => node.attributes?.file).filter(Boolean);
      const files = [...new Set([...implementedFiles, ...attributeFiles].map(normalizePath).filter(Boolean))]
        .sort((left, right) => left.localeCompare(right));
      const tests = pathNodes
        .filter((node) => node.type === 'test')
        .map((node) => ({
          id: node.id,
          title: node.title || node.id,
          file: node.attributes?.file || null,
        }))
        .sort((left, right) => left.id.localeCompare(right.id));

      return {
        id: criticalPath,
        status: scorecardByPath.get(criticalPath)?.status || healthByPath.get(criticalPath)?.status || 'unknown',
        nodeCount: pathNodes.length,
        edgeCount: scorecardByPath.get(criticalPath)?.edgeCount ?? null,
        layers: scorecardByPath.get(criticalPath)?.layers || [],
        validationEdgeCount: scorecardByPath.get(criticalPath)?.validationEdgeCount ?? null,
        missingValidationCount: toArray(healthByPath.get(criticalPath)?.missingValidation).length,
        files,
        tests,
      };
    });
}

function buildHotspots(files, architectureReport, scopeCollisions) {
  const activeUncovered = files
    .filter((file) => file.inCoverage && !file.covered && !file.excludedFromCoverage)
    .sort((left, right) => (
      (ACTIVE_UNCOVERED_CLASSIFICATION_RANK[left.classification] ?? 99)
      - (ACTIVE_UNCOVERED_CLASSIFICATION_RANK[right.classification] ?? 99)
      || left.path.localeCompare(right.path)
    ))
    .slice(0, 80);
  const architectureFiles = files
    .filter((file) => file.disallowedArchitectureFlagCount > 0 || file.architectureFlagCount > 0)
    .sort((left, right) => (
      right.disallowedArchitectureFlagCount - left.disallowedArchitectureFlagCount
      || right.architectureFlagCount - left.architectureFlagCount
      || left.path.localeCompare(right.path)
    ))
    .slice(0, 80);
  const criticalFiles = files
    .filter((file) => file.criticalPaths.length > 0)
    .sort((left, right) => (
      right.criticalPaths.length - left.criticalPaths.length
      || left.path.localeCompare(right.path)
    ));

  return {
    activeUncovered,
    architectureFiles,
    criticalFiles,
    largestFiles: architectureReport?.fileSizes?.largestFiles || [],
    scopeCollisions: scopeCollisions.slice(0, 40),
  };
}

function buildSummary({ graph, coverage, scorecard, architectureReport, files, folders, blocks, criticalPaths, scopeCollisions }) {
  const nodeTypes = {};
  const edgeTypes = {};
  const classifications = {};
  const topLevels = {};
  for (const node of toArray(graph?.nodes)) incrementCounter(nodeTypes, node.type);
  for (const edge of toArray(graph?.edges)) incrementCounter(edgeTypes, edge.type);
  for (const file of files) {
    incrementCounter(classifications, file.classification);
    incrementCounter(topLevels, file.topLevel);
  }

  return {
    fileCount: files.length,
    folderCount: folders.length,
    blockCount: blocks.length,
    criticalPathCount: criticalPaths.length,
    activeUncoveredFileCount: files.filter((file) => file.inCoverage && !file.covered && !file.excludedFromCoverage).length,
    architectureFlaggedFileCount: files.filter((file) => file.architectureFlagCount > 0).length,
    disallowedArchitectureFileCount: files.filter((file) => file.disallowedArchitectureFlagCount > 0).length,
    scopeCollisionCount: scopeCollisions.length,
    graph: {
      contract: graph?.contract || null,
      nodeCount: toArray(graph?.nodes).length,
      edgeCount: toArray(graph?.edges).length,
      nodeTypes,
      edgeTypes,
    },
    coverage: coverage?.summary || {},
    scorecard: {
      status: scorecard?.current?.status || null,
      score: scorecard?.current?.score ?? null,
      metrics: scorecard?.current?.metrics || {},
      trend: scorecard?.trend || null,
    },
    architecture: {
      sourceFileCount: architectureReport?.sourceFileCount ?? null,
      localEdgeCount: architectureReport?.importGraph?.localEdgeCount ?? null,
      scorecard: architectureReport?.scorecard || {},
    },
    classifications,
    topLevels,
  };
}

export async function buildRepoMapData(options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const [graph, coverage, scorecard, trackedFiles] = await Promise.all([
    readJsonIfExists(rootDir, KNOWLEDGE_GRAPH_PATH),
    readJsonIfExists(rootDir, KNOWLEDGE_GRAPH_COVERAGE_PATH),
    readJsonIfExists(rootDir, KNOWLEDGE_GRAPH_SCORECARD_PATH),
    readTrackedFiles(rootDir),
  ]);

  if (!graph) throw new Error(`Missing required input: ${KNOWLEDGE_GRAPH_PATH}`);
  if (!coverage) throw new Error(`Missing required input: ${KNOWLEDGE_GRAPH_COVERAGE_PATH}`);

  const architectureReport = collectArchitectureReport(rootDir);
  const graphIndexes = buildGraphIndexes(graph);
  const architectureFlagsByFile = buildArchitectureFlags(architectureReport);
  const files = buildFileEntries({ trackedFiles, coverage, graphIndexes, architectureFlagsByFile });
  const folders = buildFolderGroups(files);
  const blocks = buildBlocks(graphIndexes);
  const health = queryCriticalPathHealth(graph);
  const criticalPaths = buildCriticalPaths(graphIndexes, scorecard, health);
  const scopeCollisions = queryScopeCollisions(graph).collisions
    .map((collision) => ({
      leftBlock: collision.leftBlock,
      rightBlock: collision.rightBlock,
      sharedFiles: toArray(collision.sharedFiles).map(normalizePath).sort(),
      sharedFileCount: toArray(collision.sharedFiles).length,
    }))
    .sort((left, right) => (
      right.sharedFileCount - left.sharedFileCount
      || left.leftBlock.localeCompare(right.leftBlock, 'en', { numeric: true })
      || left.rightBlock.localeCompare(right.rightBlock, 'en', { numeric: true })
    ));

  return {
    schema_version: 1,
    contract: 'curvios.repo-map.v1',
    generatedAt: new Date().toISOString(),
    readOnly: true,
    sources: {
      knowledgeGraph: KNOWLEDGE_GRAPH_PATH,
      knowledgeGraphCoverage: KNOWLEDGE_GRAPH_COVERAGE_PATH,
      knowledgeGraphScorecard: scorecard ? KNOWLEDGE_GRAPH_SCORECARD_PATH : null,
      architectureReport: 'scripts/architecture/ArchitectureAnalysis.mjs',
      trackedFiles: 'git ls-files',
    },
    summary: buildSummary({
      graph,
      coverage,
      scorecard,
      architectureReport,
      files,
      folders,
      blocks,
      criticalPaths,
      scopeCollisions,
    }),
    folders,
    files,
    blocks,
    criticalPaths,
    scopeCollisions,
    hotspots: buildHotspots(files, architectureReport, scopeCollisions),
    architecture: {
      importGraph: architectureReport.importGraph,
      fileSizes: architectureReport.fileSizes,
      scorecard: architectureReport.scorecard,
    },
    coverageGate: coverage.gate || null,
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
    'Usage: node scripts/export-repo-map.mjs [--out <path>] [--stdout] [--compact]',
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
  const data = await buildRepoMapData({ rootDir });
  const json = JSON.stringify(data, null, args.pretty ? 2 : 0);

  if (args.stdout) {
    process.stdout.write(`${json}\n`);
    return;
  }

  const outputPath = await writeOutput(rootDir, args.output, `${json}\n`);
  process.stdout.write(`repo-map: wrote ${path.relative(rootDir, outputPath)}\n`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  main().catch((error) => {
    process.stderr.write(`repo-map: ${error.stack || error.message}\n`);
    process.exitCode = 1;
  });
}
