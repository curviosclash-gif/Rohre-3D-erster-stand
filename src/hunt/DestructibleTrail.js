import { isHuntHealthActive } from './HealthSystem.js';
import { isRocketTierType, resolveRocketTrailBlastRadiusSegments } from './RocketPickupSystem.js';

const DEFAULT_SELF_SKIP_RECENT = 8;

function resolveTrailDamageByProjectileType(type) {
    const normalized = String(type || '').toUpperCase();
    if (normalized === 'ROCKET_STRONG') return 3;
    if (normalized === 'ROCKET_MEDIUM') return 2;
    return 1;
}

function buildImpactPoint(hit, projectile) {
    if (hit?.closestPoint) {
        return {
            x: Number(hit.closestPoint.closestX) || Number(projectile?.position?.x) || 0,
            y: Number(hit.closestPoint.closestY) || Number(projectile?.position?.y) || 0,
            z: Number(hit.closestPoint.closestZ) || Number(projectile?.position?.z) || 0,
        };
    }
    return {
        x: Number(projectile?.position?.x) || 0,
        y: Number(projectile?.position?.y) || 0,
        z: Number(projectile?.position?.z) || 0,
    };
}

function resolveBlastSegmentIndices(entry, blastRadiusSegments) {
    const centerIdx = Number(entry?.segmentIdx);
    if (!Number.isInteger(centerIdx)) return [];

    const radius = Math.max(0, Math.floor(Number(blastRadiusSegments) || 0));
    const maxSegments = Math.max(0, Math.floor(Number(entry?.ownerTrail?.maxSegments) || 0));
    const indices = [];
    for (let offset = -radius; offset <= radius; offset++) {
        if (maxSegments > 0) {
            indices.push((centerIdx + offset + maxSegments) % maxSegments);
            continue;
        }
        indices.push(centerIdx + offset);
    }
    return indices;
}

function collectBlastEntries(trailSpatialIndex, impactEntry, blastRadiusSegments) {
    const entries = [];
    const seen = new Set();
    const indices = resolveBlastSegmentIndices(impactEntry, blastRadiusSegments);

    for (const segmentIdx of indices) {
        const candidate = trailSpatialIndex?.resolveTrailEntry?.(impactEntry.playerIndex, segmentIdx);
        if (!candidate || candidate.destroyed) continue;
        if (impactEntry.ownerTrail && candidate.ownerTrail !== impactEntry.ownerTrail) continue;

        const key = `${candidate.playerIndex}:${candidate.segmentIdx}`;
        if (seen.has(key)) continue;
        seen.add(key);
        entries.push(candidate);
    }

    if (entries.length === 0 && impactEntry && !impactEntry.destroyed) {
        entries.push(impactEntry);
    }
    return entries;
}

function applyRocketTrailBlast(trailSpatialIndex, impactEntry, projectile, hit) {
    const blastRadiusSegments = resolveRocketTrailBlastRadiusSegments(projectile?.type);
    const blastEntries = collectBlastEntries(trailSpatialIndex, impactEntry, blastRadiusSegments);
    let destroyedCount = 0;
    const destroyedSegmentIndices = [];

    for (const entry of blastEntries) {
        if (!trailSpatialIndex?.destroySegment?.(entry)) continue;
        destroyedCount += 1;
        destroyedSegmentIndices.push(Number(entry.segmentIdx));
    }

    return {
        entry: impactEntry,
        closestPoint: hit?.closestPoint || null,
        damage: destroyedCount,
        destroyed: destroyedCount > 0,
        destroyedCount,
        destroyedSegmentIndices,
        blastRadiusSegments,
        remainingHp: 0,
        maxHp: Math.max(1, Number(impactEntry?.maxHp) || 1),
        impactPoint: buildImpactPoint(hit, projectile),
    };
}

export function applyTrailDamageFromProjectile(trailSpatialIndex, projectile, options = {}) {
    if (!trailSpatialIndex || !projectile || !isHuntHealthActive()) {
        return null;
    }

    const ownerIndex = Number.isInteger(projectile.owner?.index) ? projectile.owner.index : -1;
    const skipRecent = Math.max(0, Number(options.skipRecent) || DEFAULT_SELF_SKIP_RECENT);
    const hit = trailSpatialIndex.checkProjectileTrailCollision(projectile.position, projectile.radius, {
        excludePlayerIndex: ownerIndex,
        skipRecent,
    });
    if (!hit?.entry) return null;

    if (isRocketTierType(projectile.type)) {
        return applyRocketTrailBlast(trailSpatialIndex, hit.entry, projectile, hit);
    }

    const damage = Math.max(1, Number(options.damage) || resolveTrailDamageByProjectileType(projectile.type));
    const damageResult = trailSpatialIndex.damageTrailSegment(hit.entry, damage);
    if (!damageResult.hit) {
        return null;
    }

    return {
        entry: hit.entry,
        closestPoint: hit.closestPoint,
        damage,
        destroyed: !!damageResult.destroyed,
        destroyedCount: damageResult.destroyed ? 1 : 0,
        remainingHp: damageResult.remainingHp,
        maxHp: damageResult.maxHp,
        impactPoint: buildImpactPoint(hit, projectile),
    };
}
