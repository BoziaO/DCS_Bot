const mongoose = require("mongoose");
const {cache} = require("./cache");

class DatabaseService {
    constructor() {
        this.isConnected = false;
        this.connectionAttempts = 0;
        this.maxRetries = 5;
        this.retryDelay = 2000;
        this.queryStats = {
            total: 0,
            cached: 0,
            errors: 0,
        };
    }

    async connect(uri, options = {}) {
        const defaultOptions = {
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            connectTimeoutMS: 10000,
            maxPoolSize: 15,
            minPoolSize: 2,
            maxIdleTimeMS: 30000,
            heartbeatFrequencyMS: 10000,
            retryWrites: true,
            w: "majority",

            bufferCommands: false,
            useUnifiedTopology: true,
            useNewUrlParser: true,
        };

        const finalOptions = {...defaultOptions, ...options};

        while (this.connectionAttempts < this.maxRetries) {
            try {
                await mongoose.connect(uri, finalOptions);
                this.isConnected = true;
                this.connectionAttempts = 0;

                this.setupEventListeners();

                console.log("✅ Database connected successfully");
                return true;
            } catch (error) {
                this.connectionAttempts++;
                console.error(
                    `❌ Database connection attempt ${this.connectionAttempts}/${this.maxRetries} failed:`,
                    error.message
                );

                if (this.connectionAttempts >= this.maxRetries) {
                    throw new Error(
                        `Failed to connect to database after ${this.maxRetries} attempts`
                    );
                }

                await this.delay(this.retryDelay * this.connectionAttempts);
            }
        }
    }

    setupEventListeners() {
        mongoose.connection.on("disconnected", () => {
            console.warn("⚠️ Database disconnected");
            this.isConnected = false;
        });

        mongoose.connection.on("reconnected", () => {
            console.log("🔄 Database reconnected");
            this.isConnected = true;
        });

        mongoose.connection.on("error", (error) => {
            console.error("❌ Database error:", error);
            this.queryStats.errors++;
        });
    }

    async getProfile(userId, guildId, useCache = true) {
        const cacheKey = `profile:${userId}:${guildId}`;

        if (useCache) {
            const cached = cache.getProfile(userId, guildId);
            if (cached) {
                this.queryStats.cached++;
                return cached;
            }
        }

        try {
            const Profile = require("../models/Profile");
            const profile = await Profile.findOne({userId, guildId}).lean();

            if (profile && useCache) {
                cache.setProfile(userId, guildId, profile);
            }

            this.queryStats.total++;
            return profile;
        } catch (error) {
            this.queryStats.errors++;
            throw error;
        }
    }

    async getMultipleProfiles(userIds, guildId, useCache = true) {
        const profiles = [];
        const uncachedIds = [];

        if (useCache) {
            for (const userId of userIds) {
                const cached = cache.getProfile(userId, guildId);
                if (cached) {
                    profiles.push(cached);
                    this.queryStats.cached++;
                } else {
                    uncachedIds.push(userId);
                }
            }
        } else {
            uncachedIds.push(...userIds);
        }

        if (uncachedIds.length > 0) {
            try {
                const Profile = require("../models/Profile");
                const uncachedProfiles = await Profile.find({
                    userId: {$in: uncachedIds},
                    guildId,
                }).lean();

                if (useCache) {
                    for (const profile of uncachedProfiles) {
                        cache.setProfile(profile.userId, guildId, profile);
                    }
                }

                profiles.push(...uncachedProfiles);
                this.queryStats.total++;
            } catch (error) {
                this.queryStats.errors++;
                throw error;
            }
        }

        return profiles;
    }

    async updateProfile(userId, guildId, updateData, options = {}) {
        try {
            const Profile = require("../models/Profile");
            const result = await Profile.findOneAndUpdate(
                {userId, guildId},
                updateData,
                {
                    new: true,
                    upsert: true,
                    lean: true,
                    ...options,
                }
            );

            if (result) {
                cache.setProfile(userId, guildId, result);
            }

            this.queryStats.total++;
            return result;
        } catch (error) {
            this.queryStats.errors++;
            throw error;
        }
    }

    async bulkUpdateProfiles(updates) {
        try {
            const Profile = require("../models/Profile");
            const bulkOps = updates.map(({userId, guildId, updateData}) => ({
                updateOne: {
                    filter: {userId, guildId},
                    update: updateData,
                    upsert: true,
                },
            }));

            const result = await Profile.bulkWrite(bulkOps);

            for (const {userId, guildId} of updates) {
                cache.delete(`profile:${userId}:${guildId}`);
            }

            this.queryStats.total++;
            return result;
        } catch (error) {
            this.queryStats.errors++;
            throw error;
        }
    }

    async getGuildConfig(guildId, configType, ModelClass) {
        const cached = cache.getGuildConfig(guildId, configType);
        if (cached) {
            this.queryStats.cached++;
            return cached;
        }

        try {
            const config = await ModelClass.findOne({guildId}).lean();
            if (config) {
                cache.setGuildConfig(guildId, configType, config);
            }

            this.queryStats.total++;
            return config;
        } catch (error) {
            this.queryStats.errors++;
            throw error;
        }
    }

    getStats() {
        return {
            isConnected: this.isConnected,
            queryStats: this.queryStats,
            cacheStats: cache.getStats(),
            connectionState: mongoose.connection.readyState,
            connectionStates: {
                0: "disconnected",
                1: "connected",
                2: "connecting",
                3: "disconnecting",
            }[mongoose.connection.readyState],
        };
    }

    async healthCheck() {
        try {
            await mongoose.connection.db.admin().ping();
            return {status: "healthy", timestamp: new Date()};
        } catch (error) {
            return {
                status: "unhealthy",
                error: error.message,
                timestamp: new Date(),
            };
        }
    }

    delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    async disconnect() {
        try {
            await mongoose.connection.close();
            this.isConnected = false;
            console.log("✅ Database disconnected gracefully");
        } catch (error) {
            console.error("❌ Error during database disconnect:", error);
        }
    }
}

const dbService = new DatabaseService();

module.exports = {
    dbService,
    DatabaseService,
};
