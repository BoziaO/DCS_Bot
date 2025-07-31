const {EmbedBuilder} = require("discord.js");
const VerificationStat = require("../../models/VerificationStat");
const {dbService} = require("../database");

class VerificationStats {
    constructor() {
    }

    static getInstance() {
        if (!this.instance) {
            this.instance = new VerificationStats();
        }
        return this.instance;
    }

    async recordVerification(guildId, userId, data) {
        try {
            const now = new Date();

            const record = {
                userId,
                guildId,
                timestamp: now,
                method: data.method || "basic",
                timeTaken: data.timeTaken || 0,
                challengeType: data.challengeType || null,
                score: data.score || null,
                theme: data.theme || "classic",
            };

            await VerificationStat.create(record);

            await this.updateGuildStats(guildId, record);

            return true;
        } catch (error) {
            console.error("Error recording verification:", error);
            return false;
        }
    }

    async updateGuildStats(guildId, record) {
        try {
            let guildStats = await VerificationStat.findOne({
                guildId: guildId,
                isGuildStat: true,
            });

            const today = new Date().toDateString();

            if (!guildStats) {
                guildStats = new VerificationStat({
                    guildId: guildId,
                    isGuildStat: true,
                    totalVerifications: 1,
                    challengeCompletions: record.method === "challenge" ? 1 : 0,
                    fastestTime: record.timeTaken > 0 ? record.timeTaken : undefined,
                    slowestTime: record.timeTaken > 0 ? record.timeTaken : undefined,
                    methodStats: {
                        basic: record.method === "basic" ? 1 : 0,
                        challenge: record.method === "challenge" ? 1 : 0,
                        speed: record.method === "speed" ? 1 : 0,
                    },
                    popularTheme: {[record.theme]: 1},
                    dailyVerifications: {[today]: 1},
                });
            } else {
                guildStats.totalVerifications++;
                guildStats.methodStats[record.method]++;

                if (record.method === "challenge") {
                    guildStats.challengeCompletions++;
                }

                if (record.timeTaken > 0) {
                    if (
                        !guildStats.fastestTime ||
                        record.timeTaken < guildStats.fastestTime
                    ) {
                        guildStats.fastestTime = record.timeTaken;
                    }

                    if (
                        !guildStats.slowestTime ||
                        record.timeTaken > guildStats.slowestTime
                    ) {
                        guildStats.slowestTime = record.timeTaken;
                    }
                }

                const themeCount = guildStats.popularTheme.get(record.theme) || 0;
                guildStats.popularTheme.set(record.theme, themeCount + 1);

                const dailyCount = guildStats.dailyVerifications.get(today) || 0;
                guildStats.dailyVerifications.set(today, dailyCount + 1);
            }

            await guildStats.save();

            return true;
        } catch (error) {
            console.error("Error updating guild stats:", error);
            return false;
        }
    }

    async getGuildStats(guildId) {
        try {
            const guildStats = await VerificationStat.findOne({
                guildId: guildId,
                isGuildStat: true,
            });

            if (!guildStats) {
                return {
                    totalVerifications: 0,
                    challengeCompletions: 0,
                    averageTime: 0,
                    fastestTime: 0,
                    slowestTime: 0,
                    popularTheme: {},
                    dailyVerifications: {},
                    methodStats: {
                        basic: 0,
                        challenge: 0,
                        speed: 0,
                    },
                };
            }

            return {
                totalVerifications: guildStats.totalVerifications || 0,
                challengeCompletions: guildStats.challengeCompletions || 0,
                averageTime: 0,
                fastestTime: guildStats.fastestTime || 0,
                slowestTime: guildStats.slowestTime || 0,
                popularTheme: guildStats.popularTheme
                    ? guildStats.popularTheme.toObject()
                    : {},
                dailyVerifications: guildStats.dailyVerifications
                    ? guildStats.dailyVerifications.toObject()
                    : {},
                methodStats: guildStats.methodStats || {
                    basic: 0,
                    challenge: 0,
                    speed: 0,
                },
            };
        } catch (error) {
            console.error("Error fetching guild stats:", error);
            return {
                totalVerifications: 0,
                challengeCompletions: 0,
                averageTime: 0,
                fastestTime: 0,
                slowestTime: 0,
                popularTheme: {},
                dailyVerifications: {},
                methodStats: {
                    basic: 0,
                    challenge: 0,
                    speed: 0,
                },
            };
        }
    }

    async getUserStats(guildId, userId) {
        try {
            const userStats = await VerificationStat.findOne({
                guildId: guildId,
                userId: userId,
                isGuildStat: {$ne: true},
            });
            return userStats || null;
        } catch (error) {
            console.error("Error fetching user stats:", error);
            return null;
        }
    }

    async createStatsEmbed(guildId, guild) {
        const stats = await this.getGuildStats(guildId);
        const today = new Date().toDateString();
        const todayCount = stats.dailyVerifications[today] || 0;

        let popularTheme = "classic";
        let maxCount = 0;
        for (const [theme, count] of Object.entries(stats.popularTheme)) {
            if (count > maxCount) {
                maxCount = count;
                popularTheme = theme;
            }
        }

        const embed = new EmbedBuilder()
            .setTitle("📊 Statystyki Weryfikacji")
            .setDescription(`**Statystyki serwera ${guild.name}**`)
            .setColor("#4A90E2")
            .setThumbnail(guild.iconURL())
            .setTimestamp();

        embed.addFields(
            {
                name: "📈 Ogólne Statystyki",
                value: `• **Łączne weryfikacje:** ${stats.totalVerifications}\n• **Dzisiaj:** ${todayCount}\n• **Ukończone wyzwania:** ${stats.challengeCompletions}`,
                inline: true,
            },
            {
                name: "⏱️ Statystyki Czasowe",
                value: `• **Najszybsza:** ${
                    stats.fastestTime === Infinity ? "Brak" : stats.fastestTime + "s"
                }\n• **Najwolniejsza:** ${
                    stats.slowestTime
                }s\n• **Średnia:** ${this.calculateAverageTime(stats)}s`,
                inline: true,
            },
            {
                name: "🎨 Popularność Motywów",
                value: `• **Najpopularniejszy:** ${this.getThemeName(
                    popularTheme
                )}\n• **Użyć:** ${maxCount}`,
                inline: true,
            },
            {
                name: "📋 Metody Weryfikacji",
                value: `• **Podstawowa:** ${stats.methodStats.basic}\n• **Wyzwanie:** ${stats.methodStats.challenge}\n• **Szybka:** ${stats.methodStats.speed}`,
                inline: true,
            }
        );

        const weeklyTrend = this.getWeeklyTrend(stats.dailyVerifications);
        if (weeklyTrend.length > 0) {
            embed.addFields({
                name: "📅 Trend Tygodniowy",
                value: weeklyTrend
                    .map((day) => `• **${day.date}:** ${day.count}`)
                    .join("\n"),
                inline: false,
            });
        }

        embed.setFooter({text: "Statystyki aktualizowane w czasie rzeczywistym"});

        return embed;
    }

    calculateAverageTime(stats) {
        if (stats.totalVerifications === 0) return 0;

        return Math.round((stats.fastestTime + stats.slowestTime) / 2);
    }

    getThemeName(themeKey) {
        const themeNames = {
            classic: "👻 Klasyczny",
            investigator: "🔍 Investigator",
            dark: "🌙 Darkness",
            haunted: "🏚️ Haunted House",
            asylum: "🏥 Asylum",
            school: "🏫 School",
        };
        return themeNames[themeKey] || themeKey;
    }

    getWeeklyTrend(dailyVerifications) {
        const trend = [];
        const today = new Date();

        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateString = date.toDateString();
            const count = dailyVerifications[dateString] || 0;

            trend.push({
                date: date.toLocaleDateString("pl-PL", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                }),
                count: count,
            });
        }

        return trend;
    }

    async getTopVerifiers(guildId, limit = 10) {
        try {
            const verifiers = await VerificationStat.find({
                guildId: guildId,
                isGuildStat: {$ne: true},
            })
                .sort({timestamp: 1})
                .limit(limit);

            return verifiers;
        } catch (error) {
            console.error("Error fetching top verifiers:", error);
            return [];
        }
    }

    async createLeaderboardEmbed(guildId, guild) {
        const topVerifiers = await this.getTopVerifiers(guildId, 10);

        if (topVerifiers.length === 0) {
            return new EmbedBuilder()
                .setTitle("🏆 Ranking Investigatorów")
                .setDescription("Brak danych do wyświetlenia.")
                .setColor("#FFA500");
        }

        const embed = new EmbedBuilder()
            .setTitle("🏆 Ranking Investigatorów")
            .setDescription(`**Pierwsi investigatorzy na ${guild.name}**`)
            .setColor("#FFD700")
            .setThumbnail(guild.iconURL())
            .setTimestamp();

        const leaderboard = topVerifiers
            .map((record, index) => {
                const medal = index < 3 ? ["🥇", "🥈", "🥉"][index] : `${index + 1}.`;
                const method =
                    record.method === "challenge"
                        ? "🏆"
                        : record.method === "speed"
                            ? "⚡"
                            : "🎯";
                const time = record.timeTaken > 0 ? ` (${record.timeTaken}s)` : "";

                return `${medal} <@${record.userId}> ${method}${time}`;
            })
            .join("\n");

        embed.addFields({
            name: "👥 Top Investigatorzy",
            value: leaderboard,
            inline: false,
        });

        embed.setFooter({text: "Ranking oparty na kolejności weryfikacji"});

        return embed;
    }

    async cleanOldData(daysToKeep = 30) {
        try {
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

            await VerificationStat.deleteMany({
                timestamp: {$lt: cutoffDate},
                isGuildStat: {$ne: true},
            });

            console.log(`Cleaned verification data older than ${daysToKeep} days`);
        } catch (error) {
            console.error("Error cleaning old verification data:", error);
        }
    }
}

module.exports = VerificationStats;
