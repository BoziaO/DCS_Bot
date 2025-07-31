const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require("discord.js");
const {performanceMonitor} = require("../../utils/performance");
const {cache} = require("../../utils/cache");
const {dbService} = require("../../utils/database");
const {cooldownManager} = require("../../utils/cooldown");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("performance")
        .setDescription(
            "🔧 Display detailed bot performance metrics and system health"
        )
        .addStringOption((option) =>
            option
                .setName("type")
                .setDescription("Type of performance data to display")
                .addChoices(
                    {
                        name: "📊 Overview - General performance metrics",
                        value: "overview",
                    },
                    {
                        name: "💾 Database - Database performance stats",
                        value: "database",
                    },
                    {name: "🗄️ Cache - Cache hit rates and statistics", value: "cache"},
                    {
                        name: "⚡ Commands - Command execution statistics",
                        value: "commands",
                    },
                    {name: "🔄 Events - Event processing statistics", value: "events"},
                    {
                        name: "⏰ Cooldowns - Cooldown system statistics",
                        value: "cooldowns",
                    },
                    {name: "🖥️ System - System resource usage", value: "system"}
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        try {
            await interaction.deferReply({ephemeral: true});

            const type = interaction.options.getString("type") || "overview";
            let embed;

            switch (type) {
                case "overview":
                    embed = await createOverviewEmbed();
                    break;
                case "database":
                    embed = await createDatabaseEmbed();
                    break;
                case "cache":
                    embed = createCacheEmbed();
                    break;
                case "commands":
                    embed = createCommandsEmbed();
                    break;
                case "events":
                    embed = createEventsEmbed();
                    break;
                case "cooldowns":
                    embed = createCooldownsEmbed();
                    break;
                case "system":
                    embed = createSystemEmbed();
                    break;
                default:
                    embed = await createOverviewEmbed();
            }

            await interaction.editReply({embeds: [embed]});
        } catch (error) {
            console.error("Error in performance command:", error);

            const errorEmbed = new EmbedBuilder()
                .setColor("#ff6b6b")
                .setTitle("❌ Performance Command Error")
                .setDescription("An error occurred while retrieving performance data.")
                .addFields({
                    name: "Error Details",
                    value: `\`\`\`${error.message}\`\`\``,
                    inline: false,
                })
                .setTimestamp();

            if (interaction.deferred) {
                await interaction.editReply({embeds: [errorEmbed]});
            } else {
                await interaction.reply({embeds: [errorEmbed], ephemeral: true});
            }
        }
    },
};

async function createOverviewEmbed() {
    const systemInfo = performanceMonitor.getSystemInfo();
    const dbStats = dbService.getStats();
    const cacheStats = cache.getStats();
    const uptime = process.uptime();

    const embed = new EmbedBuilder()
        .setColor("#00d4aa")
        .setTitle("📊 Bot Performance Overview")
        .setDescription(
            "Comprehensive performance metrics and system health status"
        )
        .addFields(
            {
                name: "⏱️ **Uptime**",
                value: `${formatUptime(uptime)}`,
                inline: true,
            },
            {
                name: "💾 **Memory Usage**",
                value: `${Math.round(
                    systemInfo.memory.heapUsed / 1024 / 1024
                )}MB / ${Math.round(systemInfo.memory.heapTotal / 1024 / 1024)}MB`,
                inline: true,
            },
            {
                name: "🗄️ **Cache Hit Rate**",
                value: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
                inline: true,
            },
            {
                name: "🔗 **Database Status**",
                value: dbStats.isConnected ? "✅ Connected" : "❌ Disconnected",
                inline: true,
            },
            {
                name: "📊 **Total Queries**",
                value: `${dbStats.queryStats.total}`,
                inline: true,
            },
            {
                name: "⚡ **Cache Size**",
                value: `${cacheStats.size}/${cacheStats.maxSize}`,
                inline: true,
            }
        )
        .setFooter({text: "Performance data updated in real-time"})
        .setTimestamp();

    return embed;
}

async function createDatabaseEmbed() {
    const dbStats = dbService.getStats();
    const healthCheck = await dbService.healthCheck();

    const embed = new EmbedBuilder()
        .setColor(dbStats.isConnected ? "#00d4aa" : "#ff6b6b")
        .setTitle("💾 Database Performance")
        .setDescription("Detailed database connection and query statistics")
        .addFields(
            {
                name: "🔗 **Connection Status**",
                value: `${dbStats.isConnected ? "✅" : "❌"} ${
                    dbStats.connectionStates
                }`,
                inline: true,
            },
            {
                name: "📊 **Total Queries**",
                value: `${dbStats.queryStats.total}`,
                inline: true,
            },
            {
                name: "🗄️ **Cached Queries**",
                value: `${dbStats.queryStats.cached}`,
                inline: true,
            },
            {
                name: "❌ **Query Errors**",
                value: `${dbStats.queryStats.errors}`,
                inline: true,
            },
            {
                name: "⚡ **Cache Hit Rate**",
                value: `${
                    dbStats.queryStats.total > 0
                        ? (
                            (dbStats.queryStats.cached / dbStats.queryStats.total) *
                            100
                        ).toFixed(1)
                        : 0
                }%`,
                inline: true,
            },
            {
                name: "🏥 **Health Check**",
                value: `${healthCheck.status === "healthy" ? "✅" : "❌"} ${
                    healthCheck.status
                }`,
                inline: true,
            }
        )
        .setFooter({text: "Database performance metrics"})
        .setTimestamp();

    return embed;
}

function createCacheEmbed() {
    const cacheStats = cache.getStats();

    const embed = new EmbedBuilder()
        .setColor("#9b59b6")
        .setTitle("🗄️ Cache Performance")
        .setDescription("Cache utilization and hit rate statistics")
        .addFields(
            {
                name: "📊 **Cache Size**",
                value: `${cacheStats.size}/${cacheStats.maxSize} entries`,
                inline: true,
            },
            {
                name: "🎯 **Hit Rate**",
                value: `${(cacheStats.hitRate * 100).toFixed(1)}%`,
                inline: true,
            },
            {
                name: "✅ **Cache Hits**",
                value: `${cacheStats.hits}`,
                inline: true,
            },
            {
                name: "❌ **Cache Misses**",
                value: `${cacheStats.misses}`,
                inline: true,
            },
            {
                name: "📈 **Utilization**",
                value: `${((cacheStats.size / cacheStats.maxSize) * 100).toFixed(1)}%`,
                inline: true,
            },
            {
                name: "🔄 **Total Requests**",
                value: `${cacheStats.hits + cacheStats.misses}`,
                inline: true,
            }
        )
        .setFooter({text: "Cache performance metrics"})
        .setTimestamp();

    return embed;
}

function createCommandsEmbed() {
    const topCommands = performanceMonitor.getTopCommands(10);

    const embed = new EmbedBuilder()
        .setColor("#3498db")
        .setTitle("⚡ Command Performance")
        .setDescription("Most used commands and their execution statistics");

    if (topCommands.length > 0) {
        const commandList = topCommands
            .map((cmd, index) => {
                const errorRate =
                    cmd.executions > 0
                        ? ((cmd.errors / cmd.executions) * 100).toFixed(1)
                        : "0.0";
                return (
                    `**${index + 1}.** \`/${cmd.name}\`\n` +
                    `   📊 ${cmd.executions} uses | ⏱️ ${Math.round(
                        cmd.avgTime
                    )}ms avg | ❌ ${errorRate}% errors`
                );
            })
            .join("\n\n");

        embed.addFields({
            name: "🏆 **Top Commands**",
            value: commandList,
            inline: false,
        });
    } else {
        embed.addFields({
            name: "📊 **Command Statistics**",
            value: "No command data available yet.",
            inline: false,
        });
    }

    embed.setFooter({text: "Command execution statistics"}).setTimestamp();

    return embed;
}

function createEventsEmbed() {
    const topEvents = performanceMonitor.getTopEvents(10);

    const embed = new EmbedBuilder()
        .setColor("#e67e22")
        .setTitle("🔄 Event Performance")
        .setDescription("Most processed events and their execution statistics");

    if (topEvents.length > 0) {
        const eventList = topEvents
            .map((event, index) => {
                const errorRate =
                    event.executions > 0
                        ? ((event.errors / event.executions) * 100).toFixed(1)
                        : "0.0";
                return (
                    `**${index + 1}.** \`${event.name}\`\n` +
                    `   📊 ${event.executions} processes | ⏱️ ${Math.round(
                        event.avgTime
                    )}ms avg | ❌ ${errorRate}% errors`
                );
            })
            .join("\n\n");

        embed.addFields({
            name: "🏆 **Top Events**",
            value: eventList,
            inline: false,
        });
    } else {
        embed.addFields({
            name: "📊 **Event Statistics**",
            value: "No event data available yet.",
            inline: false,
        });
    }

    embed.setFooter({text: "Event processing statistics"}).setTimestamp();

    return embed;
}

function createCooldownsEmbed() {
    const cooldownStats = cooldownManager.getStats();

    const embed = new EmbedBuilder()
        .setColor("#f39c12")
        .setTitle("⏰ Cooldown System")
        .setDescription("Cooldown system statistics and active restrictions")
        .addFields(
            {
                name: "📊 **Total Cooldowns Set**",
                value: `${cooldownStats.totalCooldowns}`,
                inline: true,
            },
            {
                name: "⏳ **Currently Active**",
                value: `${cooldownStats.activeCooldowns}`,
                inline: true,
            },
            {
                name: "📈 **Efficiency**",
                value: `${
                    cooldownStats.totalCooldowns > 0
                        ? (
                            (cooldownStats.activeCooldowns / cooldownStats.totalCooldowns) *
                            100
                        ).toFixed(1)
                        : 0
                }%`,
                inline: true,
            }
        );

    if (Object.keys(cooldownStats.commandStats).length > 0) {
        const commandCooldowns = Object.entries(cooldownStats.commandStats)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 5)
            .map(([cmd, count]) => `\`${cmd}\`: ${count} active`)
            .join("\n");

        embed.addFields({
            name: "🔥 **Most Active Cooldowns**",
            value: commandCooldowns,
            inline: false,
        });
    }

    embed.setFooter({text: "Cooldown system statistics"}).setTimestamp();

    return embed;
}

function createSystemEmbed() {
    const systemInfo = performanceMonitor.getSystemInfo();
    const uptime = process.uptime();

    const embed = new EmbedBuilder()
        .setColor("#2c3e50")
        .setTitle("🖥️ System Performance")
        .setDescription("System resource usage and environment information")
        .addFields(
            {
                name: "⏱️ **Process Uptime**",
                value: formatUptime(uptime),
                inline: true,
            },
            {
                name: "🔧 **Node.js Version**",
                value: systemInfo.nodeVersion,
                inline: true,
            },
            {
                name: "💻 **Platform**",
                value: `${systemInfo.platform} (${systemInfo.arch})`,
                inline: true,
            },
            {
                name: "💾 **Memory Usage**",
                value:
                    `**Heap:** ${Math.round(
                        systemInfo.memory.heapUsed / 1024 / 1024
                    )}MB / ${Math.round(systemInfo.memory.heapTotal / 1024 / 1024)}MB\n` +
                    `**RSS:** ${Math.round(systemInfo.memory.rss / 1024 / 1024)}MB\n` +
                    `**External:** ${Math.round(
                        systemInfo.memory.external / 1024 / 1024
                    )}MB`,
                inline: true,
            },
            {
                name: "🖥️ **System Memory**",
                value:
                    `**Total:** ${Math.round(
                        systemInfo.system.totalMemory / 1024 / 1024 / 1024
                    )}GB\n` +
                    `**Free:** ${Math.round(
                        systemInfo.system.freeMemory / 1024 / 1024 / 1024
                    )}GB\n` +
                    `**Used:** ${Math.round(
                        (systemInfo.system.totalMemory - systemInfo.system.freeMemory) /
                        1024 /
                        1024 /
                        1024
                    )}GB`,
                inline: true,
            },
            {
                name: "⚡ **CPU Info**",
                value:
                    `**Cores:** ${systemInfo.system.cpuCount}\n` +
                    `**Load Avg:** ${systemInfo.system.loadAverage
                        .map((load) => load.toFixed(2))
                        .join(", ")}`,
                inline: true,
            }
        )
        .setFooter({text: "System resource information"})
        .setTimestamp();

    return embed;
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(" ");
}
