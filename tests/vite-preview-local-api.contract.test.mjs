import assert from 'node:assert/strict';
import test from 'node:test';

import {
    LOCAL_MUTATION_APIS_ENV,
    PREVIEW_LOCAL_MUTATION_DISABLED_ERROR,
    createPreviewLocalMutationDisabledResponse,
    isLocalMutationApiEnabled,
    shouldBlockPreviewLocalMutation,
} from '../dev/vite/previewLocalApiGuard.js';

test('preview local mutation APIs are disabled by default', () => {
    assert.equal(isLocalMutationApiEnabled({}), false);
    assert.equal(shouldBlockPreviewLocalMutation({ isPreviewServer: true, env: {} }), true);
});

test('preview local mutation APIs accept explicit opt-in values', () => {
    for (const value of ['1', 'true', 'TRUE', 'yes', 'on']) {
        assert.equal(isLocalMutationApiEnabled({ [LOCAL_MUTATION_APIS_ENV]: value }), true);
        assert.equal(shouldBlockPreviewLocalMutation({
            isPreviewServer: true,
            env: { [LOCAL_MUTATION_APIS_ENV]: value },
        }), false);
    }
});

test('dev server local mutation APIs are not blocked by preview guard', () => {
    assert.equal(shouldBlockPreviewLocalMutation({ isPreviewServer: false, env: {} }), false);
});

test('preview local mutation disabled response is stable', () => {
    assert.deepEqual(createPreviewLocalMutationDisabledResponse({ route: '/api/example' }), {
        statusCode: 403,
        payload: {
            ok: false,
            error: PREVIEW_LOCAL_MUTATION_DISABLED_ERROR,
            route: '/api/example',
        },
    });
});
