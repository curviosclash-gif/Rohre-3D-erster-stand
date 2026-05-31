const { execFile } = require('node:child_process');
const fs = require('node:fs/promises');
const path = require('node:path');
const { promisify } = require('node:util');

const execFileAsync = promisify(execFile);

const EDITABLE_ROOT_FILE = 'AGENTS.md';
const EDITABLE_PREFIXES = Object.freeze([
    '.agents/rules/',
    '.agents/workflows/',
    '.gemini/skills/',
]);
const CONVENTIONAL_SUBJECT_PATTERN = /^(docs|feat|fix|refactor|chore)(\([a-z0-9-]+\))?: .{3,72}$/;

function normalizeRelativePath(value) {
    return String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/\/{2,}/g, '/');
}

function isEditableMarkdownPath(value) {
    const relativePath = normalizeRelativePath(value);
    if (relativePath === EDITABLE_ROOT_FILE) {
        return true;
    }
    if (!relativePath.toLowerCase().endsWith('.md')) {
        return false;
    }
    if (relativePath.includes('../') || path.isAbsolute(relativePath)) {
        return false;
    }
    if (relativePath.startsWith('.gemini/skills/')) {
        return relativePath.endsWith('/SKILL.md');
    }
    return EDITABLE_PREFIXES.slice(0, 2).some((prefix) => relativePath.startsWith(prefix));
}

function resolveEditableMarkdownPath(rootDir, value) {
    const relativePath = normalizeRelativePath(value);
    if (!isEditableMarkdownPath(relativePath)) {
        throw new Error(`Markdown-Pfad ist nicht freigegeben: ${relativePath || '<leer>'}`);
    }
    const resolvedRoot = path.resolve(rootDir);
    const absolutePath = path.resolve(resolvedRoot, relativePath);
    if (!absolutePath.startsWith(`${resolvedRoot}${path.sep}`)) {
        throw new Error(`Markdown-Pfad liegt ausserhalb des Repositories: ${relativePath}`);
    }
    return { absolutePath, relativePath };
}

async function listMarkdownFiles(rootDir, relativeDir, predicate = () => true) {
    const absoluteDir = path.join(rootDir, relativeDir);
    let entries;
    try {
        entries = await fs.readdir(absoluteDir, { withFileTypes: true });
    } catch (error) {
        if (error?.code === 'ENOENT') return [];
        throw error;
    }
    const nested = await Promise.all(entries.map(async (entry) => {
        const relativePath = normalizeRelativePath(path.join(relativeDir, entry.name));
        if (entry.isDirectory()) return listMarkdownFiles(rootDir, relativePath, predicate);
        return entry.isFile() && predicate(relativePath) ? [relativePath] : [];
    }));
    return nested.flat();
}

async function listEditableMarkdownFiles(rootDir) {
    const files = [
        EDITABLE_ROOT_FILE,
        ...await listMarkdownFiles(rootDir, '.agents/rules', (file) => file.endsWith('.md')),
        ...await listMarkdownFiles(rootDir, '.agents/workflows', (file) => file.endsWith('.md')),
        ...await listMarkdownFiles(rootDir, '.gemini/skills', (file) => file.endsWith('/SKILL.md')),
    ];
    return [...new Set(files.filter(isEditableMarkdownPath))].sort((left, right) => left.localeCompare(right));
}

function buildLineDiff(originalContent, nextContent) {
    const originalLines = String(originalContent || '').split(/\r?\n/);
    const nextLines = String(nextContent || '').split(/\r?\n/);
    const lines = [];
    const count = Math.max(originalLines.length, nextLines.length);
    for (let index = 0; index < count; index += 1) {
        const before = originalLines[index];
        const after = nextLines[index];
        if (before === after) {
            if (before != null) lines.push(`  ${before}`);
            continue;
        }
        if (before != null) lines.push(`- ${before}`);
        if (after != null) lines.push(`+ ${after}`);
    }
    return lines.join('\n');
}

async function readEditableMarkdown(rootDir, value) {
    const target = resolveEditableMarkdownPath(rootDir, value);
    const content = await fs.readFile(target.absolutePath, 'utf8');
    return { path: target.relativePath, content };
}

async function previewEditableMarkdown(rootDir, { path: value, originalContent, content }) {
    const current = await readEditableMarkdown(rootDir, value);
    if (current.content !== String(originalContent ?? '')) {
        throw new Error('Datei wurde seit dem Oeffnen extern geaendert. Bitte neu laden.');
    }
    const nextContent = String(content ?? '');
    return {
        path: current.path,
        changed: current.content !== nextContent,
        diff: buildLineDiff(current.content, nextContent),
    };
}

async function saveEditableMarkdown(rootDir, payload) {
    const preview = await previewEditableMarkdown(rootDir, payload);
    if (!preview.changed) return preview;
    const target = resolveEditableMarkdownPath(rootDir, payload.path);
    await fs.writeFile(target.absolutePath, String(payload.content ?? ''), 'utf8');
    return preview;
}

async function runGit(rootDir, args, options = {}) {
    const result = await execFileAsync('git', args, {
        cwd: rootDir,
        windowsHide: true,
        maxBuffer: 4 * 1024 * 1024,
        ...options,
    });
    return String(result.stdout || '').trim();
}

async function runNpm(rootDir, args) {
    return execFileAsync('npm', args, {
        cwd: rootDir,
        windowsHide: true,
        timeout: 120_000,
        maxBuffer: 4 * 1024 * 1024,
        shell: process.platform === 'win32',
    });
}

async function listGitChanges(rootDir) {
    const output = await runGit(rootDir, ['status', '--porcelain', '--untracked-files=all']);
    return output.split(/\r?\n/)
        .filter(Boolean)
        .map((line) => normalizeRelativePath(line.slice(3)))
        .sort((left, right) => left.localeCompare(right));
}

async function listEditableGitChanges(rootDir) {
    return (await listGitChanges(rootDir)).filter(isEditableMarkdownPath);
}

async function getGovernanceGitState(rootDir) {
    return {
        branch: await runGit(rootDir, ['branch', '--show-current']),
        files: await listEditableGitChanges(rootDir),
        remote: 'origin/main',
    };
}

async function commitGovernanceMarkdown(rootDir, { subject }) {
    const normalizedSubject = String(subject || '').trim();
    if (!CONVENTIONAL_SUBJECT_PATTERN.test(normalizedSubject)) {
        throw new Error('Commit-Text braucht z. B. `docs(agent-map): update governance markdown`.');
    }
    const files = await listEditableGitChanges(rootDir);
    if (files.length === 0) {
        throw new Error('Keine geaenderten freigegebenen Markdown-Dateien gefunden.');
    }
    const stagedFiles = String(await runGit(rootDir, ['diff', '--cached', '--name-only']))
        .split(/\r?\n/)
        .filter(Boolean);
    if (stagedFiles.length > 0) {
        throw new Error(`Vor dem Editor-Commit sind bereits Dateien staged: ${stagedFiles.join(', ')}`);
    }
    await runNpm(rootDir, ['run', 'git:acl:heal']);
    await runGit(rootDir, ['add', '--', ...files]);
    const knownUncommitted = (await listGitChanges(rootDir))
        .filter((file) => !files.includes(file));
    const body = [
        'Workflow: code',
        'Decision: D3',
        'Evidence: Desktop Map Tools markdown preview and save confirmation -> PASS',
        ...files.map((file) => `Scope: ${file}`),
        ...(knownUncommitted.length > 0
            ? knownUncommitted.map((file) => `Known-uncommitted: ${file}`)
            : ['Known-uncommitted: none']),
        'Gate: User confirmed governance markdown save in Desktop Map Tools',
        'Not-checked: full test suite',
    ].join('\n');
    await runGit(rootDir, ['commit', '-m', normalizedSubject, '-m', body], { timeout: 120_000 });
    return {
        subject: normalizedSubject,
        files,
        commit: await runGit(rootDir, ['rev-parse', '--short', 'HEAD']),
    };
}

async function pushGovernanceMarkdown(rootDir) {
    const branch = await runGit(rootDir, ['branch', '--show-current']);
    if (branch !== 'main') {
        throw new Error(`Push ist nur von main erlaubt, aktuell: ${branch || '<leer>'}`);
    }
    await runNpm(rootDir, ['run', 'snapshot:tag']);
    await runGit(rootDir, ['push', 'origin', 'main'], { timeout: 120_000 });
    return {
        branch,
        remote: 'origin/main',
        commit: await runGit(rootDir, ['rev-parse', '--short', 'HEAD']),
    };
}

module.exports = {
    buildLineDiff,
    commitGovernanceMarkdown,
    getGovernanceGitState,
    isEditableMarkdownPath,
    listEditableMarkdownFiles,
    previewEditableMarkdown,
    pushGovernanceMarkdown,
    readEditableMarkdown,
    resolveEditableMarkdownPath,
    saveEditableMarkdown,
};
