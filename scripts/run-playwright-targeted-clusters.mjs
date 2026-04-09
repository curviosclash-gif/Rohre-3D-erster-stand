import { spawn } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const DEV_RUNTIME_CLUSTERS = Object.freeze([
    { id: 'core-shell', specs: ['tests/core-targeted.spec.js'] },
    { id: 'core-platform', specs: ['tests/core-targeted-platform.spec.js'] },
    { id: 'core-surface', specs: ['tests/core-targeted-surface.spec.js'] },
    { id: 'core-runtime', specs: ['tests/core-targeted-runtime.spec.js'] },
    { id: 'core-regressions', specs: ['tests/core-targeted-regressions.spec.js'] },
    { id: 'physics-core', specs: ['tests/physics-core.spec.js'] },
    { id: 'physics-hunt', specs: ['tests/physics-hunt.spec.js'] },
    { id: 'physics-policy', specs: ['tests/physics-policy.spec.js'] },
    { id: 'arcade-blueprint', specs: ['tests/arcade-blueprint.spec.js'] },
    { id: 'bot-targeting', specs: ['tests/bot-targeting.spec.js'] },
]);

const CLUSTER_INDEX = new Map();
for (const cluster of DEV_RUNTIME_CLUSTERS) {
    CLUSTER_INDEX.set(cluster.id, cluster);
    for (const spec of cluster.specs) {
        CLUSTER_INDEX.set(spec, cluster);
        CLUSTER_INDEX.set(path.basename(spec), cluster);
        CLUSTER_INDEX.set(spec.replace(/\\/g, '/'), cluster);
    }
}

function sanitizeSlug(value, fallback) {
    const normalized = String(value || '')
        .trim()
        .replace(/[^a-zA-Z0-9-_./]+/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
    return normalized || fallback;
}

function toPositiveInt(rawValue, fallback, min = 1, max = 65_535) {
    const parsed = Number.parseInt(String(rawValue || ''), 10);
    if (!Number.isFinite(parsed)) return fallback;
    return Math.max(min, Math.min(max, parsed));
}

function splitSelectorsAndPlaywrightArgs(argv) {
    const selectors = [];
    const playwrightArgs = [];
    let seenOption = false;

    for (const rawValue of argv) {
        const value = String(rawValue || '');
        if (value === '--print-clusters' || value === '--dry-run') {
            continue;
        }
        if (!seenOption && !value.startsWith('-')) {
            selectors.push(value);
            continue;
        }
        seenOption = true;
        playwrightArgs.push(value);
    }

    return { selectors, playwrightArgs };
}

function resolveSelectedClusters(selectors) {
    if (selectors.length === 0) {
        return DEV_RUNTIME_CLUSTERS;
    }

    const resolved = [];
    const seen = new Set();
    const unknownSelectors = [];

    for (const selector of selectors) {
        const normalized = selector.replace(/\\/g, '/');
        const cluster = CLUSTER_INDEX.get(selector)
            || CLUSTER_INDEX.get(normalized)
            || CLUSTER_INDEX.get(path.basename(normalized));
        if (!cluster) {
            unknownSelectors.push(selector);
            continue;
        }
        if (seen.has(cluster.id)) {
            continue;
        }
        seen.add(cluster.id);
        resolved.push(cluster);
    }

    if (unknownSelectors.length > 0) {
        console.error('[playwright:dev-runtime] unknown cluster selector(s):', unknownSelectors.join(', '));
        console.error('[playwright:dev-runtime] known clusters:', DEV_RUNTIME_CLUSTERS.map((cluster) => cluster.id).join(', '));
        process.exit(1);
    }

    return resolved;
}

function printClusters() {
    console.log('[playwright:dev-runtime] cluster map');
    for (const cluster of DEV_RUNTIME_CLUSTERS) {
        console.log(`- ${cluster.id}: ${cluster.specs.join(', ')}`);
    }
}

function printDryRun(clusters, playwrightArgs) {
    console.log('[playwright:dev-runtime] dry run');
    for (let index = 0; index < clusters.length; index += 1) {
        const cluster = clusters[index];
        const env = buildClusterEnv(cluster, index);
        console.log(`- ${cluster.id}: ${cluster.specs.join(', ')}`);
        console.log(`  TEST_PORT=${env.TEST_PORT || '(auto)'}`);
        console.log(`  PW_RUN_TAG=${env.PW_RUN_TAG}`);
        console.log(`  PW_OUTPUT_DIR=${env.PW_OUTPUT_DIR}`);
        console.log(`  args=${[...cluster.specs, ...playwrightArgs].join(' ') || '(none)'}`);
    }
}

function buildClusterEnv(cluster, index) {
    const baseRunTag = sanitizeSlug(
        process.env.PW_RUN_TAG || `dev-runtime-clusters-${Date.now().toString(36)}`,
        `dev-runtime-clusters-${process.pid}`
    );
    const clusterRunTag = sanitizeSlug(`${baseRunTag}-${cluster.id}`, cluster.id);
    const baseOutputDir = String(process.env.PW_OUTPUT_DIR || '').trim();
    const baseHtmlReportDir = String(process.env.PW_HTML_REPORT_DIR || '').trim();
    const outputDir = baseOutputDir
        ? path.join(baseOutputDir, cluster.id)
        : path.join('test-results', clusterRunTag);
    const htmlReportDir = baseHtmlReportDir
        ? path.join(baseHtmlReportDir, cluster.id)
        : path.join('playwright-report', clusterRunTag);
    const env = {
        ...process.env,
        PW_RUN_TAG: clusterRunTag,
        PW_OUTPUT_DIR: outputDir,
        PW_HTML_REPORT_DIR: htmlReportDir,
        PW_SERVER_LOG_OUT: '',
        PW_SERVER_LOG_ERR: '',
        PW_SERVER_LOG_PATHS: '',
    };

    if (String(process.env.TEST_PORT || '').trim()) {
        const basePort = toPositiveInt(process.env.TEST_PORT, 5173, 1024, 65_520);
        env.TEST_PORT = String(basePort + index);
    }

    return env;
}

function runCluster(cluster, playwrightArgs, index, total) {
    return new Promise((resolve) => {
        const clusterArgs = [path.resolve('scripts', 'run-playwright-targeted.mjs'), ...cluster.specs, ...playwrightArgs];
        console.log(`[playwright:dev-runtime] (${index + 1}/${total}) ${cluster.id} -> ${cluster.specs.join(', ')}`);

        const child = spawn(process.execPath, clusterArgs, {
            stdio: 'inherit',
            env: buildClusterEnv(cluster, index),
            windowsHide: true,
        });

        child.on('exit', (code, signal) => {
            resolve({
                cluster,
                code: code ?? 1,
                signal: signal || null,
            });
        });
    });
}

async function main() {
    const shouldPrintClusters = process.argv.includes('--print-clusters');
    const shouldDryRun = process.argv.includes('--dry-run');
    const { selectors, playwrightArgs } = splitSelectorsAndPlaywrightArgs(process.argv.slice(2));
    const clusters = resolveSelectedClusters(selectors);

    if (shouldPrintClusters) {
        printClusters();
        if (!shouldDryRun && playwrightArgs.length === 0 && selectors.length === 0) {
            return;
        }
    }

    if (shouldDryRun) {
        printDryRun(clusters, playwrightArgs);
        return;
    }

    const failures = [];
    for (let index = 0; index < clusters.length; index += 1) {
        const result = await runCluster(clusters[index], playwrightArgs, index, clusters.length);
        if (result.signal) {
            process.kill(process.pid, result.signal);
            return;
        }
        if (result.code !== 0) {
            failures.push(result.cluster.id);
        }
    }

    if (failures.length > 0) {
        console.error(`[playwright:dev-runtime] failing clusters: ${failures.join(', ')}`);
        process.exit(1);
    }
}

main().catch((error) => {
    console.error('[playwright:dev-runtime] cluster runner failed');
    console.error(error);
    process.exit(1);
});
