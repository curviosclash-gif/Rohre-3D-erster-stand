#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';

import { resolveLegacyDevLayoutRelativePath } from '../../scripts/dev-layout-paths.mjs';

export function forwardLegacyScript(scriptFileName, scriptArgs = process.argv.slice(2)) {
    const normalizedScriptFileName = String(scriptFileName || '').trim();
    if (!normalizedScriptFileName) {
        throw new Error('scriptFileName is required');
    }
    const scriptPath = resolveLegacyDevLayoutRelativePath('scripts', normalizedScriptFileName);
    return new Promise((resolve, reject) => {
        const child = spawn(process.execPath, [scriptPath, ...scriptArgs], {
            stdio: 'inherit',
            shell: false,
            env: process.env,
        });
        child.once('error', reject);
        child.once('exit', (code, signal) => {
            if (signal) {
                resolve(1);
                return;
            }
            resolve(Number.isInteger(code) ? code : 1);
        });
    });
}

export async function forwardLegacyScriptAndExit(scriptFileName, scriptArgs = process.argv.slice(2)) {
    try {
        const exitCode = await forwardLegacyScript(scriptFileName, scriptArgs);
        if (exitCode !== 0) {
            process.exitCode = exitCode;
        }
    } catch (error) {
        console.error(error?.stack || String(error));
        process.exitCode = 1;
    }
}
