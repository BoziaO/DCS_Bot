const NodeCache = require("node-cache");
const WelcomeConfig = require("../../models/WelcomeConfig");

class WelcomeCache {
    constructor() {
        this.cache = new NodeCache({
            stdTTL: 300,
            checkperiod: 60,
            useClones: false,
            deleteOnExpire: true,
            maxKeys: 1000,
        });

        this.stats = {
            hits: 0,
            misses: 0,
            sets: 0,
            deletes: 0,
        };

        this.cache.on("set", (key, value) => {
            this.stats.sets++;
        });

        this.cache.on("del", (key, value) => {
            this.stats.deletes++;
        });

        this.cache.on("expired", (key, value) => {
            console.log(`[WelcomeCache] Expired key: ${key}`);
        });
    }

    async getWelcomeConfigs(guildId) {
        const cacheKey = `welcome:${guildId}`;

        let configs = this.cache.get(cacheKey);
        if (configs) {
            this.stats.hits++;
            return configs;
        }

        this.stats.misses++;
        try {
            configs = await WelcomeConfig.getActiveConfigs(guildId);

            this.cache.set(cacheKey, configs);

            return configs;
        } catch (error) {
            console.error("[WelcomeCache] Error fetching welcome configs:", error);
            return [];
        }
    }

    async getFarewellConfigs(guildId) {
        const cacheKey = `farewell:${guildId}`;

        let configs = this.cache.get(cacheKey);
        if (configs) {
            this.stats.hits++;
            return configs;
        }

        this.stats.misses++;
        try {
            configs = await WelcomeConfig.getFarewellConfigs(guildId);

            this.cache.set(cacheKey, configs);

            return configs;
        } catch (error) {
            console.error("[WelcomeCache] Error fetching farewell configs:", error);
            return [];
        }
    }

    async getConfig(guildId, channelId) {
        const cacheKey = `config:${guildId}:${channelId}`;

        let config = this.cache.get(cacheKey);
        if (config) {
            this.stats.hits++;
            return config;
        }

        this.stats.misses++;
        try {
            config = await WelcomeConfig.findOne({
                guildId: guildId,
                channelId: channelId,
            });

            if (config) {
                this.cache.set(cacheKey, config);
            }

            return config;
        } catch (error) {
            console.error("[WelcomeCache] Error fetching config:", error);
            return null;
        }
    }

    invalidateGuild(guildId) {
        const keys = this.cache.keys();
        const guildKeys = keys.filter(
            (key) =>
                key.startsWith(`welcome:${guildId}`) ||
                key.startsWith(`farewell:${guildId}`) ||
                key.startsWith(`config:${guildId}:`)
        );

        guildKeys.forEach((key) => {
            this.cache.del(key);
        });

        console.log(
            `[WelcomeCache] Invalidated ${guildKeys.length} keys for guild ${guildId}`
        );
    }

    invalidateChannel(guildId, channelId) {
        const keysToDelete = [
            `welcome:${guildId}`,
            `farewell:${guildId}`,
            `config:${guildId}:${channelId}`,
        ];

        keysToDelete.forEach((key) => {
            this.cache.del(key);
        });

        console.log(
            `[WelcomeCache] Invalidated cache for channel ${channelId} in guild ${guildId}`
        );
    }

    getStats() {
        const cacheStats = this.cache.getStats();

        return {
            ...this.stats,
            keys: cacheStats.keys,
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRate:
                this.stats.hits + this.stats.misses > 0
                    ? (
                    (this.stats.hits / (this.stats.hits + this.stats.misses)) *
                    100
                ).toFixed(2) + "%"
                    : "0%",
            memoryUsage: this.getMemoryUsage(),
        };
    }

    getMemoryUsage() {
        const used = process.memoryUsage();
        return {
            rss: `${Math.round((used.rss / 1024 / 1024) * 100) / 100} MB`,
            heapTotal: `${Math.round((used.heapTotal / 1024 / 1024) * 100) / 100} MB`,
            heapUsed: `${Math.round((used.heapUsed / 1024 / 1024) * 100) / 100} MB`,
            external: `${Math.round((used.external / 1024 / 1024) * 100) / 100} MB`,
        };
    }

    clear() {
        this.cache.flushAll();
        console.log("[WelcomeCache] Cache cleared");
    }

    optimize() {
        const beforeKeys = this.cache.keys().length;

        this.cache.checkperiod = 1;
        setTimeout(() => {
            this.cache.checkperiod = 60;
            const afterKeys = this.cache.keys().length;
            console.log(
                `[WelcomeCache] Optimization complete: ${beforeKeys} -> ${afterKeys} keys`
            );
        }, 2000);
    }

    async warmup(guildIds) {
        console.log(
            `[WelcomeCache] Warming up cache for ${guildIds.length} guilds...`
        );

        const promises = guildIds.map(async (guildId) => {
            try {
                await this.getWelcomeConfigs(guildId);
                await this.getFarewellConfigs(guildId);
            } catch (error) {
                console.error(
                    `[WelcomeCache] Error warming up guild ${guildId}:`,
                    error
                );
            }
        });

        await Promise.allSettled(promises);
        console.log("[WelcomeCache] Warmup complete");
    }
}

const welcomeCache = new WelcomeCache();

module.exports = welcomeCache;
