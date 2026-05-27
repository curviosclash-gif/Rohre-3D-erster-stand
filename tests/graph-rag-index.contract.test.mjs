import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
    buildGraphRagIndex,
    chunkMarkdownText,
    classifyRagSourcePath,
    loadRagSourceContract,
    shouldIndexRagPath,
    validateRagSourceContract,
} from '../scripts/graph-rag-index.mjs';

test('rag sources contract allows canonical markdown and excludes raw graph artifacts', async () => {
    const contract = await loadRagSourceContract();
    validateRagSourceContract(contract);

    assert.equal(contract.chunking.stable_id, 'rag:<path>#L<lineStart>-L<lineEnd>:<sha256-12>');
    assert.ok(contract.safety_rules.some((rule) => rule.id === 'reject-secret-like-content'));
    assert.equal(shouldIndexRagPath('docs/plaene/aktiv/V120.md', contract), true);
    assert.equal(shouldIndexRagPath('docs/Umsetzungsplan.md', contract), true);
    assert.equal(shouldIndexRagPath('docs/generated/knowledge-graph.json', contract), false);
    assert.equal(shouldIndexRagPath('tmp/graph-rag/graph-rag-index.json', contract), false);

    assert.deepEqual(classifyRagSourcePath('docs/generated/knowledge-graph.scorecard.json', contract), {
        allowed: false,
        mode: 'excluded',
        sourceClass: null,
        priority: 0,
        reason: 'matched-safety-path-rule',
    });

    const historicalDefault = classifyRagSourcePath('docs/plaene/alt/V83.md', contract);
    assert.equal(historicalDefault.allowed, false);
    assert.equal(historicalDefault.reason, 'conditional-source-not-requested');

    const historicalExplicit = classifyRagSourcePath('docs/plaene/alt/V83.md', contract, {
        includeConditional: ['historical-plans'],
    });
    assert.equal(historicalExplicit.allowed, true);
    assert.equal(historicalExplicit.sourceClass, 'historical-plans');
});

test('markdown chunker creates stable ids with line ranges, hashes and headings', () => {
    const markdown = [
        '# Title',
        '',
        'Intro text.',
        '## Details',
        'Line one.',
        'Line two.',
    ].join('\n');

    const first = chunkMarkdownText(markdown, {
        path: 'docs/plaene/aktiv/V999.md',
        sourceClass: 'active-plans',
        sourcePriority: 100,
    });
    const second = chunkMarkdownText(markdown, {
        path: 'docs/plaene/aktiv/V999.md',
        sourceClass: 'active-plans',
        sourcePriority: 100,
    });

    assert.deepEqual(first, second);
    assert.equal(first.length, 2);
    assert.match(first[0].id, /^rag:docs\/plaene\/aktiv\/V999\.md#L1-L3:[a-f0-9]{12}$/);
    assert.deepEqual(first[0].headings, ['Title']);
    assert.equal(first[1].lineStart, 4);
    assert.deepEqual(first[1].headings, ['Title', 'Details']);
});

test('graph rag index writes safe markdown chunks with graph references and rejects secret-like chunks', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'graph-rag-index-'));
    try {
        await fs.mkdir(path.join(root, 'docs', 'plaene', 'aktiv'), { recursive: true });
        await fs.mkdir(path.join(root, 'docs', 'generated'), { recursive: true });
        await fs.writeFile(
            path.join(root, 'docs', 'plaene', 'aktiv', 'V999.md'),
            [
                '# V999',
                '',
                'Safe canonical plan text.',
                '## Secret fixture',
                'token = ghp_1234567890abcdef',
            ].join('\n'),
            'utf8'
        );
        await fs.writeFile(
            path.join(root, 'docs', 'generated', 'knowledge-graph.json'),
            JSON.stringify({
                contract: 'knowledge-graph.v1',
                nodes: [
                    { id: 'V999', type: 'block', title: 'Fixture', status: 'active', attributes: {} },
                    { id: 'docs/plaene/aktiv/V999.md', type: 'file', title: null, status: 'unknown', attributes: {} },
                ],
                edges: [
                    { from: 'V999', to: 'docs/plaene/aktiv/V999.md', type: 'scope', attributes: {} },
                ],
            }),
            'utf8'
        );

        const contract = await loadRagSourceContract();
        const artifact = await buildGraphRagIndex({
            root,
            contract,
            sourcePaths: ['docs/plaene/aktiv/V999.md', 'docs/generated/knowledge-graph.json'],
        });

        assert.equal(artifact.contract, 'knowledge-graph.rag-index.v1');
        assert.equal(artifact.stats.filesScanned, 2);
        assert.equal(artifact.stats.filesIndexed, 1);
        assert.equal(artifact.stats.rejectedChunks, 1);
        assert.equal(artifact.stats.chunks, 1);
        assert.equal(artifact.chunks[0].path, 'docs/plaene/aktiv/V999.md');
        assert.equal(artifact.chunks[0].graph.fileNodeId, 'docs/plaene/aktiv/V999.md');
        assert.deepEqual(artifact.chunks[0].graph.blockIds, ['V999']);
        assert.ok(artifact.rejectedFiles.some((entry) => entry.path === 'docs/generated/knowledge-graph.json'));
    } finally {
        await fs.rm(root, { recursive: true, force: true });
    }
});
