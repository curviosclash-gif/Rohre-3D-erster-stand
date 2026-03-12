import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

test('V36 training loop orchestrates multi-run series with reproducible summary output', async () => {
    const seriesStamp = `TEST_LOOP_${Date.now()}`;
    await execFileAsync(process.execPath, [
        'scripts/training-loop.mjs',
        '--series-stamp', seriesStamp,
        '--runs', '2',
        '--with-trainer-server', 'false',
        '--bridge-mode', 'local',
        '--resume-checkpoint', 'latest',
        '--resume-strict', 'false',
        '--episodes', '1',
        '--seeds', '3',
        '--modes', 'classic-3d',
        '--max-steps', '8',
    ]);

    const artifactRaw = await readFile(`data/training/series/${seriesStamp}/loop.json`, 'utf8');
    const artifact = JSON.parse(artifactRaw);
    assert.equal(artifact.ok, true);
    assert.equal(artifact.summary.runsExecuted, 2);
    assert.equal(Array.isArray(artifact.runs), true);
    assert.equal(artifact.runs.length, 2);
});
