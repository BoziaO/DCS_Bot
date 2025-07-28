/**
 * Optimized Profile Service
 * Handles database operations and profile management with caching
 */

const Profile = require("../../models/Profile");
const { REQUIRED_PROFILE_FIELDS } = require("./constants");
const { dbService } = require("../database");
const { cache } = require("../cache");
const { performanceMonitor } = require("../performance");

/**
 * Creates a default profile for a new user
 */
const createDefaultProfile = (userId, guildId) => {
  return {
    userId,
    guildId,
    balance: 0,
    sanity: 100,
    totalHunts: 0,
    successfulHunts: 0,
    huntStreak: 0,
    maxStreak: 0,
    maxSanityHunt: 0,
    minSanity: 100,
    nightmareHunts: 0,
    itemsUsed: 0,
    playtime: 0,
    totalEarnings: 0,
    moneySpent: 0,
    maxEarningsPerHunt: 0,
    avgEarnings: 0,
    avgSanityLoss: 0,
    pillsUsed: 0,
    deaths: 0,
    revivals: 0,
    evidenceFound: 0,
    cursedObjectsUsed: 0,
    perfectHunts: 0,
    photosTaken: 0,
    ghostsExorcised: 0,
    teamHunts: 0,
    ghostEncounters: {},
    favoriteEquipment: [],
    inventory: [],
    firstHunt: null,
    lastHunt: null,
    bestHuntTime: null,
    worstHuntTime: null,
  };
};

/**
 * Gets or creates a user profile with caching
 */
const getOrCreateProfile = async (userId, guildId, useCache = true) => {
  const start = process.hrtime.bigint();

  try {
    if (useCache) {
      const cachedProfile = cache.getProfile(userId, guildId);
      if (cachedProfile) {
        performanceMonitor.trackDatabaseQuery("getProfile", 0, true);
        return cachedProfile;
      }
    }

    let userProfile = await Profile.findOne({ userId, guildId }).lean();

    if (!userProfile) {
      const defaultProfile = createDefaultProfile(userId, guildId);
      userProfile = await Profile.create(defaultProfile);
      userProfile = userProfile.toObject();
    }

    for (const field of REQUIRED_PROFILE_FIELDS) {
      if (userProfile[field] === undefined || userProfile[field] === null) {
        userProfile[field] = 0;
      }
    }

    if (!userProfile.ghostEncounters) userProfile.ghostEncounters = {};
    if (!userProfile.favoriteEquipment) userProfile.favoriteEquipment = [];
    if (!userProfile.inventory) userProfile.inventory = [];

    if (useCache) {
      cache.setProfile(userId, guildId, userProfile);
    }

    const end = process.hrtime.bigint();
    const executionTime = Number(end - start) / 1000000;
    performanceMonitor.trackDatabaseQuery(
      "getOrCreateProfile",
      executionTime,
      true
    );

    return userProfile;
  } catch (error) {
    const end = process.hrtime.bigint();
    const executionTime = Number(end - start) / 1000000;
    performanceMonitor.trackDatabaseQuery(
      "getOrCreateProfile",
      executionTime,
      false,
      error
    );
    throw error;
  }
};

/**
 * Updates profile activity timestamp with optimized saving
 */
const updateProfileActivity = async (profile, userId, guildId) => {
  const start = process.hrtime.bigint();

  try {
    const updateData = { lastActive: new Date() };

    const updatedProfile = await Profile.findOneAndUpdate(
      { userId: userId || profile.userId, guildId: guildId || profile.guildId },
      updateData,
      { new: true, lean: true }
    );

    if (updatedProfile) {
      cache.setProfile(
        updatedProfile.userId,
        updatedProfile.guildId,
        updatedProfile
      );
    }

    const end = process.hrtime.bigint();
    const executionTime = Number(end - start) / 1000000;
    performanceMonitor.trackDatabaseQuery(
      "updateProfileActivity",
      executionTime,
      true
    );

    return updatedProfile;
  } catch (error) {
    const end = process.hrtime.bigint();
    const executionTime = Number(end - start) / 1000000;
    performanceMonitor.trackDatabaseQuery(
      "updateProfileActivity",
      executionTime,
      false,
      error
    );
    throw error;
  }
};

/**
 * Adds a ghost encounter to the profile with optimized update
 */
const addGhostEncounter = async (userId, guildId, ghostType) => {
  const start = process.hrtime.bigint();

  try {
    const updateQuery = {
      $inc: { [`ghostEncounters.${ghostType}`]: 1 },
    };

    const updatedProfile = await Profile.findOneAndUpdate(
      { userId, guildId },
      updateQuery,
      { new: true, upsert: true, lean: true }
    );

    if (updatedProfile) {
      cache.setProfile(userId, guildId, updatedProfile);
      console.log(`Added ghost encounter: ${ghostType} for user ${userId}`);
    }

    const end = process.hrtime.bigint();
    const executionTime = Number(end - start) / 1000000;
    performanceMonitor.trackDatabaseQuery(
      "addGhostEncounter",
      executionTime,
      true
    );

    return updatedProfile;
  } catch (error) {
    const end = process.hrtime.bigint();
    const executionTime = Number(end - start) / 1000000;
    performanceMonitor.trackDatabaseQuery(
      "addGhostEncounter",
      executionTime,
      false,
      error
    );
    console.error("Error adding ghost encounter:", error);
    throw error;
  }
};

/**
 * Initializes ghost data for a profile
 */
const initializeGhostData = (profile) => {
  if (!profile.ghostEncounters) {
    profile.ghostEncounters = {};
  }
  return profile;
};

/**
 * Batch update multiple profiles for better performance
 */
const batchUpdateProfiles = async (updates) => {
  const start = process.hrtime.bigint();

  try {
    const bulkOps = updates.map(({ userId, guildId, updateData }) => ({
      updateOne: {
        filter: { userId, guildId },
        update: updateData,
        upsert: true,
      },
    }));

    const result = await Profile.bulkWrite(bulkOps);

    for (const { userId, guildId } of updates) {
      cache.delete(`profile:${userId}:${guildId}`);
    }

    const end = process.hrtime.bigint();
    const executionTime = Number(end - start) / 1000000;
    performanceMonitor.trackDatabaseQuery(
      "batchUpdateProfiles",
      executionTime,
      true
    );

    return result;
  } catch (error) {
    const end = process.hrtime.bigint();
    const executionTime = Number(end - start) / 1000000;
    performanceMonitor.trackDatabaseQuery(
      "batchUpdateProfiles",
      executionTime,
      false,
      error
    );
    throw error;
  }
};

/**
 * Get multiple profiles efficiently
 */
const getMultipleProfiles = async (userIds, guildId, useCache = true) => {
  const start = process.hrtime.bigint();

  try {
    const profiles = [];
    const uncachedIds = [];

    if (useCache) {
      for (const userId of userIds) {
        const cached = cache.getProfile(userId, guildId);
        if (cached) {
          profiles.push(cached);
        } else {
          uncachedIds.push(userId);
        }
      }
    } else {
      uncachedIds.push(...userIds);
    }

    if (uncachedIds.length > 0) {
      const uncachedProfiles = await Profile.find({
        userId: { $in: uncachedIds },
        guildId,
      }).lean();

      if (useCache) {
        for (const profile of uncachedProfiles) {
          cache.setProfile(profile.userId, guildId, profile);
        }
      }

      profiles.push(...uncachedProfiles);
    }

    const end = process.hrtime.bigint();
    const executionTime = Number(end - start) / 1000000;
    performanceMonitor.trackDatabaseQuery(
      "getMultipleProfiles",
      executionTime,
      true
    );

    return profiles;
  } catch (error) {
    const end = process.hrtime.bigint();
    const executionTime = Number(end - start) / 1000000;
    performanceMonitor.trackDatabaseQuery(
      "getMultipleProfiles",
      executionTime,
      false,
      error
    );
    throw error;
  }
};

module.exports = {
  createDefaultProfile,
  getOrCreateProfile,
  updateProfileActivity,
  addGhostEncounter,
  initializeGhostData,
  batchUpdateProfiles,
  getMultipleProfiles,
};
