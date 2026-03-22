#!/usr/bin/env node
import { execSync } from 'node:child_process';

const ALLOW_BRANCH = process.env.ALLOW_NON_MAIN === '1';

function getCurrentBranch() {
    return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
}

try {
    const branch = getCurrentBranch();
    if (branch === 'main' || ALLOW_BRANCH) {
        process.exit(0);
    }

    console.error(`Main-Guard blocked operation: current branch is "${branch}" (required: "main").`);
    console.error('Set ALLOW_NON_MAIN=1 only for explicit exceptions.');
    process.exit(1);
} catch (error) {
    console.error('Main-Guard failed while resolving current branch.');
    console.error(String(error));
    process.exit(1);
}
