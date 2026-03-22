#!/usr/bin/env node
import { execSync } from 'node:child_process';

function run(command) {
    return execSync(command, { encoding: 'utf8' }).trim();
}

function createTagName(sha) {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `snapshot/main-${yyyy}${mm}${dd}-${hh}${min}${ss}-${sha.slice(0, 7)}`;
}

try {
    const branch = run('git rev-parse --abbrev-ref HEAD');
    if (branch !== 'main') {
        console.log(`Snapshot skip: branch is ${branch}, only main is tagged.`);
        process.exit(0);
    }

    const sha = run('git rev-parse HEAD');
    const tagsAtHeadRaw = run('git tag --points-at HEAD');
    const tagsAtHead = tagsAtHeadRaw ? tagsAtHeadRaw.split(/\r?\n/).map((value) => value.trim()).filter(Boolean) : [];
    const existing = tagsAtHead.find((tag) => tag.startsWith('snapshot/main-'));
    if (existing) {
        console.log(`Snapshot exists: ${existing}`);
        process.exit(0);
    }

    const tagName = createTagName(sha);
    run(`git tag -a ${tagName} -m "Auto snapshot before push on main (${sha.slice(0, 7)})"`);
    console.log(`Created snapshot tag: ${tagName}`);
    process.exit(0);
} catch (error) {
    console.error('Snapshot tag creation failed.');
    console.error(String(error));
    process.exit(1);
}
