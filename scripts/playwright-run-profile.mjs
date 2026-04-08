import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

export const PLAYWRIGHT_DEFAULT_RUN_PROFILE = 'preview-smoke';

export const PLAYWRIGHT_RUN_PROFILES = Object.freeze({
    'preview-smoke': Object.freeze({
        name: 'preview-smoke',
        projectName: 'preview-smoke',
        serverMode: 'preview',
        useGlobalWarmup: false,
        moduleWarmupEnabled: false,
    }),
    'dev-runtime': Object.freeze({
        name: 'dev-runtime',
        projectName: 'dev-runtime',
        serverMode: 'dev',
        useGlobalWarmup: true,
        moduleWarmupEnabled: false,
    }),
    'browser-contract': Object.freeze({
        name: 'browser-contract',
        projectName: 'browser-contract',
        serverMode: 'dev',
        useGlobalWarmup: true,
        moduleWarmupEnabled: false,
    }),
});

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

function hasExplicitBrowserContractSelection(argv) {
    for (let index = 0; index < argv.length; index += 1) {
        const value = String(argv[index] || '');
        if (!value) continue;
        if (!value.startsWith('-')) return true;
        if ((value === '-g' || value === '--grep' || value === '--grep-invert') && String(argv[index + 1] || '').trim()) {
            return true;
        }
        if (value.startsWith('--grep=') || value.startsWith('--grep-invert=')) {
            return value.includes('=')
                && value.slice(value.indexOf('=') + 1).trim().length > 0;
        }
    }
    return false;
}

export function resolvePlaywrightRunProfile(rawValue, fallbackName = PLAYWRIGHT_DEFAULT_RUN_PROFILE) {
    const normalized = String(rawValue || '').trim().toLowerCase();
    if (normalized && PLAYWRIGHT_RUN_PROFILES[normalized]) {
        return PLAYWRIGHT_RUN_PROFILES[normalized];
    }
    return PLAYWRIGHT_RUN_PROFILES[fallbackName] || PLAYWRIGHT_RUN_PROFILES[PLAYWRIGHT_DEFAULT_RUN_PROFILE];
}

export function applyPlaywrightRunProfileEnv(env, rawValue) {
    const profile = resolvePlaywrightRunProfile(rawValue);
    env.PW_RUN_PROFILE = profile.name;
    env.PW_SERVER_MODE = profile.serverMode;
    env.PW_PREWARM = profile.useGlobalWarmup ? '1' : '0';
    env.PW_MODULE_WARMUP = profile.moduleWarmupEnabled ? '1' : '0';
    return profile;
}

export function runPlaywrightProfile(profileName, argv, options = {}) {
    const profile = resolvePlaywrightRunProfile(profileName);
    if (options.requireExplicitSelection && !hasExplicitBrowserContractSelection(argv)) {
        console.error(
            `[playwright:${profile.name}] requires an explicit spec path or --grep selector ` +
            'to avoid accidentally running every browser suite.'
        );
        process.exit(1);
    }

    const command = resolvePlaywrightCommand(argv);
    const env = { ...process.env };
    applyPlaywrightRunProfileEnv(env, profile.name);

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
}
