#!/usr/bin/env node
import { MAP_PRESET_CATALOG } from '../src/core/config/maps/MapPresetCatalog.js';
import { buildRouteFromParcours } from '../src/entities/systems/ParcoursProgressUtils.js';

function asVec3(input, fallback = [0, 0, 0]) {
    if (!Array.isArray(input) || input.length < 3) return [...fallback];
    return [
        Number(input[0]) || 0,
        Number(input[1]) || 0,
        Number(input[2]) || 0,
    ];
}

function dot3(a, b) {
    return (a[0] * b[0]) + (a[1] * b[1]) + (a[2] * b[2]);
}

function sub3(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}

function buildEntriesByStage(route) {
    const byStage = Array.from({ length: Math.max(0, route?.totalCheckpoints || 0) }, () => []);
    for (const entry of Array.isArray(route?.checkpoints) ? route.checkpoints : []) {
        if (!Number.isInteger(entry?.routeIndex)) continue;
        if (entry.routeIndex < 0 || entry.routeIndex >= byStage.length) continue;
        byStage[entry.routeIndex].push(entry);
    }
    return byStage;
}

function evaluateRoute(mapKey, mapDef) {
    const findings = {
        mapKey,
        routeId: String(mapDef?.parcours?.routeId || ''),
        errors: [],
        warnings: [],
    };
    const route = buildRouteFromParcours(mapDef?.parcours);
    if (!route) {
        findings.errors.push('route-build-failed');
        return findings;
    }
    if (!(route.totalCheckpoints > 0)) {
        findings.errors.push('route-has-no-checkpoints');
    }
    if (route.rules?.winnerByParcoursComplete === true && !route.finish) {
        findings.errors.push('winner-by-complete-without-finish');
    }

    const byStage = buildEntriesByStage(route);
    for (let stage = 0; stage < byStage.length; stage += 1) {
        if (byStage[stage].length === 0) {
            findings.errors.push(`stage-${stage + 1}-empty`);
        }
    }

    const requiresDirectionalCrossing = route.rules?.bidirectionalCheckpoints === false;
    if (!requiresDirectionalCrossing) {
        return findings;
    }

    const spawn = asVec3([mapDef?.playerSpawn?.x, mapDef?.playerSpawn?.y, mapDef?.playerSpawn?.z], [0, 0, 0]);
    for (let stage = 0; stage < byStage.length; stage += 1) {
        const entries = byStage[stage];
        const prevEntries = stage > 0 ? byStage[stage - 1] : [];
        const fromPositions = prevEntries.length > 0
            ? prevEntries.map((entry) => asVec3(entry.pos))
            : [spawn];
        for (const entry of entries) {
            if (!Array.isArray(entry.forward)) {
                findings.warnings.push(`stage-${stage + 1}:${entry.id || 'unknown'} missing-forward`);
                continue;
            }
            const cpPos = asVec3(entry.pos);
            let bestDot = -Infinity;
            for (const sourcePos of fromPositions) {
                const approach = sub3(cpPos, sourcePos);
                const alignment = dot3(approach, entry.forward);
                if (alignment > bestDot) {
                    bestDot = alignment;
                }
            }
            if (!(bestDot > 0)) {
                findings.warnings.push(
                    `stage-${stage + 1}:${entry.id || 'unknown'} suspicious-forward alignment<=0`
                );
            }
        }
    }

    if (route.finish) {
        const finishForward = route.finish.forward;
        if (!Array.isArray(finishForward)) {
            findings.warnings.push('finish missing-forward');
        }
    }

    return findings;
}

const strict = process.argv.includes('--strict');

const parcoursMaps = Object.entries(MAP_PRESET_CATALOG)
    .filter(([, mapDef]) => mapDef?.parcours?.enabled === true);

const results = parcoursMaps.map(([mapKey, mapDef]) => evaluateRoute(mapKey, mapDef));

let totalErrors = 0;
let totalWarnings = 0;
for (const result of results) {
    totalErrors += result.errors.length;
    totalWarnings += result.warnings.length;
}

for (const result of results) {
    const heading = `[parcours] ${result.mapKey} (${result.routeId || 'no-route-id'})`;
    if (result.errors.length === 0 && result.warnings.length === 0) {
        process.stdout.write(`${heading} OK\n`);
        continue;
    }
    process.stdout.write(`${heading}\n`);
    for (const error of result.errors) {
        process.stdout.write(`  ERROR: ${error}\n`);
    }
    for (const warning of result.warnings) {
        process.stdout.write(`  WARN: ${warning}\n`);
    }
}

process.stdout.write(
    `\n[parcours] summary maps=${results.length} errors=${totalErrors} warnings=${totalWarnings} strict=${strict}\n`
);

if (totalErrors > 0) {
    process.exit(1);
}
if (strict && totalWarnings > 0) {
    process.exit(1);
}

