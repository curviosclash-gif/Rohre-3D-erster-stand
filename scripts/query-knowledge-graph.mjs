#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const GRAPH_PATH = 'docs/generated/knowledge-graph.json';

function normalizePath(value) {
    return String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/\/{2,}/g, '/');
}

async function readGraph() {
    const absolutePath = path.join(ROOT, GRAPH_PATH);
    const raw = await fs.readFile(absolutePath, 'utf8');
    return JSON.parse(raw);
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
            .filter((node) => node.type === 'block' && node.status !== 'done')
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
    }
}

function usage() {
    process.stdout.write(
        'Usage:\n'
        + '  node scripts/query-knowledge-graph.mjs open-deps <BLOCK_ID> [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs scope-collisions [--json]\n'
        + '  node scripts/query-knowledge-graph.mjs surfaces-for-file <FILE_PATH> [--json]\n'
    );
}

export {
    queryOpenDeps,
    queryScopeCollisions,
    querySurfacesForFile,
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
        const graph = await readGraph();
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
