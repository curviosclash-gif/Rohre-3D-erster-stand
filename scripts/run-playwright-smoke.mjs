import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

function escapeRegex(value) {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function toCrossPlatformTestFilter(value) {
    const stringValue = String(value || '');
    if (!/^[A-Za-z0-9_.\-\\/]+\.spec\.[cm]?[jt]sx?$/.test(stringValue)) {
        return stringValue;
    }
    const normalizedSegments = stringValue
        .split(/[\\/]+/)
        .filter(Boolean)
        .map((segment) => escapeRegex(segment));
    if (normalizedSegments.length === 0) {
        return stringValue;
    }
    return `${normalizedSegments.join('[\\\\/]')}$`;
}

function resolvePlaywrightCommand(argv) {
    const testArgs = ['test', ...argv];
    for (let index = 1; index < testArgs.length; index += 1) {
        const value = String(testArgs[index] || '');
        if (value.startsWith('-')) break;
        testArgs[index] = toCrossPlatformTestFilter(value);
    }
    return {
        command: process.execPath,
        args: [path.resolve('node_modules', '@playwright', 'test', 'cli.js'), ...testArgs],
        shell: false,
    };
}

const command = resolvePlaywrightCommand(process.argv.slice(2));
const env = {
    ...process.env,
    PW_PREWARM: process.env.PW_PREWARM || '0',
};

const child = spawn(command.command, command.args, {
    stdio: 'inherit',
    env,
    shell: command.shell === true,
    windowsHide: true,
});

child.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exit(code ?? 1);
});
