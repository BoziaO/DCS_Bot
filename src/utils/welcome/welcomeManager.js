const welcomeCache = require("./welcomeCache");
const embedBuilder = require("./embedBuilder");
const placeholderManager = require("./placeholderManager");
const WelcomeConfig = require("../../models/WelcomeConfig");

class WelcomeManager {
    constructor() {
        this.processingQueue = new Map();
        this.cooldowns = new Map();
        this.statistics = {
            totalWelcomes: 0,
            totalFarewells: 0,
            totalDMs: 0,
            errors: 0,
            lastProcessed: null,
        };
    }

    async processNewMember(member) {
        const startTime = Date.now();
        const memberId = `${member.guild.id}-${member.user.id}`;

        if (this.processingQueue.has(memberId)) {
            console.log(
                `[WelcomeManager] Already processing member ${member.user.tag}`
            );
            return;
        }

        this.processingQueue.set(memberId, Date.now());

        try {
            if (member.user.bot) {
                const configs = await welcomeCache.getWelcomeConfigs(member.guild.id);
                const shouldIgnoreBots = configs.every(
                    (config) => config.filters.ignoreBots
                );
                if (shouldIgnoreBots) {
                    console.log(`[WelcomeManager] Ignoring bot ${member.user.tag}`);
                    return;
                }
            }

            const configs = await welcomeCache.getWelcomeConfigs(member.guild.id);

            if (configs.length === 0) {
                console.log(
                    `[WelcomeManager] No welcome configs found for guild ${member.guild.name}`
                );
                return;
            }

            const promises = configs.map((config) =>
                this.processWelcomeConfig(config, member)
            );
            const results = await Promise.allSettled(promises);

            let successCount = 0;
            let errorCount = 0;

            results.forEach((result, index) => {
                if (result.status === "fulfilled") {
                    successCount++;
                } else {
                    errorCount++;
                    console.error(
                        `[WelcomeManager] Error processing config ${configs[index]._id}:`,
                        result.reason
                    );
                }
            });

            this.statistics.totalWelcomes += successCount;
            this.statistics.errors += errorCount;
            this.statistics.lastProcessed = new Date();

            const processingTime = Date.now() - startTime;
            console.log(
                `[WelcomeManager] Processed ${member.user.tag} in ${processingTime}ms (${successCount} success, ${errorCount} errors)`
            );
        } catch (error) {
            console.error(
                `[WelcomeManager] Error processing new member ${member.user.tag}:`,
                error
            );
            this.statistics.errors++;
        } finally {
            this.processingQueue.delete(memberId);
        }
    }

    async processLeavingMember(member) {
        const startTime = Date.now();

        try {
            const configs = await welcomeCache.getFarewellConfigs(member.guild.id);

            if (configs.length === 0) {
                console.log(
                    `[WelcomeManager] No farewell configs found for guild ${member.guild.name}`
                );
                return;
            }

            const promises = configs.map((config) =>
                this.processFarewellConfig(config, member)
            );
            const results = await Promise.allSettled(promises);

            let successCount = 0;
            let errorCount = 0;

            results.forEach((result, index) => {
                if (result.status === "fulfilled") {
                    successCount++;
                } else {
                    errorCount++;
                    console.error(
                        `[WelcomeManager] Error processing farewell config ${configs[index]._id}:`,
                        result.reason
                    );
                }
            });

            this.statistics.totalFarewells += successCount;
            this.statistics.errors += errorCount;

            const processingTime = Date.now() - startTime;
            console.log(
                `[WelcomeManager] Processed farewell for ${member.user.tag} in ${processingTime}ms (${successCount} success, ${errorCount} errors)`
            );
        } catch (error) {
            console.error(
                `[WelcomeManager] Error processing leaving member ${member.user.tag}:`,
                error
            );
            this.statistics.errors++;
        }
    }

    async processWelcomeConfig(config, member) {
        if (!config.enabled || !config.welcomeMessage.enabled) {
            return;
        }

        if (!this.passesFilters(config, member)) {
            console.log(
                `[WelcomeManager] Member ${member.user.tag} filtered out by config ${config._id}`
            );
            return;
        }

        if (this.isOnCooldown(config, member)) {
            console.log(
                `[WelcomeManager] Member ${member.user.tag} on cooldown for config ${config._id}`
            );
            return;
        }

        const channel = await this.getChannel(member.guild, config.channelId);
        if (!channel) {
            console.warn(
                `[WelcomeManager] Channel ${config.channelId} not found, removing config`
            );
            await this.removeInvalidConfig(config._id);
            return;
        }

        if (!this.hasPermissions(channel, member.guild.members.me)) {
            console.warn(
                `[WelcomeManager] No permissions for channel ${channel.name} (${channel.id})`
            );
            return;
        }

        try {
            const messageData = await this.prepareWelcomeMessage(config, member);

            const sentMessage = await channel.send(messageData);

            if (config.advanced.deleteAfter > 0) {
                setTimeout(async () => {
                    try {
                        await sentMessage.delete();
                    } catch (error) {
                        console.error(`[WelcomeManager] Error deleting message:`, error);
                    }
                }, config.advanced.deleteAfter * 1000);
            }

            await this.assignAutoRoles(config, member);

            await this.sendDirectMessage(config, member);

            await config.incrementWelcomes();

            this.setCooldown(config, member);

            console.log(
                `[WelcomeManager] Welcome sent for ${member.user.tag} in ${channel.name} (${member.guild.name})`
            );
        } catch (error) {
            console.error(`[WelcomeManager] Error sending welcome message:`, error);
            throw error;
        }
    }

    async processFarewellConfig(config, member) {
        if (!config.enabled || !config.farewellMessage.enabled) {
            return;
        }

        const channelId = config.farewellMessage.channelId || config.channelId;
        const channel = await this.getChannel(member.guild, channelId);

        if (!channel) {
            console.warn(`[WelcomeManager] Farewell channel ${channelId} not found`);
            return;
        }

        if (!this.hasPermissions(channel, member.guild.members.me)) {
            console.warn(
                `[WelcomeManager] No permissions for farewell channel ${channel.name}`
            );
            return;
        }

        try {
            const embed = await embedBuilder.buildFarewellEmbed(config, member);

            if (embed) {
                await channel.send({embeds: [embed]});
                await config.incrementFarewells();
                console.log(
                    `[WelcomeManager] Farewell sent for ${member.user.tag} in ${channel.name}`
                );
            }
        } catch (error) {
            console.error(`[WelcomeManager] Error sending farewell message:`, error);
            throw error;
        }
    }

    async prepareWelcomeMessage(config, member) {
        const messageData = {};

        if (config.welcomeMessage.embed.enabled) {
            const embed = await embedBuilder.buildWelcomeEmbed(config, member);
            if (embed) {
                messageData.embeds = [embed];
            }
        }

        if (
            config.welcomeMessage.content.enabled &&
            config.welcomeMessage.content.text
        ) {
            const content = await placeholderManager.replacePlaceholders(
                config.welcomeMessage.content.text,
                member,
                config.advanced.customPlaceholders
            );
            messageData.content = content;
        }

        if (config.advanced.pingRoles && config.advanced.pingRoles.length > 0) {
            const rolePings = config.advanced.pingRoles
                .map((roleId) => `<@&${roleId}>`)
                .join(" ");

            messageData.content = messageData.content
                ? `${messageData.content} ${rolePings}`
                : rolePings;
        }

        return messageData;
    }

    async sendDirectMessage(config, member) {
        if (!config.directMessage.enabled) {
            return;
        }

        try {
            if (config.directMessage.delay > 0) {
                await new Promise((resolve) =>
                    setTimeout(resolve, config.directMessage.delay * 1000)
                );
            }

            const embed = await embedBuilder.buildDirectMessageEmbed(config, member);

            if (embed) {
                await member.send({embeds: [embed]});
                this.statistics.totalDMs++;
                console.log(`[WelcomeManager] DM sent to ${member.user.tag}`);
            }
        } catch (error) {
            console.error(
                `[WelcomeManager] Error sending DM to ${member.user.tag}:`,
                error
            );
        }
    }

    async assignAutoRoles(config, member) {
        if (!config.autoRoles.enabled || !config.autoRoles.roles.length) {
            return;
        }

        try {
            if (config.autoRoles.delay > 0) {
                await new Promise((resolve) =>
                    setTimeout(resolve, config.autoRoles.delay * 1000)
                );
            }

            const roles = config.autoRoles.roles
                .map((roleId) => member.guild.roles.cache.get(roleId))
                .filter(
                    (role) =>
                        role &&
                        role.position < member.guild.members.me.roles.highest.position
                );

            if (roles.length > 0) {
                await member.roles.add(roles);
                console.log(
                    `[WelcomeManager] Added ${roles.length} auto-roles to ${member.user.tag}`
                );
            }
        } catch (error) {
            console.error(
                `[WelcomeManager] Error assigning auto-roles to ${member.user.tag}:`,
                error
            );
        }
    }

    passesFilters(config, member) {
        const filters = config.filters;

        if (filters.minAccountAge > 0) {
            const accountAge =
                (Date.now() - member.user.createdTimestamp) / (1000 * 60 * 60 * 24);
            if (accountAge < filters.minAccountAge) {
                return false;
            }
        }

        if (filters.ignoreRoles && filters.ignoreRoles.length > 0) {
            const hasIgnoredRole = member.roles.cache.some((role) =>
                filters.ignoreRoles.includes(role.id)
            );
            if (hasIgnoredRole) {
                return false;
            }
        }

        if (filters.requiredRoles && filters.requiredRoles.length > 0) {
            const hasRequiredRole = filters.requiredRoles.some((roleId) =>
                member.roles.cache.has(roleId)
            );
            if (!hasRequiredRole) {
                return false;
            }
        }

        return true;
    }

    isOnCooldown(config, member) {
        if (config.filters.cooldown <= 0) {
            return false;
        }

        const cooldownKey = `${config._id}-${member.user.id}`;
        const lastProcessed = this.cooldowns.get(cooldownKey);

        if (!lastProcessed) {
            return false;
        }

        const timePassed = (Date.now() - lastProcessed) / 1000;
        return timePassed < config.filters.cooldown;
    }

    setCooldown(config, member) {
        if (config.filters.cooldown > 0) {
            const cooldownKey = `${config._id}-${member.user.id}`;
            this.cooldowns.set(cooldownKey, Date.now());

            setTimeout(() => {
                this.cooldowns.delete(cooldownKey);
            }, config.filters.cooldown * 1000);
        }
    }

    async getChannel(guild, channelId) {
        try {
            return await guild.channels.fetch(channelId);
        } catch (error) {
            return null;
        }
    }

    hasPermissions(channel, botMember) {
        const permissions = channel.permissionsFor(botMember);
        return (
            permissions &&
            permissions.has(["ViewChannel", "SendMessages", "EmbedLinks"])
        );
    }

    async removeInvalidConfig(configId) {
        try {
            await WelcomeConfig.findByIdAndDelete(configId);
            console.log(`[WelcomeManager] Removed invalid config ${configId}`);
        } catch (error) {
            console.error(`[WelcomeManager] Error removing invalid config:`, error);
        }
    }

    getStatistics() {
        return {
            ...this.statistics,
            processingQueue: this.processingQueue.size,
            activeCooldowns: this.cooldowns.size,
        };
    }

    reset() {
        this.processingQueue.clear();
        this.cooldowns.clear();
        welcomeCache.clear();
        console.log("[WelcomeManager] Reset complete");
    }

    async testConfig(config, member) {
        try {
            const embed = await embedBuilder.buildWelcomeEmbed(config, member);
            return {
                success: true,
                embed: embed,
                message: "Konfiguracja jest prawidłowa",
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: "Błąd w konfiguracji",
            };
        }
    }
}

const welcomeManager = new WelcomeManager();

module.exports = welcomeManager;
