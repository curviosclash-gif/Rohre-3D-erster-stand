import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPTS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPTS_DIR, '..');

export const DEV_LAYOUT_CATEGORY_ROOTS = Object.freeze({
    scripts: Object.freeze({
        legacy: 'scripts',
        dev: 'dev/scripts',
    }),
    tests: Object.freeze({
        legacy: 'tests',
        dev: 'dev/tests',
    }),
    trainer: Object.freeze({
        legacy: 'trainer',
        dev: 'dev/trainer',
    }),
    prototypes: Object.freeze({
        legacy: 'prototypes',
        dev: 'dev/prototypes',
    }),
    helpers: Object.freeze({
        legacy: '.',
        dev: 'dev/bin',
    }),
});

function normalizeCategory(category) {
    const key = String(category || '').trim().toLowerCase();
    if (!Object.prototype.hasOwnProperty.call(DEV_LAYOUT_CATEGORY_ROOTS, key)) {
        throw new Error(
            `Unknown dev layout category "${category}". Expected one of: ${Object.keys(DEV_LAYOUT_CATEGORY_ROOTS).join(', ')}`
        );
    }
    return key;
}

function normalizeSegments(segments) {
    return segments
        .filter((segment) => segment != null && String(segment).trim())
        .map((segment) => String(segment).replace(/\\/g, '/').replace(/^\/+/, '').replace(/\/+$/, ''));
}

function toPosixPath(value) {
    return String(value || '').replace(/\\/g, '/');
}

function joinRelativePath(basePath, segments = []) {
    const normalizedBase = toPosixPath(basePath || '.');
    const normalizedSegments = normalizeSegments(segments);
    if (normalizedBase === '.' && normalizedSegments.length === 0) return '.';
    if (normalizedSegments.length === 0) return normalizedBase;
    return toPosixPath(path.posix.join(normalizedBase, ...normalizedSegments));
}

export function resolveLegacyDevLayoutRelativePath(category, ...segments) {
    const key = normalizeCategory(category);
    return joinRelativePath(DEV_LAYOUT_CATEGORY_ROOTS[key].legacy, segments);
}

export function resolveLegacyDevLayoutAbsolutePath(category, ...segments) {
    return path.resolve(REPO_ROOT, resolveLegacyDevLayoutRelativePath(category, ...segments));
}

export function resolveDevLayoutRelativePath(category, ...segments) {
    const key = normalizeCategory(category);
    const devRelativePath = joinRelativePath(DEV_LAYOUT_CATEGORY_ROOTS[key].dev, segments);
    if (existsSync(path.resolve(REPO_ROOT, devRelativePath))) {
        return devRelativePath;
    }
    return resolveLegacyDevLayoutRelativePath(key, ...segments);
}

export function resolveDevLayoutAbsolutePath(category, ...segments) {
    return path.resolve(REPO_ROOT, resolveDevLayoutRelativePath(category, ...segments));
}

export function getRepoRootPath() {
    return REPO_ROOT;
}
