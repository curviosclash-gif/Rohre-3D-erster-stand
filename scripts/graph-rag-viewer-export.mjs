#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { assertGraphRagRuntimeOutputPath } from './graph-rag-index.mjs';
import { runLocalLlmSmokeCheck } from './graph-rag-local-llm-check.mjs';
import { runGraphRagQuery } from './graph-rag-query.mjs';
import { queryCriticalPathHealth } from './query-knowledge-graph.mjs';

const ROOT = process.cwd();
const CONTRACT_PATH = 'data/contracts/knowledge-graph/graph-rag-viewer-export.v1.json';
const GRAPH_PATH = 'docs/generated/knowledge-graph.json';
const COVERAGE_PATH = 'docs/generated/knowledge-graph.coverage.json';
const VIEWER_EXPORT_CONTRACT = 'knowledge-graph.graph-rag.viewer-export.v1';
const DEFAULT_OUTPUT_PATH = 'tmp/graph-rag/viewer/graph-rag-viewer-export.json';
const DEFAULT_QUESTION = 'Was blockiert V121?';
const DEFAULT_MAX_EXCERPT_CHARS = 280;

function normalizeRepoPath(value) {
    return String(value || '').trim().replace(/\\/g, '/').replace(/^\.\/+/, '');
}

function toAbsolute(root, relativePath) {
    return path.join(root, normalizeRepoPath(relativePath));
}

async function readJson(root, relativePath) {
    return JSON.parse(await fs.readFile(toAbsolute(root, relativePath), 'utf8'));
}

async function writeJson(root, relativePath, artifact) {
    const normalized = assertGraphRagRuntimeOutputPath(relativePath);
    if (!normalized.startsWith('tmp/graph-rag/viewer/')) {
        throw new Error('Viewer export path must stay under tmp/graph-rag/viewer/');
    }
    const absolutePath = toAbsolute(root, normalized);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return normalized;
}

function isHistorical(source = {}) {
    return source.historical === true
        || String(source.sourceClass || '').includes('historical')
        || normalizeRepoPath(source.path).startsWith('docs/plaene/alt/');
}

function countBy(items, key) {
    return items.reduce((counts, item) => {
        const value = String(item?.[key] || 'unknown');
        counts[value] = (counts[value] || 0) + 1;
        return counts;
    }, {});
}

function makeGraphSummary(graph) {
    return {
        nodeCount: graph.nodes.length,
        edgeCount: graph.edges.length,
        nodeTypeCounts: countBy(graph.nodes, 'type'),
        edgeTypeCounts: countBy(graph.edges, 'type'),
    };
}

function makeCoverageSummary(coverage) {
    return {
        contract: coverage.contract,
        adjustedCoveragePercent: coverage.summary?.adjustedCoveragePercent ?? null,
        uncoveredActiveFileCount: coverage.summary?.uncoveredActiveFileCount ?? null,
        gateStatus: coverage.gate?.status || 'unknown',
    };
}

function redactClaim(claim) {
    return {
        id: claim.id,
        claim: String(claim.claim || '').slice(0, DEFAULT_MAX_EXCERPT_CHARS),
        path: normalizeRepoPath(claim.path),
        lineStart: claim.lineStart,
        lineEnd: claim.lineEnd,
        confidence: claim.confidence,
        uncertainties: claim.uncertainties,
        chunkId: claim.chunkId,
        hash: claim.hash,
        sourceClass: claim.sourceClass,
        historical: isHistorical(claim),
    };
}

function redactChunk(chunk) {
    return {
        id: chunk.id,
        path: normalizeRepoPath(chunk.path),
        lineStart: chunk.lineStart,
        lineEnd: chunk.lineEnd,
        hash: chunk.hash,
        sourceClass: chunk.sourceClass,
        estimatedTokens: chunk.estimatedTokens,
        excerpt: String(chunk.excerpt || '').slice(0, DEFAULT_MAX_EXCERPT_CHARS),
        historical: isHistorical(chunk),
    };
}

function detectPromptInjectionSignals(claims) {
    const patterns = [
        /ignore (?:all |previous |prior )?instructions/i,
        /system prompt/i,
        /developer message/i,
        /execute (?:this |the following )?(?:command|instruction)/i,
    ];
    return claims.flatMap((claim) => patterns.some((pattern) => pattern.test(claim.claim))
        ? [{ claimId: claim.id, path: claim.path, signal: 'source-text-instruction-pattern' }]
        : []);
}

function makeCriticalPathSummary(result) {
    return (result.criticalPaths || []).map((criticalPath) => ({
        criticalPath: criticalPath.criticalPath,
        status: criticalPath.status,
        counts: criticalPath.counts,
        missingLayers: criticalPath.missingLayers,
        missingValidation: criticalPath.missingValidation,
        stability: criticalPath.stability,
    }));
}

function validateViewerExportContract(contract) {
    if (contract?.contract !== VIEWER_EXPORT_CONTRACT) {
        throw new Error(`Unsupported viewer export contract: ${contract?.contract || '<empty>'}`);
    }
    if (Number(contract.schema_version) !== 1) {
        throw new Error(`Unsupported viewer export schema_version: ${contract.schema_version}`);
    }
    if (contract.source_of_truth !== false || contract.safe_to_commit !== false) {
        throw new Error('Viewer export contract must remain non-canonical and unsafe to commit');
    }
    if (contract.redaction?.default_mode !== 'default-redacted' || contract.redaction?.raw_chunk_text_allowed !== false) {
        throw new Error('Viewer export contract must enforce default-redacted output without raw chunk text');
    }
    return contract;
}

async function loadViewerExportContract(options = {}) {
    return validateViewerExportContract(await readJson(options.root || ROOT, options.contractPath || CONTRACT_PATH));
}

function requireFields(value, fields, label) {
    for (const field of fields) {
        if (value?.[field] === undefined) throw new Error(`${label} requires ${field}`);
    }
}

function validateViewerExport(artifact, contract) {
    validateViewerExportContract(contract);
    if (artifact?.contract !== VIEWER_EXPORT_CONTRACT) throw new Error('Viewer export has unsupported contract');
    for (const section of contract.required_sections) requireFields(artifact, [section], 'viewer export');
    requireFields(artifact.graphSummary, contract.graph_summary_required, 'graphSummary');
    requireFields(artifact.safety, contract.safety_required, 'safety');
    requireFields(artifact.adapterStatus, contract.adapter_status_required, 'adapterStatus');
    if (artifact.safety.mode !== 'default-redacted' || artifact.safety.redacted !== true || artifact.safety.rawIncluded !== false) {
        throw new Error('Viewer export must remain default-redacted without raw content');
    }
    for (const claim of artifact.evidence.claims || []) requireFields(claim, contract.evidence_claim_required, 'evidence claim');
    for (const chunk of artifact.chunks || []) {
        requireFields(chunk, contract.chunk_required, 'chunk');
        if ('text' in chunk) throw new Error('Viewer export chunk must not expose raw text');
    }
    return artifact;
}

async function buildGraphRagViewerExport(options = {}) {
    const root = options.root || ROOT;
    const contract = options.contract || await loadViewerExportContract({ root, contractPath: options.contractPath });
    const [graph, coverage, queryResult, adapterResult] = await Promise.all([
        options.graph || readJson(root, options.graphPath || GRAPH_PATH),
        options.coverage || readJson(root, options.coveragePath || COVERAGE_PATH),
        options.queryResult || runGraphRagQuery(options.question || DEFAULT_QUESTION, { root }),
        options.adapterResult || runLocalLlmSmokeCheck({ root, runtimeId: options.runtimeId || 'rulebased' }),
    ]);
    const criticalPathResult = options.criticalPathResult || queryCriticalPathHealth(graph);
    const claims = (queryResult.evidencePackage?.claims || []).map(redactClaim);
    const chunks = (queryResult.selectedChunks || []).map(redactChunk);
    const artifact = {
        contract: VIEWER_EXPORT_CONTRACT,
        schema_version: 1,
        generated_at: new Date().toISOString(),
        graphSummary: makeGraphSummary(graph),
        coverage: makeCoverageSummary(coverage),
        criticalPaths: makeCriticalPathSummary(criticalPathResult),
        evidence: {
            question: queryResult.question,
            mode: queryResult.evidencePackage?.mode,
            graphQueries: queryResult.evidencePackage?.graphQueries || [],
            claims,
            uncertainties: queryResult.evidencePackage?.uncertainties || [],
        },
        chunks,
        safety: {
            mode: 'default-redacted',
            redacted: true,
            rawIncluded: false,
            sourceOfTruth: false,
            safeToCommit: false,
            historicalVisible: claims.some((claim) => claim.historical) || chunks.some((chunk) => chunk.historical),
            promptInjectionSignals: detectPromptInjectionSignals(claims),
        },
        adapterStatus: {
            mode: adapterResult.mode,
            runtime: adapterResult.runtime?.id || 'unknown',
            fallbackUsed: adapterResult.fallbackUsed === true,
            fallbackReason: adapterResult.fallbackReason || null,
            graphRagBlocked: adapterResult.checks?.graphRagBlocked === true,
        },
    };
    validateViewerExport(artifact, contract);
    if (options.write || options.outPath) {
        artifact.writtenPath = await writeJson(root, options.outPath || DEFAULT_OUTPUT_PATH, artifact);
    }
    return artifact;
}

function parseCliArgs(argv) {
    const options = { json: false, write: false };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--json') options.json = true;
        else if (arg === '--write') options.write = true;
        else if (arg === '--out') {
            options.outPath = argv[index + 1];
            options.write = true;
            index += 1;
        } else if (arg === '--question') {
            options.question = argv[index + 1];
            index += 1;
        } else if (arg === '--runtime') {
            options.runtimeId = argv[index + 1];
            index += 1;
        } else if (arg === '--help' || arg === '-h') options.help = true;
        else throw new Error(`Unknown argument: ${arg}`);
    }
    return options;
}

async function runCli(argv = process.argv.slice(2)) {
    const options = parseCliArgs(argv);
    if (options.help) {
        process.stdout.write('Usage: node scripts/graph-rag-viewer-export.mjs [--write] [--out tmp/graph-rag/viewer/export.json] [--question "..."] [--runtime rulebased] [--json]\n');
        return;
    }
    const result = await buildGraphRagViewerExport(options);
    process.stdout.write(options.json
        ? `${JSON.stringify(result, null, 2)}\n`
        : `Graph-RAG viewer export: ${result.writtenPath || 'stdout only'} (${result.safety.mode})\n`);
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
    runCli().catch((error) => {
        process.stderr.write(`${error.stack || error.message}\n`);
        process.exitCode = 1;
    });
}

export {
    CONTRACT_PATH,
    DEFAULT_OUTPUT_PATH,
    VIEWER_EXPORT_CONTRACT,
    buildGraphRagViewerExport,
    loadViewerExportContract,
    validateViewerExport,
    validateViewerExportContract,
};
