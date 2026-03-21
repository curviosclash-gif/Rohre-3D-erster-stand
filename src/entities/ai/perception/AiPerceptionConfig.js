export const AI_SENSE_PHASE_WINDOW = 4;

export const AI_SENSOR_NORMALIZATION = Object.freeze({
    signedOffset: 1,
    signedScale: 0.5,
    riskMax: 3,
    pressureMax: 1.6,
    targetDistanceLookAheadMultiplier: 8,
});

export const AI_SENSOR_LOOKAHEAD = Object.freeze({
    minimumDistance: 8,
    defaultBaseDistance: 12,
    speedRatioWeight: 0.75,
    boostMultiplier: 1.2,
});

export const AI_SENSOR_SCAN_POLICY = Object.freeze({
    reducedProbeRiskThreshold: 0.25,
    reducedProbeOpennessRatio: 0.7,
    reducedProbeCount: 5,
    planarPitchEpsilon: 0.001,
    fallbackLocalOpennessRatio: 0.4,
    projectileSenseStride: 2,
    projectileSenseRiskThreshold: 0.42,
    spacingSenseStride: 3,
    spacingSenseRiskThreshold: 0.65,
    spacingDecay: 0.82,
    spacingDeadzone: 0.05,
});

export const AI_SENSOR_PRESSURE_WEIGHTS = Object.freeze({
    enemy: 0.8,
    tightSpace: 0.9,
    bounce: 0.2,
});

export const AI_SENSOR_TRAIL_COLLISION = Object.freeze({
    radiusMultiplier: 1.6,
    skipRecentSegments: 20,
});
