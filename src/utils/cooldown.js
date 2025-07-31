const {cache} = require("./cache");

class CooldownManager {
    constructor() {
        this.globalCooldowns = new Map();
        this.userCooldowns = new Map();
        this.commandCooldowns = {
            profile: 3000,
            hunt: 5000,
            investigate: 10000,
            daily: 86400000,
            work: 3600000,
            shop: 2000,
            inventory: 2000,
            rank: 3000,
            leaderboard: 5000,
            help: 1000,
            ping: 1000,
        };
    }

    isOnCooldown(userId, commandName) {
        return cache.hasCooldown(userId, commandName);
    }

    setCooldown(userId, commandName, customDuration = null) {
        const duration =
            customDuration || this.commandCooldowns[commandName] || 5000;
        return cache.setCooldown(userId, commandName, duration);
    }

    getRemainingCooldown(userId, commandName) {
        const key = `cooldown:${userId}:${commandName}`;
        const ttl = cache.ttlCache.get(key);

        if (!ttl) return 0;

        const remaining = ttl - Date.now();
        return remaining > 0 ? remaining : 0;
    }

    formatCooldownTime(milliseconds) {
        if (milliseconds < 1000) {
            return `${Math.ceil(milliseconds)}ms`;
        }

        const seconds = Math.ceil(milliseconds / 1000);
        if (seconds < 60) {
            return `${seconds}s`;
        }

        const minutes = Math.ceil(seconds / 60);
        if (minutes < 60) {
            return `${minutes}m`;
        }

        const hours = Math.ceil(minutes / 60);
        return `${hours}h`;
    }

    createCooldownEmbed(userId, commandName, remainingTime) {
        const {EmbedBuilder} = require("discord.js");

        return new EmbedBuilder()
            .setColor("#ff6b6b")
            .setTitle("⏰ Cooldown Active")
            .setDescription(
                `You need to wait **${this.formatCooldownTime(
                    remainingTime
                )}** before using \`/${commandName}\` again.`
            )
            .setFooter({text: "Cooldowns prevent spam and improve bot performance"})
            .setTimestamp();
    }

    async handleCooldown(interaction) {
        const userId = interaction.user.id;
        const commandName = interaction.commandName;

        if (this.isOnCooldown(userId, commandName)) {
            const remaining = this.getRemainingCooldown(userId, commandName);
            const cooldownEmbed = this.createCooldownEmbed(
                userId,
                commandName,
                remaining
            );

            await interaction.reply({
                embeds: [cooldownEmbed],
                ephemeral: true,
            });

            return true;
        }

        this.setCooldown(userId, commandName);
        return false;
    }

    setCommandCooldown(commandName, duration) {
        this.commandCooldowns[commandName] = duration;
    }

    getStats() {
        const stats = {
            totalCooldowns: 0,
            activeCooldowns: 0,
            commandStats: {},
        };

        for (const [key] of cache.cache.entries()) {
            if (key.startsWith("cooldown:")) {
                stats.totalCooldowns++;
                if (cache.has(key)) {
                    stats.activeCooldowns++;

                    const parts = key.split(":");
                    const commandName = parts[2];

                    if (!stats.commandStats[commandName]) {
                        stats.commandStats[commandName] = 0;
                    }
                    stats.commandStats[commandName]++;
                }
            }
        }

        return stats;
    }

    clearUserCooldowns(userId) {
        const keysToDelete = [];

        for (const [key] of cache.cache.entries()) {
            if (key.startsWith(`cooldown:${userId}:`)) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            cache.delete(key);
        }

        return keysToDelete.length;
    }

    clearCommandCooldowns(commandName) {
        const keysToDelete = [];

        for (const [key] of cache.cache.entries()) {
            if (key.endsWith(`:${commandName}`)) {
                keysToDelete.push(key);
            }
        }

        for (const key of keysToDelete) {
            cache.delete(key);
        }

        return keysToDelete.length;
    }
}

const cooldownManager = new CooldownManager();

module.exports = {
    cooldownManager,
    CooldownManager,
};
