const {Events} = require("discord.js");
const welcomeManager = require("../utils/welcome/welcomeManager");
const {performanceMonitor} = require("../utils/performance");

module.exports = {
    name: Events.GuildMemberAdd,
    once: false,
    async execute(guildMember) {
        const start = process.hrtime.bigint();
        let success = true;
        let error = null;

        try {
            await welcomeManager.processNewMember(guildMember);
        } catch (err) {
            success = false;
            error = err;
            console.error(
                `[GuildMemberAdd] Error processing new member ${guildMember.user.tag}:`,
                err
            );

            console.error("Guild:", guildMember.guild?.name || "Unknown");
            console.error("User:", guildMember.user?.tag || "Unknown");
            console.error("Stack:", err.stack);
        } finally {
            const end = process.hrtime.bigint();
            const executionTime = Number(end - start) / 1000000;

            performanceMonitor.trackEvent(
                "guildMemberAdd",
                executionTime,
                success,
                error
            );

            if (executionTime > 5000) {
                console.warn(
                    `[GuildMemberAdd] Slow execution: ${executionTime}ms for ${guildMember.user.tag}`
                );
            }
        }
    },
};
