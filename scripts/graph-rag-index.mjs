#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const ROOT = process.cwd();
const SOURCE_CONTRACT_PATH = 'data/contracts/knowledge-graph/rag-sources.v1.json';
const RAG_INDEX_CONTRACT = 'knowledge-graph.rag-index.v1';
const SOURCE_CONTRACT = 'knowledge-graph.rag-sources.v1';
const SOURCE_SCHEMA_VERSION = 1;
const DEFAULT_MAX_CHARS = 1800;
const MARKDOWN_EXTENSIONS = new Set(['.md', '.markdown', '.txt']);

const BUILT_IN_SECRET_PATTERNS = Object.freeze([
    /(?:api[-_]?key|auth|credential|password|secret|token)\s*[:=]/i,
    /\b(?:sk|ghp|pat|xox[baprs]|AKIA)[A-Za-z0-9_-]{12,}\b/,
    /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----/,
]);

function normalizeRepoPath(value) {
    return String(value || '')
        .trim()
        .replace(/\\/g, '/')
        .replace(/^\.\/+/, '')
        .replace(/\/{2,}/g, '/');
}

function toAbsolute(root, relativePath) {
    return path.join(root, normalizeRepoPath(relativePath));
}

function escapeRegex(value) {
    return String(value).replace(/[|\\{}()[\]^$+?.]/g, '\\$&');
}

function globToRegExp(pattern) {
    const normalized = normalizeRepoPath(pattern);
    let source = '';

    for (let index = 0; index < normalized.length; index += 1) {
        const char = normalized[index];
        const next = normalized[index + 1];

        if (char === '*' && next === '*') {
            const after = normalized[index + 2];
            if (after === '/') {
                source += '(?:.*/)?';
                index += 2;
            } else {
                source += '.*';
                index += 1;
            }
            continue;
        }

        if (char === '*') {
            source += '[^/]*';
            continue;
        }

        if (char === '?') {
            source += '[^/]';
            continue;
        }

        source += escapeRegex(char);
    }

    return new RegExp(`^${source}$`);
}

function matchesAnyPattern(filePath, patterns = []) {
    const normalized = normalizeRepoPath(filePath);
    return patterns.some((pattern) => globToRegExp(pattern).test(normalized));
}

function rootFromPattern(pattern) {
    const normalized = normalizeRepoPath(pattern);
    const wildcardIndex = normalized.search(/[*?\[]/);
    if (wildcardIndex < 0) {
        const extension = path.posix.extname(normalized);
        return extension ? path.posix.dirname(normalized) : normalized;
    }

    const prefix = normalized.slice(0, wildcardIndex);
    const lastSlash = prefix.lastIndexOf('/');
    if (lastSlash < 0) return '.';
    return prefix.slice(0, lastSlash) || '.';
}

function compileContentPatterns(contract) {
    const patternStrings = (contract.safety_rules || [])
        .flatMap((rule) => Array.isArray(rule.content_patterns) ? rule.content_patterns : []);
    const configuredPatterns = patternStrings.map((pattern) => {
        const value = String(pattern || '');
        if (value.startsWith('(?i)')) {
            return new RegExp(value.slice(4), 'i');
        }
        return new RegExp(value);
    });
    return [...BUILT_IN_SECRET_PATTERNS, ...configuredPatterns];
}

function hasSecretLikeContent(text, patterns) {
    return patterns.some((pattern) => pattern.test(text));
}

function sha256Short(text) {
    return crypto.createHash('sha256').update(text, 'utf8').digest('hex').slice(0, 12);
}

function estimateTokens(text) {
    return Math.max(1, Math.ceil(String(text || '').length / 4));
}

function normalizeLineEndings(text) {
    return String(text || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
}

function updateHeadingStack(stack, line) {
    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) return stack;
    const level = match[1].length;
    const title = match[2].trim();
    const nextStack = stack.filter((heading) => heading.level < level);
    nextStack.push({ level, title });
    return nextStack;
}

function makeChunk({ filePath, sourceClass, sourcePriority, headings, startLine, endLine, lines }) {
    const text = lines.join('\n').trim();
    if (!text) return null;
    const hash = sha256Short(text);
    return {
        id: `rag:${filePath}#L${startLine}-L${endLine}:${hash}`,
        path: filePath,
        lineStart: startLine,
        lineEnd: endLine,
        hash,
        charCount: text.length,
        estimatedTokens: estimateTokens(text),
        sourceClass,
        sourcePriority,
        headings: headings.map((heading) => heading.title),
        text,
    };
}

function chunkMarkdownText(text, options = {}) {
    const filePath = normalizeRepoPath(options.path || 'inline.md');
    const maxChars = Number(options.maxChars || DEFAULT_MAX_CHARS);
    const sourceClass = String(options.sourceClass || 'inline');
    const sourcePriority = Number(options.sourcePriority || 0);
    const lines = normalizeLineEndings(text).split('\n');
    const chunks = [];
    let headingStack = [];
    let chunkHeadings = [];
    let currentLines = [];
    let currentStartLine = 1;
    let currentEndLine = 1;
    let currentChars = 0;

    const flush = () => {
        const chunk = makeChunk({
            filePath,
            sourceClass,
            sourcePriority,
            headings: chunkHeadings,
            startLine: currentStartLine,
            endLine: currentEndLine,
            lines: currentLines,
        });
        if (chunk) chunks.push(chunk);
        currentLines = [];
        currentChars = 0;
    };

    for (let index = 0; index < lines.length; index += 1) {
        const line = lines[index];
        const lineNumber = index + 1;
        const isHeading = /^(#{1,6})\s+/.test(line);
        const lineLength = line.length + (currentLines.length > 0 ? 1 : 0);

        if (isHeading && currentLines.length > 0) {
            flush();
        } else if (!isHeading && currentLines.length > 0 && currentChars + lineLength > maxChars) {
            flush();
        }

        if (isHeading) {
            headingStack = updateHeadingStack(headingStack, line);
        }

        if (currentLines.length === 0) {
            currentStartLine = lineNumber;
            chunkHeadings = [...headingStack];
        }

        currentLines.push(line);
        currentEndLine = lineNumber;
        currentChars += lineLength;
    }

    if (currentLines.length > 0) {
        flush();
    }

    return chunks;
}

function validateRagSourceContract(contract) {
    if (!contract || typeof contract !== 'object') {
        throw new Error('rag-sources contract must be an object');
    }
    if (contract.contract !== SOURCE_CONTRACT) {
        throw new Error(`Unsupported rag-sources contract: ${contract.contract || '<empty>'}`);
    }
    if (Number(contract.schema_version) !== SOURCE_SCHEMA_VERSION) {
        throw new Error(`Unsupported rag-sources schema_version: ${contract.schema_version}`);
    }
    if (!Array.isArray(contract.source_classes) || contract.source_classes.length === 0) {
        throw new Error('rag-sources requires source_classes');
    }

    const ids = new Set();
    let hasTextSource = false;
    let hasGeneratedGraphRule = false;
    for (const entry of contract.source_classes) {
        const id = String(entry?.id || '').trim();
        if (!id) throw new Error('rag-sources source_class requires id');
        if (ids.has(id)) throw new Error(`rag-sources duplicate source_class id: ${id}`);
        ids.add(id);
        if (!Array.isArray(entry.include) || entry.include.length === 0) {
            throw new Error(`rag-sources source_class ${id} requires include patterns`);
        }
        if (entry.index_as_text !== false && entry.mode === 'allowed') {
            hasTextSource = true;
        }
        if (entry.mode === 'graph-reference-only' && matchesAnyPattern('docs/generated/knowledge-graph.json', entry.include)) {
            hasGeneratedGraphRule = true;
        }
    }

    if (!hasTextSource) {
        throw new Error('rag-sources requires at least one allowed text source');
    }
    if (!hasGeneratedGraphRule) {
        throw new Error('rag-sources must mark generated knowledge graph JSON as graph-reference-only');
    }
    if (!Array.isArray(contract.safety_rules) || contract.safety_rules.length === 0) {
        throw new Error('rag-sources requires safety_rules');
    }
    return contract;
}

async function loadRagSourceContract(options = {}) {
    const root = options.root || ROOT;
    const contractPath = options.contractPath || SOURCE_CONTRACT_PATH;
    const raw = await fs.readFile(toAbsolute(root, contractPath), 'utf8');
    return validateRagSourceContract(JSON.parse(raw));
}

function getSafetyPathPatterns(contract) {
    return (contract.safety_rules || [])
        .flatMap((rule) => Array.isArray(rule.path_patterns) ? rule.path_patterns : []);
}

function classifyRagSourcePath(filePath, contract, options = {}) {
    const normalized = normalizeRepoPath(filePath);
    const safetyPathPatterns = getSafetyPathPatterns(contract);
    if (matchesAnyPattern(normalized, safetyPathPatterns)) {
        return {
            allowed: false,
            mode: 'excluded',
            sourceClass: null,
            priority: 0,
            reason: 'matched-safety-path-rule',
        };
    }

    const includeConditional = new Set(options.includeConditional || []);
    const sortedClasses = [...contract.source_classes].sort((left, right) => Number(right.priority || 0) - Number(left.priority || 0));
    for (const sourceClass of sortedClasses) {
        if (!matchesAnyPattern(normalized, sourceClass.include)) continue;
        const mode = String(sourceClass.mode || 'allowed');
        if (mode === 'graph-reference-only' || sourceClass.index_as_text === false) {
            return {
                allowed: false,
                mode,
                sourceClass: sourceClass.id,
                priority: Number(sourceClass.priority || 0),
                reason: mode === 'graph-reference-only' ? 'structured-graph-reference-only' : 'structured-reference-only',
            };
        }
        if (mode === 'conditional' && !includeConditional.has(sourceClass.id)) {
            return {
                allowed: false,
                mode,
                sourceClass: sourceClass.id,
                priority: Number(sourceClass.priority || 0),
                reason: 'conditional-source-not-requested',
            };
        }
        if (mode === 'allowed' || mode === 'conditional') {
            return {
                allowed: true,
                mode,
                sourceClass: sourceClass.id,
                priority: Number(sourceClass.priority || 0),
                reason: 'matched-source-class',
            };
        }
    }

    return {
        allowed: false,
        mode: 'not-configured',
        sourceClass: null,
        priority: 0,
        reason: 'no-source-class-match',
    };
}

function shouldIndexRagPath(filePath, contract, options = {}) {
    return classifyRagSourcePath(filePath, contract, options).allowed;
}

function buildGraphReferenceIndex(graph) {
    const fileNodeIds = new Map();
    const blockIdsByFile = new Map();
    const nodes = Array.isArray(graph?.nodes) ? graph.nodes : [];
    const edges = Array.isArray(graph?.edges) ? graph.edges : [];

    for (const node of nodes) {
        if (node?.type !== 'file') continue;
        const candidates = [
            node.id,
            node.attributes?.path,
            node.attributes?.file,
        ].map(normalizeRepoPath).filter(Boolean);
        for (const candidate of candidates) {
            fileNodeIds.set(candidate, node.id);
        }
    }

    for (const edge of edges) {
        if (edge?.type !== 'scope') continue;
        const from = normalizeRepoPath(edge.from);
        const to = normalizeRepoPath(edge.to);
        const filePath = fileNodeIds.has(to) ? to : (fileNodeIds.has(from) ? from : null);
        const blockId = /^V\d+|^BT/i.test(from) && filePath === to ? from : (/^V\d+|^BT/i.test(to) && filePath === from ? to : null);
        if (!filePath || !blockId) continue;
        const existing = blockIdsByFile.get(filePath) || new Set();
        existing.add(blockId);
        blockIdsByFile.set(filePath, existing);
    }

    return { fileNodeIds, blockIdsByFile };
}

function attachGraphReferences(chunk, graphIndex, graphPath) {
    if (!graphIndex) return chunk;
    const normalized = normalizeRepoPath(chunk.path);
    const fileNodeId = graphIndex.fileNodeIds.get(normalized) || null;
    const blockIds = [...(graphIndex.blockIdsByFile.get(normalized) || new Set())].sort((left, right) => left.localeCompare(right));
    return {
        ...chunk,
        graph: {
            graphPath,
            fileNodeId,
            blockIds,
        },
    };
}

async function pathExists(absolutePath) {
    try {
        await fs.access(absolutePath);
        return true;
    } catch {
        return false;
    }
}

function shouldPruneDirectory(relativePath) {
    const normalized = normalizeRepoPath(relativePath);
    return normalized === '.git'
        || normalized === 'node_modules'
        || normalized === 'tmp'
        || normalized === '.codex_tmp'
        || normalized.endsWith('/node_modules')
        || normalized.endsWith('/tmp')
        || normalized.endsWith('/.codex_tmp')
        || normalized.endsWith('/.git');
}

async function walkFiles(root, startRelativePath) {
    const normalizedStart = normalizeRepoPath(startRelativePath || '.');
    const absoluteStart = toAbsolute(root, normalizedStart === '.' ? '' : normalizedStart);
    let entries;
    try {
        const stat = await fs.stat(absoluteStart);
        if (stat.isFile()) return [normalizedStart];
        if (!stat.isDirectory()) return [];
        entries = await fs.readdir(absoluteStart, { withFileTypes: true });
    } catch {
        return [];
    }

    const files = [];
    for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        const childRelative = normalizeRepoPath(path.join(normalizedStart === '.' ? '' : normalizedStart, entry.name));
        if (entry.isDirectory()) {
            if (shouldPruneDirectory(childRelative)) continue;
            files.push(...await walkFiles(root, childRelative));
        } else if (entry.isFile()) {
            files.push(childRelative);
        }
    }
    return files;
}

async function discoverCandidatePaths(root, contract) {
    const roots = new Set();
    for (const sourceClass of contract.source_classes || []) {
        if (sourceClass.index_as_text === false || sourceClass.mode === 'graph-reference-only') continue;
        for (const pattern of sourceClass.include || []) {
            roots.add(rootFromPattern(pattern));
        }
    }

    const allFiles = [];
    for (const rootPath of [...roots].sort((left, right) => left.localeCompare(right))) {
        allFiles.push(...await walkFiles(root, rootPath));
    }

    return [...new Set(allFiles)].sort((left, right) => left.localeCompare(right));
}

async function readJsonIfExists(root, relativePath, warnings) {
    const absolute = toAbsolute(root, relativePath);
    if (!await pathExists(absolute)) {
        warnings.push(`${relativePath} missing`);
        return null;
    }
    try {
        return JSON.parse(await fs.readFile(absolute, 'utf8'));
    } catch (error) {
        warnings.push(`${relativePath} unreadable: ${error.message}`);
        return null;
    }
}

async function buildGraphRagIndex(options = {}) {
    const root = options.root || ROOT;
    const contract = validateRagSourceContract(options.contract || await loadRagSourceContract({ root, contractPath: options.contractPath }));
    const graphPath = normalizeRepoPath(options.graphPath || contract.graph_reference?.path || 'docs/generated/knowledge-graph.json');
    const warnings = [];
    const graph = options.graph === undefined ? await readJsonIfExists(root, graphPath, warnings) : options.graph;
    const graphIndex = graph ? buildGraphReferenceIndex(graph) : null;
    const contentPatterns = compileContentPatterns(contract);
    const maxChars = Number(options.maxChars || contract.chunking?.max_chars || DEFAULT_MAX_CHARS);
    const candidatePaths = (options.sourcePaths || await discoverCandidatePaths(root, contract))
        .map(normalizeRepoPath)
        .sort((left, right) => left.localeCompare(right));
    const chunks = [];
    const sources = [];
    const rejectedFiles = [];
    let rejectedChunks = 0;
    let filesScanned = 0;

    for (const filePath of candidatePaths) {
        filesScanned += 1;
        const classification = classifyRagSourcePath(filePath, contract, {
            includeConditional: options.includeConditional || [],
        });
        const extension = path.posix.extname(filePath).toLowerCase();
        if (!classification.allowed || !MARKDOWN_EXTENSIONS.has(extension)) {
            rejectedFiles.push({
                path: filePath,
                reason: classification.reason || (MARKDOWN_EXTENSIONS.has(extension) ? 'not-allowed' : 'unsupported-extension'),
                sourceClass: classification.sourceClass,
            });
            continue;
        }

        let content;
        try {
            content = await fs.readFile(toAbsolute(root, filePath), 'utf8');
        } catch (error) {
            rejectedFiles.push({ path: filePath, reason: `read-error:${error.message}`, sourceClass: classification.sourceClass });
            continue;
        }

        const fileChunks = chunkMarkdownText(content, {
            path: filePath,
            maxChars,
            sourceClass: classification.sourceClass,
            sourcePriority: classification.priority,
        });
        const safeChunks = [];
        for (const chunk of fileChunks) {
            if (hasSecretLikeContent(chunk.text, contentPatterns)) {
                rejectedChunks += 1;
                continue;
            }
            safeChunks.push(attachGraphReferences(chunk, graphIndex, graphPath));
        }

        if (safeChunks.length === 0) {
            rejectedFiles.push({ path: filePath, reason: 'no-safe-chunks', sourceClass: classification.sourceClass });
            continue;
        }

        chunks.push(...safeChunks);
        sources.push({
            path: filePath,
            sourceClass: classification.sourceClass,
            priority: classification.priority,
            chunkCount: safeChunks.length,
            lineStart: safeChunks[0].lineStart,
            lineEnd: safeChunks[safeChunks.length - 1].lineEnd,
        });
    }

    const charCount = chunks.reduce((sum, chunk) => sum + chunk.charCount, 0);
    const estimatedTokens = chunks.reduce((sum, chunk) => sum + chunk.estimatedTokens, 0);
    return {
        contract: RAG_INDEX_CONTRACT,
        schema_version: 1,
        generated_at: new Date().toISOString(),
        source_contract: options.contractPath || SOURCE_CONTRACT_PATH,
        graph_reference: graphPath,
        stats: {
            filesScanned,
            filesIndexed: sources.length,
            chunks: chunks.length,
            rejectedFiles: rejectedFiles.length,
            rejectedChunks,
            charCount,
            estimatedTokens,
            graphLinkedChunks: chunks.filter((chunk) => chunk.graph?.fileNodeId || chunk.graph?.blockIds?.length).length,
        },
        warnings,
        sources,
        rejectedFiles,
        chunks,
    };
}

function parseCliArgs(argv) {
    const options = {
        json: false,
        stdout: false,
        write: true,
        includeConditional: [],
        sourcePaths: [],
    };

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];
        if (arg === '--json') {
            options.json = true;
        } else if (arg === '--stdout') {
            options.stdout = true;
        } else if (arg === '--no-write' || arg === '--dry-run') {
            options.write = false;
        } else if (arg === '--out') {
            options.outPath = argv[index + 1];
            index += 1;
        } else if (arg === '--contract') {
            options.contractPath = argv[index + 1];
            index += 1;
        } else if (arg === '--graph') {
            options.graphPath = argv[index + 1];
            index += 1;
        } else if (arg === '--include-conditional') {
            options.includeConditional.push(argv[index + 1]);
            index += 1;
        } else if (arg === '--source') {
            options.sourcePaths.push(argv[index + 1]);
            index += 1;
        } else {
            throw new Error(`Unknown argument: ${arg}`);
        }
    }

    if (options.sourcePaths.length === 0) {
        delete options.sourcePaths;
    }
    return options;
}

async function writeIndexArtifact(root, outPath, artifact) {
    const normalizedOut = normalizeRepoPath(outPath);
    const absoluteOut = toAbsolute(root, normalizedOut);
    await fs.mkdir(path.dirname(absoluteOut), { recursive: true });
    await fs.writeFile(absoluteOut, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return normalizedOut;
}

async function runCli(argv = process.argv.slice(2)) {
    const cliOptions = parseCliArgs(argv);
    const root = ROOT;
    const contract = await loadRagSourceContract({ root, contractPath: cliOptions.contractPath });
    const artifact = await buildGraphRagIndex({ root, contract, ...cliOptions });
    const outPath = normalizeRepoPath(cliOptions.outPath || contract.index_output?.default_path || 'tmp/graph-rag/graph-rag-index.json');

    let writtenPath = null;
    if (cliOptions.write) {
        writtenPath = await writeIndexArtifact(root, outPath, artifact);
    }

    if (cliOptions.json || cliOptions.stdout) {
        process.stdout.write(`${JSON.stringify({ ...artifact, writtenPath }, null, 2)}\n`);
        return;
    }

    process.stdout.write([
        `Graph-RAG index: ${artifact.stats.chunks} chunks from ${artifact.stats.filesIndexed} files`,
        `Output: ${writtenPath || 'not written (--no-write)'}`,
        `Rejected: ${artifact.stats.rejectedFiles} files, ${artifact.stats.rejectedChunks} chunks`,
    ].join('\n') + '\n');
}

const isCli = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isCli) {
    runCli().catch((error) => {
        process.stderr.write(`${error.stack || error.message}\n`);
        process.exitCode = 1;
    });
}

export {
    RAG_INDEX_CONTRACT,
    SOURCE_CONTRACT,
    buildGraphRagIndex,
    chunkMarkdownText,
    classifyRagSourcePath,
    globToRegExp,
    loadRagSourceContract,
    normalizeRepoPath,
    shouldIndexRagPath,
    validateRagSourceContract,
};
