#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

import { assertGraphRagRuntimeOutputPath, normalizeRepoPath } from './graph-rag-index.mjs';
import { runGraphRagQuery } from './graph-rag-query.mjs';

const ROOT = process.cwd();
const CONTRACT_PATH = 'data/contracts/knowledge-graph/graph-rag-chat-response.v1.json';
const CHAT_RESPONSE_CONTRACT = 'knowledge-graph.graph-rag.chat-response.v1';
const DEFAULT_OUTPUT_PATH = 'tmp/graph-rag/chat/graph-rag-chat-response.json';
const ALLOWED_MODES = new Set(['graph-only', 'evidence', 'rag-summary', 'explain', 'plan-next']);
const CONFIDENCE_VALUES = new Set(['high', 'medium', 'low']);

async function readJson(root, relativePath) {
    return JSON.parse(await fs.readFile(path.join(root, normalizeRepoPath(relativePath)), 'utf8'));
}

function quoteCli(value) {
    return `"${String(value || '').replace(/"/g, '\\"')}"`;
}

function requireFields(value, fields, label) {
    for (const field of fields) {
        if (value?.[field] === undefined) throw new Error(`${label} requires ${field}`);
    }
}

function validateChatResponseContract(contract) {
    if (contract?.contract !== CHAT_RESPONSE_CONTRACT) {
        throw new Error(`Unsupported chat response contract: ${contract?.contract || '<empty>'}`);
    }
    if (Number(contract.schema_version) !== 1 || contract.source_of_truth !== false || contract.writes_allowed !== false) {
        throw new Error('Chat response contract must remain read-only and non-canonical');
    }
    return contract;
}

async function loadChatResponseContract(options = {}) {
    return validateChatResponseContract(await readJson(options.root || ROOT, options.contractPath || CONTRACT_PATH));
}

function validateChatResponse(response, contract) {
    validateChatResponseContract(contract);
    if (response?.contract !== CHAT_RESPONSE_CONTRACT) throw new Error('Chat response has unsupported contract');
    for (const section of contract.required_sections) requireFields(response, [section], 'chat response');
    if (!contract.allowed_modes.includes(response.mode)) throw new Error(`Unsupported chat response mode: ${response.mode}`);
    if (!contract.allowed_statuses.includes(response.status)) throw new Error(`Unsupported chat response status: ${response.status}`);
    requireFields(response.context, contract.context_required, 'chat response context');
    requireFields(response.answer, contract.answer_required, 'chat response answer');
    requireFields(response.safety, contract.safety_required, 'chat response safety');
    if (response.safety.redactionApplied !== true || response.safety.writesAllowed !== false || response.safety.sourceTextIsData !== true) {
        throw new Error('Chat response must keep source text as redacted data and disallow writes');
    }
    if (response.cache?.finalAnswerCached !== false) throw new Error('Chat response final answers must not be cached');
    for (const evidence of response.evidence) requireFields(evidence, contract.evidence_required, 'chat response evidence');
    if (response.status === 'answered' && response.evidence.length === 0) {
        throw new Error('Answered chat response requires source-backed evidence');
    }
    return response;
}

function isHistorical(source = {}) {
    return source.historical === true
        || String(source.sourceClass || '').includes('historical')
        || normalizeRepoPath(source.path).startsWith('docs/plaene/alt/');
}

function detectPromptInjectionSignals(claims) {
    const patterns = [
        /ignore (?:all |previous |prior )?instructions/i,
        /system prompt/i,
        /developer message/i,
        /execute (?:this |the following )?(?:command|instruction)/i,
    ];
    return claims.flatMap((claim) => patterns.some((pattern) => pattern.test(claim.claim))
        ? [{ path: claim.path, signal: 'source-text-instruction-pattern' }]
        : []);
}

function inferMode(route) {
    if (route.intents.includes('plan') || route.intents.includes('file') || route.intents.includes('runtime')) return 'graph-only';
    return 'evidence';
}

function queryLabel(query) {
    return [query.query, query.blockId, query.file, query.criticalPath].filter(Boolean).join(' ');
}

function makeSummary(queryResult, status) {
    if (status === 'insufficient_context') {
        const unresolved = queryResult.route.unresolvedReferences.map((entry) => `${entry.type}:${entry.value}`).join(', ');
        return `Nicht genug Graph-Kontext fuer ${unresolved || 'die Frage'}.`;
    }
    const openDeps = queryResult.graph.queries.find((query) => query.query === 'open-deps');
    if (openDeps) {
        return openDeps.openDependencyCount === 0
            ? `${openDeps.blockId} hat keine offenen Graph-Dependencies.`
            : `${openDeps.blockId} hat ${openDeps.openDependencyCount} offene Graph-Dependencies: ${openDeps.openDependencies.join(', ')}.`;
    }
    const collision = queryResult.graph.queries.find((query) => query.query === 'scope-collisions');
    if (collision) return `${collision.relevantCollisionCount} relevante Scope-Kollisionen gefunden.`;
    const impact = queryResult.graph.queries.find((query) => query.query === 'impact-for-file');
    if (impact) return `${impact.file} ist im Core-Graph ${impact.existsInCoreGraph ? 'sichtbar' : 'nicht sichtbar'}; ${impact.relatedNodes.length} verwandte Nodes gefunden.`;
    const flow = queryResult.graph.queries.find((query) => query.query === 'event-flow');
    if (flow) return `${flow.criticalPath || 'Critical Path'} liefert ${flow.nodeCount ?? 0} Graph-Nodes.`;
    return `${queryResult.evidencePackage.claims.length} source-backed Evidence-Claims gefunden.`;
}

function makeReplay(question, context, mode) {
    const parts = ['node scripts/graph-rag-chat.mjs'];
    if (context.blockId) parts.push(`--block ${context.blockId}`);
    if (context.file) parts.push(`--file ${quoteCli(context.file)}`);
    if (context.view) parts.push(`--view ${context.view}`);
    parts.push(`--mode ${mode}`, `--question ${quoteCli(question)}`, '--json');
    const command = parts.join(' ');
    return {
        command,
        inputsHash: `sha256:${crypto.createHash('sha256').update(command).digest('hex')}`,
    };
}

function makeLinks(context) {
    const links = [];
    if (context.blockId) links.push({ label: `Plan Map: ${context.blockId}`, target: `tools/plan-map/index.html?block=${context.blockId}` });
    if (context.file) links.push({ label: `Repo Map: ${context.file}`, target: `tools/repo-map/index.html?file=${encodeURIComponent(context.file)}` });
    return links;
}

function lowestConfidence(claims) {
    if (claims.some((claim) => claim.confidence === 'low')) return 'low';
    if (claims.some((claim) => claim.confidence === 'medium')) return 'medium';
    return claims.length ? 'high' : 'low';
}

async function writeJson(root, relativePath, artifact) {
    const normalized = assertGraphRagRuntimeOutputPath(relativePath);
    if (!normalized.startsWith('tmp/graph-rag/chat/')) throw new Error('Chat response path must stay under tmp/graph-rag/chat/');
    const absolutePath = path.join(root, normalized);
    await fs.mkdir(path.dirname(absolutePath), { recursive: true });
    await fs.writeFile(absolutePath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return normalized;
}

async function buildGraphRagChatResponse(options = {}) {
    const root = options.root || ROOT;
    const question = String(options.question || '').trim();
    if (!question) throw new Error('Question is required');
    const context = {
        blockId: options.blockId || null,
        file: options.file ? normalizeRepoPath(options.file) : null,
        view: options.view || null,
    };
    const routedQuestion = [question, context.blockId, context.file].filter(Boolean).join(' ');
    const queryResult = options.queryResult || await runGraphRagQuery(routedQuestion, { root });
    const contract = options.contract || await loadChatResponseContract({ root, contractPath: options.contractPath });
    const mode = options.mode || inferMode(queryResult.route);
    if (!ALLOWED_MODES.has(mode)) throw new Error(`Unsupported chat mode: ${mode}`);
    const claims = queryResult.evidencePackage.claims || [];
    const unresolved = queryResult.route.unresolvedReferences || [];
    const status = unresolved.length || claims.length === 0 ? 'insufficient_context' : 'answered';
    const evidence = claims.map((claim) => ({
        path: normalizeRepoPath(claim.path),
        lineStart: claim.lineStart,
        lineEnd: claim.lineEnd,
        kind: claim.sourceClass,
        claim: claim.claim,
        confidence: CONFIDENCE_VALUES.has(claim.confidence) ? claim.confidence : 'low',
        uncertainties: claim.uncertainties || [],
        selectionReason: 'graph-rag-evidence-package',
        historical: isHistorical(claim),
    }));
    const queries = queryResult.graph.queries.map(queryLabel);
    const response = {
        contract: CHAT_RESPONSE_CONTRACT,
        schema_version: 1,
        mode,
        status,
        question,
        context,
        answer: {
            summary: makeSummary(queryResult, status),
            confidence: lowestConfidence(evidence),
            uncertainties: Array.from(new Set([
                ...(queryResult.evidencePackage.uncertainties || []),
                ...(unresolved.length ? ['unresolved-query-reference'] : []),
            ])),
        },
        evidence,
        queries,
        replay: makeReplay(question, context, mode),
        trace: [
            ...queryResult.route.intents.map((intent) => `intent:${intent}`),
            ...queries.map((query) => `graph:${query}`),
            ...evidence.map((entry) => `evidence:${entry.path}`),
            'summary:rulebased',
        ],
        links: makeLinks(context),
        safety: {
            redactionApplied: true,
            writesAllowed: false,
            sourceTextIsData: true,
            promptInjectionSignals: detectPromptInjectionSignals(evidence),
            runtime: 'fallback-rulebased',
        },
        followups: [
            { label: 'Zeige Evidence', action: 'ask', question: `Welche Evidence gibt es fuer ${context.blockId || context.file || question}?` },
        ],
        cache: {
            policy: 'evidence-only',
            finalAnswerCached: false,
        },
    };
    validateChatResponse(response, contract);
    if (options.write || options.outPath) response.writtenPath = await writeJson(root, options.outPath || DEFAULT_OUTPUT_PATH, response);
    return response;
}

function parseCliArgs(argv) {
    const options = { json: false, write: false };
    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--json') options.json = true;
        else if (arg === '--write') options.write = true;
        else if (arg === '--question' || arg === '-q') options.question = argv[++index];
        else if (arg === '--block') options.blockId = argv[++index];
        else if (arg === '--file') options.file = argv[++index];
        else if (arg === '--view') options.view = argv[++index];
        else if (arg === '--mode') options.mode = argv[++index];
        else if (arg === '--out') {
            options.outPath = argv[++index];
            options.write = true;
        } else if (arg === '--help' || arg === '-h') options.help = true;
        else throw new Error(`Unknown argument: ${arg}`);
    }
    return options;
}

async function runCli(argv = process.argv.slice(2)) {
    const options = parseCliArgs(argv);
    if (options.help) {
        process.stdout.write('Usage: node scripts/graph-rag-chat.mjs --question "..." [--block V121] [--file path] [--view dependencies] [--mode graph-only] [--write] [--json]\n');
        return;
    }
    const response = await buildGraphRagChatResponse(options);
    process.stdout.write(options.json ? `${JSON.stringify(response, null, 2)}\n` : `${response.status}: ${response.answer.summary}\n`);
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
    runCli().catch((error) => {
        process.stderr.write(`${error.stack || error.message}\n`);
        process.exitCode = 1;
    });
}

export {
    CHAT_RESPONSE_CONTRACT,
    CONTRACT_PATH,
    buildGraphRagChatResponse,
    loadChatResponseContract,
    validateChatResponse,
    validateChatResponseContract,
};
