#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = process.cwd();
const MAPPING_PATH = '.agents/test_mapping.md';
const PACKAGE_PATH = 'package.json';

function normalizePath(value) {
  return String(value || '').replace(/\\/g, '/').trim();
}

function listTrackedFiles(rootDir) {
  const result = spawnSync('git', ['ls-files', '-z'], {
    cwd: rootDir,
    encoding: 'utf8',
  });
  if (result.status !== 0) return [];
  return result.stdout.split('\0').map(normalizePath).filter(Boolean).sort();
}

function globToRegex(pattern) {
  const escaped = normalizePath(pattern).replace(/[.+^${}()|[\]\\]/g, '\\$&');
  const doubleStarToken = '__DOUBLE_STAR__';
  const regexBody = escaped
    .replace(/\*\*/g, doubleStarToken)
    .replace(/\*/g, '[^/]*')
    .replaceAll(doubleStarToken, '.*');
  return new RegExp(`^${regexBody}$`);
}

function pathPatternExists(pattern, trackedFiles) {
  const normalized = normalizePath(pattern);
  if (normalized.includes('*')) {
    const regex = globToRegex(normalized);
    return trackedFiles.some((file) => regex.test(file));
  }
  return trackedFiles.includes(normalized);
}

function extractScriptReferences(markdown) {
  return Array.from(
    new Set(Array.from(String(markdown || '').matchAll(/\bnpm run ([A-Za-z0-9:._-]+)/g), (match) => match[1]))
  ).sort();
}

function extractPathMappings(markdown) {
  const section = String(markdown || '').split('## Path -> Command')[1]?.split(/\r?\n##\s+/)[0] || '';
  return Array.from(section.matchAll(/^\s*-\s+`([^`]+)`\s+->/gm), (match) => normalizePath(match[1]));
}

export function checkTestMappingDrift({
  mappingMarkdown,
  packageDocument,
  trackedFiles,
} = {}) {
  const warnings = [];
  const scripts = packageDocument?.scripts || {};
  const scriptReferences = extractScriptReferences(mappingMarkdown);
  const pathMappings = extractPathMappings(mappingMarkdown);

  for (const scriptName of scriptReferences) {
    if (!scripts[scriptName]) {
      warnings.push({
        code: 'missing-npm-script',
        severity: 'warn',
        value: scriptName,
        message: `.agents/test_mapping.md references missing npm script ${scriptName}.`,
      });
    }
  }

  for (const pathPattern of pathMappings) {
    if (!pathPatternExists(pathPattern, trackedFiles)) {
      warnings.push({
        code: 'missing-mapped-path',
        severity: 'warn',
        value: pathPattern,
        message: `.agents/test_mapping.md references missing path or glob ${pathPattern}.`,
      });
    }
  }

  const contractTests = trackedFiles.filter((file) => /^tests\/.+\.contract\.test\.mjs$/.test(file));
  const hasContractCatchAll = pathMappings.includes('tests/*.contract.test.mjs');
  if (contractTests.length > 0 && !hasContractCatchAll) {
    warnings.push({
      code: 'contract-tests-unmapped',
      severity: 'warn',
      value: `${contractTests.length}`,
      message: 'Contract tests exist but tests/*.contract.test.mjs is not mapped.',
    });
  }

  for (const runner of ['test:contract', 'test:desktop:smoke', 'test:desktop:e2e', 'test:browser:compat']) {
    if (!scripts[runner]) {
      warnings.push({
        code: 'missing-canonical-runner',
        severity: 'warn',
        value: runner,
        message: `Canonical runner ${runner} is missing from package.json.`,
      });
    } else if (!scriptReferences.includes(runner)) {
      warnings.push({
        code: 'canonical-runner-unmapped',
        severity: 'warn',
        value: runner,
        message: `Canonical runner ${runner} is not visible in .agents/test_mapping.md.`,
      });
    }
  }

  return warnings;
}

export async function checkRepoTestMappingDrift({ rootDir = ROOT } = {}) {
  const [mappingMarkdown, packageText] = await Promise.all([
    fs.readFile(path.resolve(rootDir, MAPPING_PATH), 'utf8'),
    fs.readFile(path.resolve(rootDir, PACKAGE_PATH), 'utf8'),
  ]);
  return checkTestMappingDrift({
    mappingMarkdown,
    packageDocument: JSON.parse(packageText),
    trackedFiles: listTrackedFiles(rootDir),
  });
}

async function main() {
  const warnings = await checkRepoTestMappingDrift();
  for (const warning of warnings) {
    console.warn(`[test-mapping:check] WARN ${warning.code} ${warning.value}: ${warning.message}`);
  }
  console.log(`[test-mapping:check] PASS pilot=warn-only warnings=${warnings.length}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  main().catch((error) => {
    console.error(`[test-mapping:check] FAIL ${error.message}`);
    process.exitCode = 1;
  });
}
