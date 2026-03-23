import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
    ARCHITECTURE_SCORECARD_BUDGETS,
    ARCHITECTURE_SCORECARD_TARGETS,
    LEGACY_CORE_TO_UI_IMPORTS,
    LEGACY_CONSTRUCTOR_GAME_ALLOWLIST,
    LEGACY_DOM_ACCESS_ALLOWLIST,
    LEGACY_ENTITIES_TO_CORE_IMPORTS,
    LEGACY_STATE_TO_CORE_IMPORTS,
    LEGACY_UI_TO_CORE_IMPORTS,
    createEdgeKey,
} from './ArchitectureConfig.mjs';

const LOCAL_IMPORT_PATTERN = /import\s+(?:[\s\S]*?\s+from\s+)?['"]([^'"]+)['"]/g;
const CONSTRUCTOR_GAME_PATTERN = /constructor\s*\(\s*game(?:\s*=|\s*[),])/g;
const THIS_GAME_EQUALS_GAME_PATTERN = /\bthis\.game\s*=\s*game\b/g;
const CONFIG_WRITE_PATTERN = /\bCONFIG(?:\.[A-Za-z_$][\w$]*|\[[^\]]+\])+\s*=/g;
const DOCUMENT_ACCESS_PATTERN = /\bdocument\.(?:body|hidden|readyState|createElement|getElementById|querySelector(?:All)?|addEventListener|removeEventListener|execCommand)\b/g;

function normalizePath(filePath) {
    return filePath.replace(/\\/g, '/');
}

function getSourceFiles(rootDir) {
    const sourceRoot = path.join(rootDir, 'src');
    const files = [];
    const walk = (currentDir) => {
        const entries = readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name === 'dist' || entry.name === 'node_modules') continue;
            const absolutePath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                walk(absolutePath);
                continue;
            }
            if (entry.isFile() && entry.name.endsWith('.js')) {
                files.push(absolutePath);
            }
        }
    };
    walk(sourceRoot);
    return files;
}

function countLineNumber(text, index) {
    let line = 1;
    for (let i = 0; i < index; i += 1) {
        if (text.charCodeAt(i) === 10) line += 1;
    }
    return line;
}

function readLineAt(text, lineNumber) {
    const lines = text.split(/\r?\n/);
    return String(lines[Math.max(0, lineNumber - 1)] || '').trim();
}

function resolveImportTarget(rootDir, fromFile, specifier) {
    if (!specifier.startsWith('.')) return specifier;
    const resolvedBase = path.resolve(path.dirname(fromFile), specifier);
    const candidatePaths = [
        resolvedBase,
        `${resolvedBase}.js`,
        path.join(resolvedBase, 'index.js'),
    ];
    const resolvedPath = candidatePaths.find((candidate) => existsSync(candidate)) || resolvedBase;
    return normalizePath(path.relative(rootDir, resolvedPath));
}

function resolveLayer(relativePath) {
    if (!relativePath.startsWith('src/')) return 'external';
    const [, layer = 'other'] = relativePath.split('/');
    return layer;
}

function collectImportEdges(rootDir, filesByRelativePath) {
    const edges = [];
    for (const [relativePath, text] of filesByRelativePath.entries()) {
        const absolutePath = path.join(rootDir, relativePath);
        for (const match of text.matchAll(LOCAL_IMPORT_PATTERN)) {
            const specifier = String(match[1] || '');
            if (!specifier.startsWith('.')) continue;
            const target = resolveImportTarget(rootDir, absolutePath, specifier);
            const line = countLineNumber(text, match.index || 0);
            edges.push({
                from: relativePath,
                to: target,
                specifier,
                line,
                fromLayer: resolveLayer(relativePath),
                toLayer: resolveLayer(target),
            });
        }
    }
    return edges;
}

function collectPatternMatches({ filesByRelativePath, pattern, matcherName, allowFileMap = null, uiOnly = false }) {
    const matches = [];
    for (const [relativePath, text] of filesByRelativePath.entries()) {
        if (uiOnly && relativePath.startsWith('src/ui/')) continue;
        for (const match of text.matchAll(pattern)) {
            const line = countLineNumber(text, match.index || 0);
            const allowedReason = allowFileMap?.get(relativePath) || null;
            matches.push({
                file: relativePath,
                line,
                match: match[0],
                kind: matcherName,
                allowed: !!allowedReason,
                reason: allowedReason,
                snippet: readLineAt(text, line),
            });
        }
    }
    return matches;
}

function collectConstructorGameMatches(filesByRelativePath) {
    const constructorMatches = collectPatternMatches({
        filesByRelativePath,
        pattern: CONSTRUCTOR_GAME_PATTERN,
        matcherName: 'constructor(game)',
        allowFileMap: LEGACY_CONSTRUCTOR_GAME_ALLOWLIST,
    });
    const assignmentMatches = collectPatternMatches({
        filesByRelativePath,
        pattern: THIS_GAME_EQUALS_GAME_PATTERN,
        matcherName: 'this.game = game',
        allowFileMap: LEGACY_CONSTRUCTOR_GAME_ALLOWLIST,
    });
    return [...constructorMatches, ...assignmentMatches].sort((left, right) => {
        if (left.file === right.file) return left.line - right.line;
        return left.file.localeCompare(right.file, 'en');
    });
}

function collectConfigWrites(filesByRelativePath) {
    return collectPatternMatches({
        filesByRelativePath,
        pattern: CONFIG_WRITE_PATTERN,
        matcherName: 'CONFIG write',
    });
}

function collectDomAccesses(filesByRelativePath) {
    return collectPatternMatches({
        filesByRelativePath,
        pattern: DOCUMENT_ACCESS_PATTERN,
        matcherName: 'document access',
        allowFileMap: LEGACY_DOM_ACCESS_ALLOWLIST,
        uiOnly: true,
    });
}

function classifyEdgeViolations(edges) {
    const coreToUiImports = [];
    const uiToCoreImports = [];
    const entitiesToCoreImports = [];
    const stateToCoreImports = [];

    for (const edge of edges) {
        if (edge.from.startsWith('src/core/') && edge.to.startsWith('src/ui/')) {
            const reason = LEGACY_CORE_TO_UI_IMPORTS.get(createEdgeKey(edge.from, edge.to)) || null;
            coreToUiImports.push({
                ...edge,
                allowed: !!reason,
                reason,
            });
        }
        if (edge.from.startsWith('src/ui/') && edge.to.startsWith('src/core/')) {
            const reason = LEGACY_UI_TO_CORE_IMPORTS.get(createEdgeKey(edge.from, edge.to)) || null;
            uiToCoreImports.push({
                ...edge,
                allowed: !!reason,
                reason,
            });
        }
        if (edge.from.startsWith('src/entities/') && edge.to.startsWith('src/core/')) {
            const reason = LEGACY_ENTITIES_TO_CORE_IMPORTS.get(createEdgeKey(edge.from, edge.to)) || null;
            entitiesToCoreImports.push({
                ...edge,
                allowed: !!reason,
                reason,
            });
        }
        if (edge.from.startsWith('src/state/') && edge.to.startsWith('src/core/')) {
            const reason = LEGACY_STATE_TO_CORE_IMPORTS.get(createEdgeKey(edge.from, edge.to)) || null;
            stateToCoreImports.push({
                ...edge,
                allowed: !!reason,
                reason,
            });
        }
    }

    return {
        coreToUiImports,
        uiToCoreImports,
        entitiesToCoreImports,
        stateToCoreImports,
    };
}

function collectFileSizes(filesByRelativePath) {
    const fileSizes = [];
    for (const [relativePath, text] of filesByRelativePath.entries()) {
        const lineCount = text.split(/\r?\n/).length;
        fileSizes.push({
            file: relativePath,
            lines: lineCount,
        });
    }
    fileSizes.sort((left, right) => right.lines - left.lines || left.file.localeCompare(right.file, 'en'));
    return fileSizes;
}

function summarizeFiles(entries) {
    return [...new Set(entries.map((entry) => entry.file))].sort((left, right) => left.localeCompare(right, 'en'));
}

function summarizeEdges(entries) {
    return [...new Set(entries.map((entry) => createEdgeKey(entry.from, entry.to)))].sort((left, right) => left.localeCompare(right, 'en'));
}

function buildLayerEdgeSummary(edges) {
    const summary = new Map();
    for (const edge of edges) {
        const key = `${edge.fromLayer} -> ${edge.toLayer}`;
        summary.set(key, (summary.get(key) || 0) + 1);
    }
    return [...summary.entries()]
        .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'en'))
        .map(([pair, count]) => ({ pair, count }));
}

export function collectArchitectureReport(rootDir = process.cwd()) {
    const sourceFiles = getSourceFiles(rootDir);
    const filesByRelativePath = new Map(sourceFiles.map((absolutePath) => {
        const relativePath = normalizePath(path.relative(rootDir, absolutePath));
        return [relativePath, readFileSync(absolutePath, 'utf8')];
    }));

    const importEdges = collectImportEdges(rootDir, filesByRelativePath);
    const {
        coreToUiImports,
        uiToCoreImports,
        entitiesToCoreImports,
        stateToCoreImports,
    } = classifyEdgeViolations(importEdges);
    const constructorGameMatches = collectConstructorGameMatches(filesByRelativePath);
    const configWrites = collectConfigWrites(filesByRelativePath);
    const domAccessesOutsideUi = collectDomAccesses(filesByRelativePath);
    const fileSizes = collectFileSizes(filesByRelativePath);

    const report = {
        generatedAt: new Date().toISOString(),
        sourceFileCount: sourceFiles.length,
        targets: ARCHITECTURE_SCORECARD_TARGETS,
        budgets: ARCHITECTURE_SCORECARD_BUDGETS,
        findings: {
            configWrites,
            constructorGameMatches,
            domAccessesOutsideUi,
            coreToUiImports,
            uiToCoreImports,
            entitiesToCoreImports,
            stateToCoreImports,
        },
        importGraph: {
            localEdgeCount: importEdges.length,
            layerEdges: buildLayerEdgeSummary(importEdges),
        },
        fileSizes: {
            largestFiles: fileSizes.slice(0, 12),
            over500Lines: fileSizes.filter((entry) => entry.lines > 500),
        },
    };

    report.scorecard = {
        configWrites: {
            total: configWrites.length,
        },
        constructorGame: {
            totalOccurrences: constructorGameMatches.length,
            totalFiles: summarizeFiles(constructorGameMatches).length,
            disallowedOccurrences: constructorGameMatches.filter((entry) => !entry.allowed).length,
            disallowedFiles: summarizeFiles(constructorGameMatches.filter((entry) => !entry.allowed)).length,
            legacyFiles: summarizeFiles(constructorGameMatches.filter((entry) => entry.allowed)),
        },
        domAccessOutsideUi: {
            totalOccurrences: domAccessesOutsideUi.length,
            totalFiles: summarizeFiles(domAccessesOutsideUi).length,
            disallowedOccurrences: domAccessesOutsideUi.filter((entry) => !entry.allowed).length,
            disallowedFiles: summarizeFiles(domAccessesOutsideUi.filter((entry) => !entry.allowed)).length,
            legacyFiles: summarizeFiles(domAccessesOutsideUi.filter((entry) => entry.allowed)),
        },
        coreToUiImports: {
            totalEdges: coreToUiImports.length,
            disallowedEdges: coreToUiImports.filter((entry) => !entry.allowed).length,
            legacyEdges: summarizeEdges(coreToUiImports.filter((entry) => entry.allowed)),
        },
        uiToCoreImports: {
            totalEdges: uiToCoreImports.length,
            disallowedEdges: uiToCoreImports.filter((entry) => !entry.allowed).length,
            legacyEdges: summarizeEdges(uiToCoreImports.filter((entry) => entry.allowed)),
        },
        entitiesToCoreImports: {
            totalEdges: entitiesToCoreImports.length,
            disallowedEdges: entitiesToCoreImports.filter((entry) => !entry.allowed).length,
            legacyEdges: summarizeEdges(entitiesToCoreImports.filter((entry) => entry.allowed)),
        },
        stateToCoreImports: {
            totalEdges: stateToCoreImports.length,
            disallowedEdges: stateToCoreImports.filter((entry) => !entry.allowed).length,
            legacyEdges: summarizeEdges(stateToCoreImports.filter((entry) => entry.allowed)),
        },
    };

    return report;
}

function formatList(entries, formatter) {
    if (!entries || entries.length === 0) return '  - none';
    return entries.map((entry) => `  - ${formatter(entry)}`).join('\n');
}

export function formatArchitectureReport(report) {
    const lines = [];
    lines.push('Architecture Scorecard');
    lines.push(`Generated: ${report.generatedAt}`);
    lines.push(`Source files: ${report.sourceFileCount}`);
    lines.push('');
    lines.push(`CONFIG writes: ${report.scorecard.configWrites.total} (target ${report.targets.configWrites})`);
    lines.push(`constructor(game)/this.game = game: ${report.scorecard.constructorGame.totalOccurrences} across ${report.scorecard.constructorGame.totalFiles} files (${report.scorecard.constructorGame.disallowedFiles} disallowed files)`);
    lines.push(`DOM outside src/ui: ${report.scorecard.domAccessOutsideUi.totalOccurrences} across ${report.scorecard.domAccessOutsideUi.totalFiles} files (${report.scorecard.domAccessOutsideUi.disallowedFiles} disallowed files)`);
    lines.push(`core -> ui imports: ${report.scorecard.coreToUiImports.totalEdges} edges (${report.scorecard.coreToUiImports.disallowedEdges} disallowed)`);
    lines.push(`ui -> core imports: ${report.scorecard.uiToCoreImports.totalEdges} edges (${report.scorecard.uiToCoreImports.disallowedEdges} disallowed)`);
    lines.push(`entities -> core imports: ${report.scorecard.entitiesToCoreImports.totalEdges} edges (${report.scorecard.entitiesToCoreImports.disallowedEdges} disallowed)`);
    lines.push(`state -> core imports: ${report.scorecard.stateToCoreImports.totalEdges} edges (${report.scorecard.stateToCoreImports.disallowedEdges} disallowed)`);
    lines.push('');
    lines.push('Largest src files:');
    lines.push(formatList(report.fileSizes.largestFiles.slice(0, 8), (entry) => `${entry.file} (${entry.lines} lines)`));
    lines.push('');
    lines.push('Top local layer edges:');
    lines.push(formatList(report.importGraph.layerEdges.slice(0, 8), (entry) => `${entry.pair}: ${entry.count}`));
    return lines.join('\n');
}
