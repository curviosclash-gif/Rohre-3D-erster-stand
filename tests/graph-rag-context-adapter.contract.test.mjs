import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';

import { buildGraphRagIndex } from '../scripts/graph-rag-index.mjs';
import {
    loadContextAdapterProfilesContract,
    runGraphRagContextAdapter,
    validateContextAdapterProfilesContract,
} from '../scripts/graph-rag-context-adapter.mjs';
import { runGraphRagQuery } from '../scripts/graph-rag-query.mjs';

const ROOT = process.cwd();

test('context adapter profiles define read-only operations and no-agent fallbacks', async () => {
    const contract = await loadContextAdapterProfilesContract();
    validateContextAdapterProfilesContract(contract);

    assert.equal(contract.contract, 'knowledge-graph.context-adapter-profiles.v1');
    assert.equal(contract.safety.read_only, true);
    assert.equal(contract.safety.source_of_truth, false);
    assert.equal(contract.safety.downloads_or_installs, 'never');

    const profile = contract.profiles.find((entry) => entry.id === contract.default_profile);
    assert.ok(profile);
    assert.equal(profile.read_only, true);
    assert.equal(profile.source_of_truth, false);

    const operationIds = new Set(profile.operations.map((operation) => operation.id));
    assert.ok(operationIds.has('rerank'));
    assert.ok(operationIds.has('summary'));
    assert.ok(operationIds.has('fact-extract'));
    assert.ok(profile.operations.every((operation) => operation.fallbacks.includes('rulebased')));
    assert.ok(profile.operations.every((operation) => operation.fallbacks.includes('mock')));
    assert.ok(contract.result_evidence.required.includes('evidenceMode'));
    assert.ok(contract.result_evidence.mode_values.includes('local-runtime'));
    assert.ok(contract.result_evidence.claim_status_values.includes('fixture-only'));
});

test('context adapter CLI rejects --out outside tmp/graph-rag and writes allowed outputs', async () => {
    const forbidden = spawnSync(process.execPath, [
        'scripts/graph-rag-context-adapter.mjs',
        'Zeige mir den spawn Critical Path mit Tests und Evidence.',
        '--mode',
        'rulebased',
        '--max-chunks',
        '1',
        '--out',
        'docs/forbidden-context.json',
    ], {
        cwd: ROOT,
        encoding: 'utf8',
    });
    assert.notEqual(forbidden.status, 0);
    assert.match(forbidden.stderr, /Graph-RAG runtime output path must stay under tmp\/graph-rag\//);

    const outPath = 'tmp/graph-rag/graph-rag-context-adapter-contract-test.json';
    const index = await buildGraphRagIndex();
    const queryResult = await runGraphRagQuery('Zeige mir den spawn Critical Path mit Tests und Evidence.', {
        index,
        maxChunks: 1,
    });
    try {
        const result = await runGraphRagContextAdapter(queryResult, {
            mode: 'rulebased',
            maxChunks: 1,
            outPath,
        });
        assert.equal(result.writtenPath, outPath);
        const artifact = JSON.parse(await fs.readFile(path.join(ROOT, outPath), 'utf8'));
        assert.equal(artifact.contract, 'knowledge-graph.rag-context-adapter.v1');
    } finally {
        await fs.rm(path.join(ROOT, outPath), { force: true });
    }
});

test('context adapter local mode blocks non-local base URLs before HTTP calls', async () => {
    const index = await buildGraphRagIndex();
    const queryResult = await runGraphRagQuery('Zeige mir den spawn Critical Path mit Tests und Evidence.', {
        index,
        maxChunks: 1,
    });
    const result = await runGraphRagContextAdapter(queryResult, {
        mode: 'local',
        runtimeId: 'ollama',
        baseUrl: 'https://example.com:11434',
        maxChunks: 1,
    });

    assert.equal(result.mode, 'rulebased');
    assert.equal(result.fallbackUsed, true);
    assert.equal(result.fallbackReason, 'blocked-non-local-base-url');
    assert.equal(result.attempts[0].reason, 'blocked-non-local-base-url');
    assert.equal(result.evidenceMode.requestedMode, 'local');
    assert.equal(result.evidenceMode.actualMode, 'rulebased');
    assert.equal(result.evidenceMode.localAiUsed, false);
    assert.equal(result.evidenceMode.sourceOfTruth, false);
    assert.equal(result.quality.claimStatus, 'source-backed');
});

test('context adapter rulebased mode returns source-backed rerank, summary and facts', async () => {
    const index = await buildGraphRagIndex();
    const queryResult = await runGraphRagQuery('Zeige mir den spawn Critical Path mit Tests und Evidence.', {
        index,
        maxChunks: 4,
    });
    const result = await runGraphRagContextAdapter(queryResult, {
        mode: 'rulebased',
        maxChunks: 4,
    });

    assert.equal(result.contract, 'knowledge-graph.rag-context-adapter.v1');
    assert.equal(result.mode, 'rulebased');
    assert.equal(result.fallbackUsed, false);
    assert.equal(result.safety.readOnly, true);
    assert.equal(result.safety.sourceOfTruth, false);
    assert.equal(result.safety.localAiSourceOfTruth, false);
    assert.equal(result.safety.graphRagBlocked, false);
    assert.equal(result.evidenceMode.requestedMode, 'rulebased');
    assert.equal(result.evidenceMode.actualMode, 'rulebased');
    assert.equal(result.evidenceMode.deterministicFallback, true);
    assert.equal(result.evidenceMode.sourceOfTruth, false);
    assert.equal(result.quality.claimStatus, 'source-backed');
    assert.ok(result.quality.sourceBackedFactCount > 0);
    assert.ok(result.input.budget.chunksSelected > 0);
    assert.ok(result.outputs.rerank.length > 0);
    assert.ok(result.outputs.summary.citations.length > 0);
    assert.ok(result.outputs.facts.length > 0);

    const inputChunkIds = new Set(result.input.chunks.map((chunk) => chunk.id));
    for (const entry of result.outputs.rerank) {
        assert.ok(inputChunkIds.has(entry.chunkId));
        assert.match(entry.path, /^(docs|\.agents)\//);
        assert.ok(Number.isInteger(entry.lineStart));
        assert.ok(Number.isInteger(entry.lineEnd));
    }
    for (const fact of result.outputs.facts) {
        assert.ok(inputChunkIds.has(fact.chunkId));
        assert.match(fact.path, /^(docs|\.agents)\//);
        assert.ok(['high', 'medium', 'low'].includes(fact.confidence));
        assert.ok(fact.uncertainties.includes('local-ai-not-source-of-truth'));
    }
});

test('context adapter mock mode is deterministic and does not require local AI', async () => {
    const index = await buildGraphRagIndex();
    const first = await runGraphRagContextAdapter('Welche Scope-Kollisionen betreffen V112 und V96?', {
        index,
        mode: 'mock',
        maxChunks: 3,
    });
    const second = await runGraphRagContextAdapter('Welche Scope-Kollisionen betreffen V112 und V96?', {
        index,
        mode: 'mock',
        maxChunks: 3,
    });

    assert.equal(first.mode, 'mock');
    assert.equal(first.runtime.adapter, 'deterministic-test-fixture');
    assert.equal(first.fallbackUsed, false);
    assert.equal(first.evidenceMode.fixtureOnly, true);
    assert.equal(first.evidenceMode.sourceOfTruth, false);
    assert.equal(first.quality.claimStatus, 'fixture-only');
    assert.deepEqual(first.outputs, second.outputs);
    assert.ok(first.outputs.summary.uncertainties.includes('mock-mode'));
    assert.ok(first.outputs.summary.citations.every((citation) => Number.isInteger(citation.lineStart)));
    assert.ok(first.outputs.facts.every((fact) => fact.uncertainties.includes('mock-mode')));
    assert.ok(first.outputs.facts.every((fact) => fact.uncertainties.includes('fixture-only')));
    assert.ok(first.outputs.facts.every((fact) => fact.confidence === 'low'));
});

test('context adapter marks empty source input as no-source-backed claims', async () => {
    const result = await runGraphRagContextAdapter({
        contract: 'knowledge-graph.rag-query.v1',
        generated_at: '2026-05-29T00:00:00.000Z',
        question: 'Leere Graph-RAG Fixture',
        selectedChunks: [],
    }, {
        mode: 'rulebased',
    });

    assert.equal(result.mode, 'rulebased');
    assert.equal(result.quality.claimStatus, 'no-source-backed-claims');
    assert.equal(result.evidenceMode.sourceBackedFactCount, 0);
    assert.equal(result.evidenceMode.sourceOfTruth, false);
    assert.ok(result.evidenceMode.uncertainties.includes('no-source-backed-chunks'));
    assert.deepEqual(result.outputs.facts, []);
});
