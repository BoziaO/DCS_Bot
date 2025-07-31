const {Events} = require("discord.js");
const welcomeManager = require("../utils/welcome/welcomeManager");
const {performanceMonitor} = require("../utils/performance");

module.exports = {
    name: Events.GuildMemberRemove,
    once: false,
    async execute(guildMember) {
        const start = process.hrtime.bigint();
        let success = true;
        let error = null;

        try {
            await welcomeManager.processLeavingMember(guildMember);
        } catch (err) {
            success = false;
            error = err;
            console.error(
                `[GuildMemberRemove] Error processing leaving member ${guildMember.user.tag}:`,
                err
            );

            console.error("Guild:", guildMember.guild?.name || "Unknown");
            console.error("User:", guildMember.user?.tag || "Unknown");
            console.error("Stack:", err.stack);
        } finally {
            const end = process.hrtime.bigint();
            const executionTime = Number(end - start) / 1000000;

            performanceMonitor.trackEvent(
                "guildMemberRemove",
                executionTime,
                success,
                error
            );

            if (executionTime > 3000) {
                console.warn(
                    `[GuildMemberRemove] Slow execution: ${executionTime}ms for ${guildMember.user.tag}`
                );
            }
        }
    },
};
