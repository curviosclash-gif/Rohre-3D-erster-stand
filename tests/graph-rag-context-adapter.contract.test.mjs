import test from 'node:test';
import assert from 'node:assert/strict';

import { buildGraphRagIndex } from '../scripts/graph-rag-index.mjs';
import {
    loadContextAdapterProfilesContract,
    runGraphRagContextAdapter,
    validateContextAdapterProfilesContract,
} from '../scripts/graph-rag-context-adapter.mjs';
import { runGraphRagQuery } from '../scripts/graph-rag-query.mjs';

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
    assert.equal(result.safety.graphRagBlocked, false);
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
    assert.deepEqual(first.outputs, second.outputs);
    assert.ok(first.outputs.summary.uncertainties.includes('mock-mode'));
    assert.ok(first.outputs.summary.citations.every((citation) => Number.isInteger(citation.lineStart)));
    assert.ok(first.outputs.facts.every((fact) => fact.uncertainties.includes('mock-mode')));
});
