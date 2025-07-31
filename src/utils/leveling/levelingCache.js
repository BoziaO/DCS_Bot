const NodeCache = require("node-cache");

class LevelingCache {
    constructor() {
        this.profileCache = new NodeCache({
            stdTTL: 300,
            checkperiod: 60,
            useClones: false,
        });

        this.leaderboardCache = new NodeCache({
            stdTTL: 600,
            checkperiod: 120,
            useClones: false,
        });

        this.configCache = new NodeCache({
            stdTTL: 1800,
            checkperiod: 300,
            useClones: false,
        });

        this.statsCache = new NodeCache({
            stdTTL: 120,
            checkperiod: 60,
            useClones: false,
        });

        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
        };

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.profileCache.on("hit", () => this.stats.hits++);
        this.profileCache.on("miss", () => this.stats.misses++);
        this.profileCache.on("set", () => this.stats.sets++);
        this.profileCache.on("del", () => this.stats.deletes++);

        this.leaderboardCache.on("hit", () => this.stats.hits++);
        this.leaderboardCache.on("miss", () => this.stats.misses++);
        this.leaderboardCache.on("set", () => this.stats.sets++);
        this.leaderboardCache.on("del", () => this.stats.deletes++);

        this.configCache.on("hit", () => this.stats.hits++);
        this.configCache.on("miss", () => this.stats.misses++);
        this.configCache.on("set", () => this.stats.sets++);
        this.configCache.on("del", () => this.stats.deletes++);

        this.statsCache.on("hit", () => this.stats.hits++);
        this.statsCache.on("miss", () => this.stats.misses++);
        this.statsCache.on("set", () => this.stats.sets++);
        this.statsCache.on("del", () => this.stats.deletes++);
    }

    getProfile(userId, guildId) {
        const key = `profile:${guildId}:${userId}`;
        return this.profileCache.get(key);
    }

    setProfile(userId, guildId, profile, ttl = null) {
        const key = `profile:${guildId}:${userId}`;
        if (ttl) {
            this.profileCache.set(key, profile, ttl);
        } else {
            this.profileCache.set(key, profile);
        }
    }

    deleteProfile(userId, guildId) {
        const key = `profile:${guildId}:${userId}`;
        this.profileCache.del(key);
    }

    getLeaderboard(guildId, type = "xp") {
        const key = `leaderboard:${guildId}:${type}`;
        return this.leaderboardCache.get(key);
    }

    setLeaderboard(guildId, type, leaderboard, ttl = null) {
        const key = `leaderboard:${guildId}:${type}`;
        if (ttl) {
            this.leaderboardCache.set(key, leaderboard, ttl);
        } else {
            this.leaderboardCache.set(key, leaderboard);
        }
    }

    deleteLeaderboard(guildId, type = null) {
        if (type) {
            const key = `leaderboard:${guildId}:${type}`;
            this.leaderboardCache.del(key);
        } else {
            const keys = this.leaderboardCache
                .keys()
                .filter((key) => key.startsWith(`leaderboard:${guildId}:`));
            this.leaderboardCache.del(keys);
        }
    }

    getConfig(guildId, type) {
        const key = `config:${guildId}:${type}`;
        return this.configCache.get(key);
    }

    setConfig(guildId, type, config, ttl = null) {
        const key = `config:${guildId}:${type}`;
        if (ttl) {
            this.configCache.set(key, config, ttl);
        } else {
            this.configCache.set(key, config);
        }
    }

    deleteConfig(guildId, type) {
        const key = `config:${guildId}:${type}`;
        this.configCache.del(key);
    }

    getStats(key) {
        return this.statsCache.get(key);
    }

    setStats(key, stats, ttl = null) {
        if (ttl) {
            this.statsCache.set(key, stats, ttl);
        } else {
            this.statsCache.set(key, stats);
        }
    }

    deleteStats(key) {
        this.statsCache.del(key);
    }

    invalidateUser(userId, guildId) {
        this.deleteProfile(userId, guildId);

        this.deleteLeaderboard(guildId);

        const userStatsKeys = this.statsCache
            .keys()
            .filter((key) => key.includes(userId) || key.includes(`user:${userId}`));
        this.statsCache.del(userStatsKeys);
    }

    invalidateGuild(guildId) {
        const profileKeys = this.profileCache
            .keys()
            .filter((key) => key.startsWith(`profile:${guildId}:`));
        this.profileCache.del(profileKeys);

        this.deleteLeaderboard(guildId);

        const configKeys = this.configCache
            .keys()
            .filter((key) => key.startsWith(`config:${guildId}:`));
        this.configCache.del(configKeys);

        const statsKeys = this.statsCache
            .keys()
            .filter(
                (key) => key.includes(guildId) || key.includes(`guild:${guildId}`)
            );
        this.statsCache.del(statsKeys);
    }

    getCacheStats() {
        const hitRate =
            this.stats.hits + this.stats.misses > 0
                ? (
                    (this.stats.hits / (this.stats.hits + this.stats.misses)) *
                    100
                ).toFixed(2)
                : 0;

        return {
            ...this.stats,
            hitRate: `${hitRate}%`,
            profileCache: {
                keys: this.profileCache.keys().length,
                stats: this.profileCache.getStats(),
            },
            leaderboardCache: {
                keys: this.leaderboardCache.keys().length,
                stats: this.leaderboardCache.getStats(),
            },
            configCache: {
                keys: this.configCache.keys().length,
                stats: this.configCache.getStats(),
            },
            statsCache: {
                keys: this.statsCache.keys().length,
                stats: this.statsCache.getStats(),
            },
        };
    }

    clearAll() {
        this.profileCache.flushAll();
        this.leaderboardCache.flushAll();
        this.configCache.flushAll();
        this.statsCache.flushAll();

        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
        };
    }

    optimize() {
        this.profileCache.keys();
        this.leaderboardCache.keys();
        this.configCache.keys();
        this.statsCache.keys();
    }

    getMemoryUsage() {
        const process = require("process");
        const memUsage = process.memoryUsage();

        return {
            rss: `${Math.round((memUsage.rss / 1024 / 1024) * 100) / 100} MB`,
            heapTotal: `${
                Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100
            } MB`,
            heapUsed: `${
                Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100
            } MB`,
            external: `${
                Math.round((memUsage.external / 1024 / 1024) * 100) / 100
            } MB`,
        };
    }

    async initialize() {
        console.log("[LevelingCache] Initializing cache...");

        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
        };

        console.log("[LevelingCache] Initialization complete");
    }
}

const levelingCache = new LevelingCache();

module.exports = levelingCache;
