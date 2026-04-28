#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const GRAPH_PATH = 'docs/generated/knowledge-graph.json';
const COVERAGE_PATH = 'docs/generated/knowledge-graph.coverage.json';
const GIT_HOTSPOT_OVERLAY_ID = 'GIT-HISTORY-HOTSPOTS';

function normalizePath(value) {
    return String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/\/{2,}/g, '/');
}

function hasSource(node, sourceTag) {
    return Array.isArray(node?.attributes?.source) && node.attributes.source.includes(sourceTag);
}

function isScopeCollisionManagedBlock(node) {
    return hasSource(node, 'master-index') || hasSource(node, 'block-plan');
}

async function readArtifact(relativePath) {
    const absolutePath = path.join(ROOT, relativePath);
    const raw = await fs.readFile(absolutePath, 'utf8');
    return JSON.parse(raw);
}

async function readArtifacts() {
    const [graph, coverage] = await Promise.all([
        readArtifact(GRAPH_PATH),
        readArtifact(COVERAGE_PATH),
    ]);
    return { graph, coverage };
}

function buildCoverageFileIndex(coverage) {
    return new Map(
        (Array.isArray(coverage.files) ? coverage.files : [])
            .map((entry) => [normalizePath(entry.path), entry])
    );
}

function queryOpenDeps(graph, blockId) {
    const normalizedBlockId = String(blockId || '').trim();
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const result = edges
        .filter((edge) => edge.type === 'depends_on' && edge.from === normalizedBlockId && edge.fulfilled !== true)
        .map((edge) => ({
            dependsOn: edge.to,
            source: edge.source || 'unknown',
            hard: edge.hard === true,
            fulfilled: edge.fulfilled === true,
            hint: edge.hint ?? null,
            dependsPhase: edge.attributes?.dependsPhase ?? null,
        }))
        .sort((left, right) => String(left.dependsOn).localeCompare(String(right.dependsOn)));

    return {
        query: 'open-deps',
        blockId: normalizedBlockId,
        openDependencies: result,
    };
}

function queryScopeCollisions(graph) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];

    const openBlockIds = new Set(
        nodes
            .filter((node) => node.type === 'block' && node.status !== 'done' && isScopeCollisionManagedBlock(node))
            .map((node) => node.id)
    );

    const scopeByBlock = new Map();
    for (const edge of edges) {
        if (edge.type !== 'scope') continue;
        if (!openBlockIds.has(edge.from)) continue;
        if (!scopeByBlock.has(edge.from)) {
            scopeByBlock.set(edge.from, new Set());
        }
        scopeByBlock.get(edge.from).add(edge.to);
    }

    const blockIds = Array.from(scopeByBlock.keys()).sort((left, right) => left.localeCompare(right));
    const collisions = [];
    for (let index = 0; index < blockIds.length; index += 1) {
        for (let cursor = index + 1; cursor < blockIds.length; cursor += 1) {
            const leftBlock = blockIds[index];
            const rightBlock = blockIds[cursor];
            const rightScope = scopeByBlock.get(rightBlock);
            const shared = Array.from(scopeByBlock.get(leftBlock))
                .filter((filePath) => rightScope.has(filePath))
                .sort((left, right) => left.localeCompare(right));
            if (shared.length === 0) continue;
            collisions.push({
                leftBlock,
                rightBlock,
                sharedFiles: shared,
            });
        }
    }

    return {
        query: 'scope-collisions',
        collisions,
    };
}

function querySurfacesForFile(graph, filePath) {
    const normalizedFilePath = normalizePath(filePath);
    const edges = Array.isArray(graph.edges) ? graph.edges : [];

    const touches = edges
        .filter((edge) => edge.type === 'touches' && normalizePath(edge.from) === normalizedFilePath)
        .map((edge) => ({
            surface: edge.to,
            roles: Array.isArray(edge.attributes?.roles) ? edge.attributes.roles : [],
        }))
        .sort((left, right) => left.surface.localeCompare(right.surface));

    return {
        query: 'surfaces-for-file',
        file: normalizedFilePath,
        surfaces: touches,
    };
}

function queryCoverageReport(coverage) {
    return {
        query: 'coverage-report',
        summary: coverage.summary || {},
        overlayBlocks: Array.isArray(coverage.overlayBlocks) ? coverage.overlayBlocks : [],
    };
}

function queryUncoveredFiles(coverage, prefix = '') {
    const normalizedPrefix = normalizePath(prefix);
    const uncoveredFiles = (Array.isArray(coverage.files) ? coverage.files : [])
        .filter((entry) => entry.covered !== true)
        .filter((entry) => !normalizedPrefix || normalizePath(entry.path).startsWith(normalizedPrefix))
        .map((entry) => ({
            path: entry.path,
            classification: entry.classification,
            excludedFromCoverage: entry.excludedFromCoverage === true,
            excludeReason: entry.excludeReason ?? null,
            coverageSources: Array.isArray(entry.coverageSources) ? entry.coverageSources : [],
        }))
        .sort((left, right) => left.path.localeCompare(right.path));

    return {
        query: 'uncovered-files',
        prefix: normalizedPrefix || null,
        files: uncoveredFiles,
    };
}

function queryWhyFile(graph, coverage, filePath) {
    const normalizedFilePath = normalizePath(filePath);
    const coverageFile = buildCoverageFileIndex(coverage).get(normalizedFilePath) || null;
    const fileNode = (Array.isArray(graph.nodes) ? graph.nodes : [])
        .find((node) => node.type === 'file' && normalizePath(node.id) === normalizedFilePath) || null;

    return {
        query: 'why-file',
        file: normalizedFilePath,
        existsInCoreGraph: fileNode != null,
        fileNode,
        coverage: coverageFile,
    };
}

function queryFilesForBlock(graph, coverage, blockId) {
    const normalizedBlockId = String(blockId || '').trim();
    const coverageIndex = buildCoverageFileIndex(coverage);

    if (normalizedBlockId === GIT_HOTSPOT_OVERLAY_ID) {
        const overlay = (coverage.overlayBlocks || []).find((entry) => entry.id === normalizedBlockId) || null;
        return {
            query: 'files-for-block',
            blockId: normalizedBlockId,
            title: overlay?.title || null,
            coverageSource: overlay?.coverageSource || null,
            files: (overlay?.files || []).map((entry) => ({
                path: entry.path,
                changeCount: entry.changeCount,
                dirty: entry.dirty,
                classification: coverageIndex.get(normalizePath(entry.path))?.classification || null,
            })),
        };
    }

    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const files = edges
        .filter((edge) => edge.type === 'scope' && edge.from === normalizedBlockId)
        .map((edge) => {
            const coverageEntry = coverageIndex.get(normalizePath(edge.to)) || null;
            return {
                path: edge.to,
                covered: coverageEntry?.covered === true,
                classification: coverageEntry?.classification || null,
                excludedFromCoverage: coverageEntry?.excludedFromCoverage === true,
            };
        })
        .sort((left, right) => left.path.localeCompare(right.path));

    return {
        query: 'files-for-block',
        blockId: normalizedBlockId,
        files,
    };
}

function buildBtStatusEntry(graph, blockId) {
    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph.edges) ? graph.edges : [];
    const block = nodes.find((node) => node.type === 'block' && node.id === blockId && hasSource(node, 'bot-training-plan')) || null;
    if (!block) return null;

    const phases = nodes
        .filter((node) => node.type === 'phase' && node.attributes?.blockId === blockId)
        .map((node) => ({
            id: node.id,
            phaseCode: node.attributes?.phaseCode || null,
            status: node.status || 'unknown',
            title: node.title || null,
        }))
        .sort((left, right) => String(left.phaseCode).localeCompare(String(right.phaseCode)));
    const subphases = nodes
        .filter((node) => node.type === 'subphase' && node.attributes?.blockId === blockId)
        .map((node) => ({
            id: node.id,
            phaseCode: node.attributes?.phaseCode || null,
            status: node.status || 'unknown',
            title: node.title || null,
        }))
        .sort((left, right) => String(left.id).localeCompare(String(right.id)));
    const openDependencies = edges
        .filter((edge) => edge.type === 'depends_on' && edge.from === blockId && edge.fulfilled !== true)
        .map((edge) => ({
            dependsOn: edge.to,
            hard: edge.hard === true,
            hint: edge.hint ?? null,
            dependsPhase: edge.attributes?.dependsPhase ?? null,
        }))
        .sort((left, right) => left.dependsOn.localeCompare(right.dependsOn));

    return {
        id: block.id,
        title: block.title || null,
        status: block.status || 'unknown',
        currentPhase: block.attributes?.currentPhase || null,
        referencePlanFile: block.attributes?.referencePlanFile || null,
        scopeFileCount: edges.filter((edge) => edge.type === 'scope' && edge.from === blockId).length,
        phaseCount: phases.length,
        subphaseCount: subphases.length,
        doneSubphaseCount: subphases.filter((entry) => entry.status === 'done').length,
        activeSubphaseCount: subphases.filter((entry) => entry.status === 'active').length,
        openDependencyCount: openDependencies.length,
        phases,
        subphases,
        openDependencies,
    };
}

function queryBtStatus(graph, blockId = null) {
    const normalizedBlockId = String(blockId || '').trim();
    if (normalizedBlockId) {
        return {
            query: 'bt-status',
            block: buildBtStatusEntry(graph, normalizedBlockId),
        };
    }

    const nodes = Array.isArray(graph.nodes) ? graph.nodes : [];
    const blocks = nodes
        .filter((node) => node.type === 'block' && hasSource(node, 'bot-training-plan'))
        .map((node) => buildBtStatusEntry(graph, node.id))
        .filter(Boolean)
        .sort((left, right) => left.id.localeCompare(right.id));

    return {
        query: 'bt-status',
        blocks,
    };
}

function printText(result) {
    if (result.query === 'open-deps') {
        process.stdout.write(`open-deps ${result.blockId}\n`);
        if (result.openDependencies.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const dependency of result.openDependencies) {
            const flags = [`source=${dependency.source}`, `hard=${dependency.hard}`, `fulfilled=${dependency.fulfilled}`];
            if (dependency.dependsPhase) flags.push(`dependsPhase=${dependency.dependsPhase}`);
            if (dependency.hint) flags.push(`hint=${dependency.hint}`);
            process.stdout.write(`- ${dependency.dependsOn} (${flags.join(', ')})\n`);
        }
        return;
    }

    if (result.query === 'scope-collisions') {
        process.stdout.write('scope-collisions\n');
        if (result.collisions.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const collision of result.collisions) {
            process.stdout.write(`- ${collision.leftBlock} <-> ${collision.rightBlock}: ${collision.sharedFiles.join(', ')}\n`);
        }
        return;
    }

    if (result.query === 'surfaces-for-file') {
        process.stdout.write(`surfaces-for-file ${result.file}\n`);
        if (result.surfaces.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const surface of result.surfaces) {
            const roles = surface.roles.length > 0 ? surface.roles.join('|') : 'none';
            process.stdout.write(`- ${surface.surface} (roles=${roles})\n`);
        }
        return;
    }

    if (result.query === 'coverage-report') {
        const summary = result.summary || {};
        process.stdout.write('coverage-report\n');
        process.stdout.write(`- raw: ${summary.rawCoveredFileCount}/${summary.trackedFileCount} (${summary.rawCoveragePercent}%)\n`);
        process.stdout.write(`- adjusted: ${summary.adjustedCoveredFileCount}/${summary.adjustedTrackedFileCount} (${summary.adjustedCoveragePercent}%)\n`);
        process.stdout.write(`- uncovered active: ${summary.uncoveredActiveFileCount}\n`);
        process.stdout.write(`- overlay blocks: ${(result.overlayBlocks || []).length}\n`);
        return;
    }

    if (result.query === 'uncovered-files') {
        process.stdout.write(`uncovered-files${result.prefix ? ` ${result.prefix}` : ''}\n`);
        if (result.files.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const entry of result.files) {
            const flags = [
                `classification=${entry.classification}`,
                `excluded=${entry.excludedFromCoverage}`,
            ];
            if (entry.excludeReason) flags.push(`reason=${entry.excludeReason}`);
            process.stdout.write(`- ${entry.path} (${flags.join(', ')})\n`);
        }
        return;
    }

    if (result.query === 'why-file') {
        process.stdout.write(`why-file ${result.file}\n`);
        if (!result.coverage) {
            process.stdout.write('- not tracked in coverage artifact\n');
            return;
        }
        process.stdout.write(`- covered=${result.coverage.covered} core=${result.coverage.coveredInCore} overlay=${result.coverage.coveredByOverlay}\n`);
        process.stdout.write(`- classification=${result.coverage.classification} excluded=${result.coverage.excludedFromCoverage}\n`);
        process.stdout.write(`- scope blocks=${(result.coverage.scopeBlocks || []).join(', ') || 'none'}\n`);
        process.stdout.write(`- surfaces=${(result.coverage.surfaces || []).map((entry) => entry.surface).join(', ') || 'none'}\n`);
        process.stdout.write(`- coverage sources=${(result.coverage.coverageSources || []).join(', ') || 'none'}\n`);
        return;
    }

    if (result.query === 'files-for-block') {
        process.stdout.write(`files-for-block ${result.blockId}\n`);
        if (!result.files || result.files.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const entry of result.files) {
            const flags = [];
            if (entry.changeCount != null) flags.push(`changes=${entry.changeCount}`);
            if (entry.dirty != null) flags.push(`dirty=${entry.dirty}`);
            if (entry.covered != null) flags.push(`covered=${entry.covered}`);
            if (entry.classification) flags.push(`classification=${entry.classification}`);
            if (entry.excludedFromCoverage != null) flags.push(`excluded=${entry.excludedFromCoverage}`);
            process.stdout.write(`- ${entry.path} (${flags.join(', ') || 'no-metadata'})\n`);
        }
        return;
    }

    if (result.query === 'bt-status') {
        if (Object.prototype.hasOwnProperty.call(result, 'block')) {
            if (!result.block) {
                process.stdout.write('bt-status\n- none\n');
                return;
            }
            process.stdout.write(`bt-status ${result.block.id}\n`);
            process.stdout.write(`- status=${result.block.status} currentPhase=${result.block.currentPhase || 'none'} scopeFiles=${result.block.scopeFileCount}\n`);
            process.stdout.write(`- subphases done=${result.block.doneSubphaseCount}/${result.block.subphaseCount} active=${result.block.activeSubphaseCount}\n`);
            process.stdout.write(`- open dependencies=${result.block.openDependencyCount}\n`);
            return;
        }

        process.stdout.write('bt-status\n');
        if (!result.blocks || result.blocks.length === 0) {
            process.stdout.write('- none\n');
            return;
        }
        for (const block of result.blocks) {
            process.stdout.write(`- ${block.id} status=${block.status} currentPhase=${block.currentPhase || 'none'} openDeps=${block.openDependencyCount} scopeFiles=${block.scopeFileCount}\n`);
        }
    }
}

function usage() {
    process.stdout.write(
        'Usage:\n'
        + '  node scripts/query-knowledge-graph.mjs open-deps <BLOCK_ID> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs scope-collisions [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs surfaces-for-file <FILE_PATH> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs coverage-report [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs uncovered-files [PREFIX] [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs why-file <FILE_PATH> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs files-for-block <BLOCK_ID> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs bt-status [BLOCK_ID] [--json]\n'
    );
}

export {
    queryBtStatus,
    queryCoverageReport,
    queryFilesForBlock,
    queryOpenDeps,
    queryScopeCollisions,
    querySurfacesForFile,
    queryUncoveredFiles,
    queryWhyFile,
};

const isDirectRun = process.argv[1]
    && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isDirectRun) {
    const args = process.argv.slice(2);
    const jsonOutput = args.includes('--json');
    const positional = args.filter((arg) => arg !== '--json');
    const command = positional[0];

    if (!command) {
        usage();
        process.exit(1);
    }

    try {
        const { graph, coverage } = await readArtifacts();
        let result = null;

        if (command === 'open-deps') {
            const blockId = positional[1];
            if (!blockId) {
                usage();
                process.exit(1);
            }
            result = queryOpenDeps(graph, blockId);
        } else if (command === 'scope-collisions') {
            result = queryScopeCollisions(graph);
        } else if (command === 'surfaces-for-file') {
            const filePath = positional[1];
            if (!filePath) {
                usage();
                process.exit(1);
            }
            result = querySurfacesForFile(graph, filePath);
        } else if (command === 'coverage-report') {
            result = queryCoverageReport(coverage);
        } else if (command === 'uncovered-files') {
            result = queryUncoveredFiles(coverage, positional[1] || '');
        } else if (command === 'why-file') {
            const filePath = positional[1];
            if (!filePath) {
                usage();
                process.exit(1);
            }
            result = queryWhyFile(graph, coverage, filePath);
        } else if (command === 'files-for-block') {
            const blockId = positional[1];
            if (!blockId) {
                usage();
                process.exit(1);
            }
            result = queryFilesForBlock(graph, coverage, blockId);
        } else if (command === 'bt-status') {
            result = queryBtStatus(graph, positional[1] || null);
        } else {
            usage();
            process.exit(1);
        }

        if (jsonOutput) {
            process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
        } else {
            printText(result);
        }
    } catch (error) {
        const message = error instanceof Error ? error.stack || error.message : String(error);
        process.stderr.write(`[graph:query] failed: ${message}\n`);
        process.exit(1);
    }
}
