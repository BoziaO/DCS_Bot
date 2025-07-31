class CacheManager {
    constructor() {
        this.cache = new Map();
        this.ttlCache = new Map();
        this.maxSize = 1000;
        this.defaultTTL = 300000;
        this.cleanupInterval = 60000;

        this.hitCount = 0;
        this.missCount = 0;

        this.startCleanup();
    }

    set(key, value, ttl = this.defaultTTL) {
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.delete(firstKey);
        }

        this.cache.set(key, value);
        this.ttlCache.set(key, Date.now() + ttl);
        return true;
    }

    get(key) {
        const ttl = this.ttlCache.get(key);
        if (!ttl || Date.now() > ttl) {
            this.delete(key);
            this.missCount++;
            return null;
        }
        this.hitCount++;
        return this.cache.get(key);
    }

    delete(key) {
        this.cache.delete(key);
        this.ttlCache.delete(key);
        return true;
    }

    has(key) {
        const ttl = this.ttlCache.get(key);
        if (!ttl || Date.now() > ttl) {
            this.delete(key);
            return false;
        }
        return this.cache.has(key);
    }

    clear() {
        this.cache.clear();
        this.ttlCache.clear();
    }

    getStats() {
        const total = this.hitCount + this.missCount;
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: total > 0 ? this.hitCount / total : 0,
            hits: this.hitCount,
            misses: this.missCount,
            total: total,
        };
    }

    startCleanup() {
        setInterval(() => {
            const now = Date.now();
            for (const [key, ttl] of this.ttlCache.entries()) {
                if (now > ttl) {
                    this.delete(key);
                }
            }
        }, this.cleanupInterval);
    }

    setProfile(userId, guildId, profile, ttl = 600000) {
        const key = `profile:${userId}:${guildId}`;
        return this.set(key, profile, ttl);
    }

    getProfile(userId, guildId) {
        const key = `profile:${userId}:${guildId}`;
        return this.get(key);
    }

    setGuildConfig(guildId, configType, config, ttl = 1800000) {
        const key = `config:${guildId}:${configType}`;
        return this.set(key, config, ttl);
    }

    getGuildConfig(guildId, configType) {
        const key = `config:${guildId}:${configType}`;
        return this.get(key);
    }

    setCooldown(userId, commandName, ttl = 5000) {
        const key = `cooldown:${userId}:${commandName}`;
        return this.set(key, true, ttl);
    }

    hasCooldown(userId, commandName) {
        const key = `cooldown:${userId}:${commandName}`;
        return this.has(key);
    }

    getGameData(dataType) {
        const key = `phasmophobia:${dataType}`;
        return this.get(key);
    }

    setGameData(dataType, data, ttl = 3600000) {
        const key = `phasmophobia:${dataType}`;
        return this.set(key, data, ttl);
    }

    async batchSet(entries) {
        const results = [];
        for (const {key, value, ttl} of entries) {
            try {
                this.set(key, value, ttl);
                results.push({key, success: true});
            } catch (error) {
                results.push({key, success: false, error: error.message});
            }
        }
        return results;
    }

    healthCheck() {
        const stats = this.getStats();
        const memoryUsage = process.memoryUsage();

        return {
            healthy: stats.size < this.maxSize * 0.9,
            stats,
            memoryUsage: {
                heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
                heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
            },
            recommendations: this.getRecommendations(stats),
        };
    }

    getRecommendations(stats) {
        const recommendations = [];

        if (stats.hitRate < 0.5) {
            recommendations.push(
                "Low hit rate - consider adjusting TTL values or cache strategy"
            );
        }

        if (stats.size > this.maxSize * 0.8) {
            recommendations.push(
                "Cache approaching capacity - consider increasing maxSize or reducing TTL"
            );
        }

        if (stats.total > 1000 && stats.hitRate > 0.8) {
            recommendations.push("High hit rate - cache is performing well");
        }

        return recommendations;
    }
}

const cache = new CacheManager();

module.exports = {
    cache,
    CacheManager,
};
