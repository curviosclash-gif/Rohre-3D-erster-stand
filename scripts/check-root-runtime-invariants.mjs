import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const REPO_ROOT = process.cwd();

const REQUIRED_ROOT_FILES = Object.freeze([
    'index.html',
    'style.css',
    'server.ps1',
    'start_game.bat',
    'start_editor.bat',
    'start_editor_local.bat',
]);

const REQUIRED_DATA_DIRECTORIES = Object.freeze([
    'data/maps',
    'data/vehicles',
]);

const REQUIRED_EDITOR_MARKER = '/editor/map-editor-3d.html';

function resolveRepoPath(relativePath) {
    return path.resolve(REPO_ROOT, relativePath);
}

function collectMissingPaths(relativePaths) {
    return relativePaths.filter((relativePath) => !existsSync(resolveRepoPath(relativePath)));
}

function assertEditorStartScriptContainsEditorPath(relativeFilePath) {
    const source = readFileSync(resolveRepoPath(relativeFilePath), 'utf8');
    if (!source.includes(REQUIRED_EDITOR_MARKER)) {
        throw new Error(`${relativeFilePath} no longer contains ${REQUIRED_EDITOR_MARKER}`);
    }
}

const missingRootFiles = collectMissingPaths(REQUIRED_ROOT_FILES);
if (missingRootFiles.length > 0) {
    console.error('Root runtime invariant guard failed (missing required root files):');
    for (const missingFile of missingRootFiles) {
        console.error(`- ${missingFile}`);
    }
    process.exit(1);
}

const missingDataDirectories = collectMissingPaths(REQUIRED_DATA_DIRECTORIES);
if (missingDataDirectories.length > 0) {
    console.error('Root runtime invariant guard failed (missing required runtime data directories):');
    for (const missingDirectory of missingDataDirectories) {
        console.error(`- ${missingDirectory}`);
    }
    process.exit(1);
}

assertEditorStartScriptContainsEditorPath('start_editor.bat');
assertEditorStartScriptContainsEditorPath('start_editor_local.bat');

console.log('Root runtime invariant guard passed.');
console.log(`Required root files: ${REQUIRED_ROOT_FILES.length}`);
console.log(`Required data directories: ${REQUIRED_DATA_DIRECTORIES.length}`);
