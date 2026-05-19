import assert from 'node:assert/strict';
import test from 'node:test';

import {
    buildTrainingCliArgs,
    buildTrainingSpawnCommand,
    parseResumeCheckpoint,
    parseTrainingModes,
    parseTrainingSeeds,
    resolveNpmCommand,
} from '../dev/training/trainingSpawnArgs.js';
import {
    TRAINING_DASHBOARD_API_PLUGIN_NAME,
    createTrainingDashboardApiPlugin,
} from '../dev/vite/plugins/trainingDashboardApiPlugin.js';

test('buildTrainingCliArgs allowlists supported fields', () => {
    assert.deepEqual(buildTrainingCliArgs({
        episodes: 12,
        maxSteps: 250,
        modes: 'classic-3d,hunt-2d',
        seed: '11,23',
        resumeCheckpoint: 'latest',
    }), [
        '--episodes', '12',
        '--max-steps', '250',
        '--modes', 'classic-3d,hunt-2d',
        '--seeds', '11,23',
        '--resume-checkpoint', 'latest',
    ]);
});

test('parseTrainingModes rejects unsupported or path-like values', () => {
    assert.deepEqual(parseTrainingModes('classic-3d,classic-2d'), ['classic-3d', 'classic-2d']);
    assert.throws(() => parseTrainingModes('../classic-3d'), /Unsupported training mode/);
    assert.throws(() => parseTrainingModes('classic-3d;rm -rf'), /Unsupported training mode/);
});

test('parseTrainingSeeds accepts numeric comma lists only', () => {
    assert.deepEqual(parseTrainingSeeds('11,23,37'), ['11', '23', '37']);
    assert.throws(() => parseTrainingSeeds('11,abc'), /Seeds must be/);
    assert.throws(() => parseTrainingSeeds('../11'), /Seeds must be/);
});

test('parseResumeCheckpoint allows latest and safe ids only', () => {
    assert.equal(parseResumeCheckpoint('latest'), 'latest');
    assert.equal(parseResumeCheckpoint('checkpoint_20260518-abc'), 'checkpoint_20260518-abc');
    assert.throws(() => parseResumeCheckpoint('../latest'), /resumeCheckpoint/);
    assert.throws(() => parseResumeCheckpoint('latest.json'), /resumeCheckpoint/);
});

test('buildTrainingCliArgs rejects invalid positive integer fields', () => {
    assert.throws(() => buildTrainingCliArgs({ episodes: 0 }), /episodes must be/);
    assert.throws(() => buildTrainingCliArgs({ maxSteps: -1 }), /maxSteps must be/);
    assert.throws(() => buildTrainingCliArgs({ episodes: '12.5' }), /episodes must be/);
});

test('buildTrainingSpawnCommand resolves npm without shell', () => {
    assert.equal(resolveNpmCommand('win32'), 'npm.cmd');
    assert.equal(resolveNpmCommand('linux'), 'npm');

    assert.deepEqual(buildTrainingSpawnCommand({ episodes: 1 }, { platform: 'win32' }), {
        command: 'npm.cmd',
        args: ['run', 'training:e2e', '--', '--episodes', '1'],
        shell: false,
    });
});

test('training dashboard api plugin is exported as a focused vite plugin', () => {
    const plugin = createTrainingDashboardApiPlugin({ rootDir: process.cwd(), env: {} });

    assert.equal(plugin.name, TRAINING_DASHBOARD_API_PLUGIN_NAME);
    assert.equal(typeof plugin.configureServer, 'function');
    assert.equal(typeof plugin.configurePreviewServer, 'function');
});
