// ─── Arcade Vehicle Profile Contract: Shared Vehicle Upgrade/Progression API ───
// Layer: Shared (UI and State can both depend on this)
// Purpose: Decouple UI from State vehicle profile mutations

/**
 * Vehicle profile upgrade operations and queries.
 * These are the operations that UI needs to interact with vehicle progression.
 * The actual implementation remains in state/arcade/ArcadeVehicleProfile.js
 */

export const VEHICLE_PROFILE_OPERATIONS = Object.freeze({
    /**
     * Load profiles from storage given a store interface
     * @param {Object} store - Storage interface with loadJsonRecord method
     * @returns {Object} Vehicle profiles map
     */
    loadProfiles: 'loadProfiles',

    /**
     * Save profiles to storage
     * @param {Object} store - Storage interface
     * @param {Object} profiles - Profiles to save
     * @returns {boolean} Success status
     */
    saveProfiles: 'saveProfiles',

    /**
     * Get or create profile for vehicle ID
     * @param {string} vehicleId - Vehicle identifier
     * @param {Object} profiles - Profiles map
     * @returns {Object} Profile object
     */
    getOrCreateProfile: 'getOrCreateProfile',

    /**
     * Apply upgrade to profile
     * @param {Object} profile - Profile to upgrade
     * @param {string} slot - Upgrade slot key
     * @param {string} tier - Tier to apply (T1, T2, T3)
     * @returns {Object} Updated profile
     */
    applyUpgrade: 'applyUpgrade',

    /**
     * Get XP needed for next level
     * @param {number} level - Current level
     * @returns {number} XP needed
     */
    xpToNextLevel: 'xpToNextLevel',
});

export default {
    VEHICLE_PROFILE_OPERATIONS,
};
