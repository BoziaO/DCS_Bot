const {cache} = require("./cache");

class CachePreloader {
    constructor() {
        this.preloadStrategies = {
            gameData: this.preloadGameData.bind(this),
            guildConfigs: this.preloadGuildConfigs.bind(this),
            activeProfiles: this.preloadActiveProfiles.bind(this),
            popularCommands: this.preloadPopularCommandData.bind(this),
        };
    }

    async preloadGameData() {
        try {
            const {
                ghosts,
                maps,
                equipment,
                cursedItems,
            } = require("../data/phasmophobiaData");

            const gameDataEntries = [
                {key: "phasmophobia:ghosts", value: ghosts, ttl: 3600000},
                {key: "phasmophobia:maps", value: maps, ttl: 3600000},
                {key: "phasmophobia:equipment", value: equipment, ttl: 3600000},
                {key: "phasmophobia:cursedItems", value: cursedItems, ttl: 3600000},
            ];

            const results = await cache.batchSet(gameDataEntries);
            const successful = results.filter((r) => r.success).length;

            return {
                strategy: "gameData",
                successful,
                total: gameDataEntries.length,
                items: successful,
            };
        } catch (error) {
            return {
                strategy: "gameData",
                successful: 0,
                total: 0,
                error: error.message,
            };
        }
    }

    async preloadGuildConfigs(guildIds = []) {
        try {
            const LevelingConfig = require("../models/LevelingConfig");
            const WelcomeConfig = require("../models/WelcomeConfig");
            const AutoModConfig = require("../models/AutoModConfig");

            let cachedItems = 0;
            const promises = [];

            for (const guildId of guildIds) {
                promises.push(
                    (async () => {
                        try {
                            const levelingConfig = await LevelingConfig.findOne({
                                guildId,
                            }).lean();
                            if (levelingConfig) {
                                cache.setGuildConfig(guildId, "leveling", levelingConfig);
                                cachedItems++;
                            }

                            const welcomeConfig = await WelcomeConfig.findOne({
                                guildId,
                            }).lean();
                            if (welcomeConfig) {
                                cache.setGuildConfig(guildId, "welcome", welcomeConfig);
                                cachedItems++;
                            }

                            const autoModConfig = await AutoModConfig.findOne({
                                guildId,
                            }).lean();
                            if (autoModConfig) {
                                cache.setGuildConfig(guildId, "automod", autoModConfig);
                                cachedItems++;
                            }

                            return 1;
                        } catch (error) {
                            return 0;
                        }
                    })()
                );
            }

            await Promise.allSettled(promises);

            return {
                strategy: "guildConfigs",
                successful: cachedItems,
                total: guildIds.length * 3,
                items: cachedItems,
            };
        } catch (error) {
            return {
                strategy: "guildConfigs",
                successful: 0,
                total: 0,
                error: error.message,
            };
        }
    }

    async preloadActiveProfiles(limit = 100) {
        try {
            const Profile = require("../models/Profile");

            const recentCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const activeProfiles = await Profile.find({
                $or: [
                    {lastHunt: {$gte: recentCutoff}},
                    {lastInvestigate: {$gte: recentCutoff}},
                    {lastDaily: {$gte: recentCutoff}},
                    {updatedAt: {$gte: recentCutoff}},
                ],
            })
                .sort({updatedAt: -1})
                .limit(limit)
                .lean();

            let cachedItems = 0;
            for (const profile of activeProfiles) {
                cache.setProfile(profile.userId, profile.guildId, profile);
                cachedItems++;
            }

            return {
                strategy: "activeProfiles",
                successful: cachedItems,
                total: activeProfiles.length,
                items: cachedItems,
            };
        } catch (error) {
            return {
                strategy: "activeProfiles",
                successful: 0,
                total: 0,
                error: error.message,
            };
        }
    }

    async preloadPopularCommandData() {
        try {
            const {ghosts} = require("../data/phasmophobiaData");
            const ghostNames = ghosts.map((g) => ({
                name: g.name,
                value: g.name.toLowerCase(),
            }));
            cache.set("autocomplete:ghost-names", ghostNames, 1800000);

            const {maps} = require("../data/phasmophobiaData");
            const mapNames = maps.map((m) => ({
                name: m.name,
                value: m.name.toLowerCase(),
            }));
            cache.set("autocomplete:map-names", mapNames, 1800000);

            const {equipment} = require("../data/phasmophobiaData");
            const equipmentNames = equipment.map((e) => ({
                name: e.name,
                value: e.name.toLowerCase(),
            }));
            cache.set("autocomplete:equipment-names", equipmentNames, 1800000);

            return {
                strategy: "popularCommands",
                successful: 3,
                total: 3,
                items: 3,
            };
        } catch (error) {
            return {
                strategy: "popularCommands",
                successful: 0,
                total: 0,
                error: error.message,
            };
        }
    }

    async executeAll(guildIds = []) {
        const results = [];

        for (const [strategyName, strategyFunc] of Object.entries(
            this.preloadStrategies
        )) {
            try {
                let result;
                if (strategyName === "guildConfigs") {
                    result = await strategyFunc(guildIds);
                } else {
                    result = await strategyFunc();
                }
                results.push(result);
            } catch (error) {
                results.push({
                    strategy: strategyName,
                    successful: 0,
                    total: 0,
                    error: error.message,
                });
            }
        }

        return results;
    }

    async smartPreload(client) {
        const guildIds = Array.from(client.guilds.cache.keys());
        const results = await this.executeAll(guildIds);

        const summary = {
            totalItems: results.reduce((sum, r) => sum + (r.items || 0), 0),
            totalStrategies: results.length,
            successfulStrategies: results.filter((r) => r.successful > 0).length,
            errors: results
                .filter((r) => r.error)
                .map((r) => ({strategy: r.strategy, error: r.error})),
        };

        return {results, summary};
    }
}

module.exports = new CachePreloader();
