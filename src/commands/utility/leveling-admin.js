const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require("discord.js");
const Profile = require("../../models/Profile");
const Achievement = require("../../models/Achievement");
const Challenge = require("../../models/Challenge");
const UserAchievement = require("../../models/UserAchievement");
const UserChallenge = require("../../models/UserChallenge");
const {
    initializeDefaultAchievements,
    removeDefaultAchievements,
    getAchievementStats,
} = require("../../utils/leveling/defaultAchievements");
const XpMultiplier = require("../../utils/leveling/xpMultiplier");
const levelingCache = require("../../utils/leveling/levelingCache");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leveling-admin")
        .setDescription("Zarządzaj systemem levelowania (tylko administratorzy)")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommandGroup((group) =>
            group
                .setName("achievements")
                .setDescription("Zarządzaj osiągnięciami")
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("init")
                        .setDescription("Zainicjalizuj domyślne osiągnięcia")
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("stats")
                        .setDescription("Sprawdź statystyki osiągnięć")
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("grant")
                        .setDescription("Nadaj osiągnięcie użytkownikowi")
                        .addUserOption((option) =>
                            option
                                .setName("user")
                                .setDescription("Użytkownik")
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName("achievement_id")
                                .setDescription("ID osiągnięcia")
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("remove")
                        .setDescription("Usuń osiągnięcie od użytkownika")
                        .addUserOption((option) =>
                            option
                                .setName("user")
                                .setDescription("Użytkownik")
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName("achievement_id")
                                .setDescription("ID osiągnięcia")
                                .setRequired(true)
                        )
                )
        )
        .addSubcommandGroup((group) =>
            group
                .setName("xp")
                .setDescription("Zarządzaj XP")
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("add")
                        .setDescription("Dodaj XP użytkownikowi")
                        .addUserOption((option) =>
                            option
                                .setName("user")
                                .setDescription("Użytkownik")
                                .setRequired(true)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("amount")
                                .setDescription("Ilość XP do dodania")
                                .setMinValue(1)
                                .setMaxValue(100000)
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("remove")
                        .setDescription("Usuń XP użytkownikowi")
                        .addUserOption((option) =>
                            option
                                .setName("user")
                                .setDescription("Użytkownik")
                                .setRequired(true)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("amount")
                                .setDescription("Ilość XP do usunięcia")
                                .setMinValue(1)
                                .setMaxValue(100000)
                                .setRequired(true)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("set")
                        .setDescription("Ustaw XP użytkownika")
                        .addUserOption((option) =>
                            option
                                .setName("user")
                                .setDescription("Użytkownik")
                                .setRequired(true)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("amount")
                                .setDescription("Nowa ilość XP")
                                .setMinValue(0)
                                .setMaxValue(1000000)
                                .setRequired(true)
                        )
                )
        )
        .addSubcommandGroup((group) =>
            group
                .setName("boosters")
                .setDescription("Zarządzaj boosterami XP")
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("give")
                        .setDescription("Daj booster XP użytkownikowi")
                        .addUserOption((option) =>
                            option
                                .setName("user")
                                .setDescription("Użytkownik")
                                .setRequired(true)
                        )
                        .addNumberOption((option) =>
                            option
                                .setName("multiplier")
                                .setDescription("Mnożnik (np. 2.0)")
                                .setMinValue(1.1)
                                .setMaxValue(10.0)
                                .setRequired(true)
                        )
                        .addIntegerOption((option) =>
                            option
                                .setName("duration")
                                .setDescription("Czas trwania w minutach")
                                .setMinValue(1)
                                .setMaxValue(1440)
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName("name")
                                .setDescription("Nazwa boostera")
                                .setRequired(false)
                        )
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("remove")
                        .setDescription("Usuń booster XP użytkownikowi")
                        .addUserOption((option) =>
                            option
                                .setName("user")
                                .setDescription("Użytkownik")
                                .setRequired(true)
                        )
                        .addStringOption((option) =>
                            option
                                .setName("name")
                                .setDescription("Nazwa boostera do usunięcia")
                                .setRequired(true)
                        )
                )
        )
        .addSubcommandGroup((group) =>
            group
                .setName("cache")
                .setDescription("Zarządzaj cache systemu levelowania")
                .addSubcommand((subcommand) =>
                    subcommand.setName("stats").setDescription("Sprawdź statystyki cache")
                )
                .addSubcommand((subcommand) =>
                    subcommand
                        .setName("clear")
                        .setDescription("Wyczyść cache")
                        .addStringOption((option) =>
                            option
                                .setName("type")
                                .setDescription("Typ cache do wyczyszczenia")
                                .addChoices(
                                    {name: "Wszystko", value: "all"},
                                    {name: "Profile", value: "profiles"},
                                    {name: "Rankingi", value: "leaderboards"},
                                    {name: "Konfiguracja", value: "config"},
                                    {name: "Statystyki", value: "stats"}
                                )
                                .setRequired(false)
                        )
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("stats")
                .setDescription("Sprawdź ogólne statystyki systemu levelowania")
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();

        try {
            if (group === "achievements") {
                await this.handleAchievements(interaction, subcommand);
            } else if (group === "xp") {
                await this.handleXp(interaction, subcommand);
            } else if (group === "boosters") {
                await this.handleBoosters(interaction, subcommand);
            } else if (group === "cache") {
                await this.handleCache(interaction, subcommand);
            } else if (subcommand === "stats") {
                await this.handleGeneralStats(interaction);
            }
        } catch (error) {
            console.error("Błąd w leveling-admin:", error);

            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Błąd")
                .setDescription(
                    `Wystąpił błąd podczas wykonywania komendy: ${error.message}`
                )
                .setColor("#e74c3c")
                .setTimestamp();

            await interaction.editReply({embeds: [errorEmbed]});
        }
    },

    async handleAchievements(interaction, subcommand) {
        if (subcommand === "init") {
            const result = await initializeDefaultAchievements();

            const embed = new EmbedBuilder()
                .setTitle("✅ Osiągnięcia zainicjalizowane")
                .setDescription(`Pomyślnie zainicjalizowano domyślne osiągnięcia`)
                .addFields([
                    {
                        name: "🆕 Utworzone",
                        value: result.created.toString(),
                        inline: true,
                    },
                    {
                        name: "🔄 Zaktualizowane",
                        value: result.updated.toString(),
                        inline: true,
                    },
                    {name: "📊 Łącznie", value: result.total.toString(), inline: true},
                ])
                .setColor("#27ae60")
                .setTimestamp();

            await interaction.editReply({embeds: [embed]});
        } else if (subcommand === "stats") {
            const stats = await getAchievementStats();

            const categoryText =
                Object.entries(stats.byCategory)
                    .map(([category, count]) => `${category}: ${count}`)
                    .join("\n") || "Brak danych";

            const rarityText =
                Object.entries(stats.byRarity)
                    .map(([rarity, count]) => `${rarity}: ${count}`)
                    .join("\n") || "Brak danych";

            const embed = new EmbedBuilder()
                .setTitle("📊 Statystyki Osiągnięć")
                .addFields([
                    {
                        name: "🏆 Łączna liczba",
                        value: stats.total.toString(),
                        inline: true,
                    },
                    {name: "📂 Według kategorii", value: categoryText, inline: true},
                    {name: "💎 Według rzadkości", value: rarityText, inline: true},
                ])
                .setColor("#3498db")
                .setTimestamp();

            await interaction.editReply({embeds: [embed]});
        } else if (subcommand === "grant") {
            const user = interaction.options.getUser("user");
            const achievementId = interaction.options.getString("achievement_id");

            const achievement = await Achievement.findOne({id: achievementId});
            if (!achievement) {
                return interaction.editReply({
                    content: `❌ Nie znaleziono osiągnięcia o ID: ${achievementId}`,
                });
            }

            const existing = await UserAchievement.findOne({
                userId: user.id,
                guildId: interaction.guild.id,
                achievementId: achievementId,
            });

            if (existing) {
                return interaction.editReply({
                    content: `❌ Użytkownik ${user.displayName} już ma to osiągnięcie!`,
                });
            }

            const userAchievement = new UserAchievement({
                userId: user.id,
                guildId: interaction.guild.id,
                achievementId: achievementId,
            });
            await userAchievement.save();

            const profile = await Profile.findOne({
                userId: user.id,
                guildId: interaction.guild.id,
            });
            if (profile) {
                if (!profile.achievements) profile.achievements = [];
                profile.achievements.push(achievementId);
                profile.achievementPoints =
                    (profile.achievementPoints || 0) + achievement.points;
                await profile.save();
            }

            await Achievement.findOneAndUpdate(
                {id: achievementId},
                {$inc: {unlockedBy: 1}}
            );

            const embed = new EmbedBuilder()
                .setTitle("✅ Osiągnięcie nadane")
                .setDescription(
                    `Pomyślnie nadano osiągnięcie **${achievement.name}** użytkownikowi ${user}`
                )
                .addFields([
                    {
                        name: "🏆 Osiągnięcie",
                        value: `${achievement.emoji} ${achievement.name}`,
                        inline: true,
                    },
                    {
                        name: "⭐ Punkty",
                        value: achievement.points.toString(),
                        inline: true,
                    },
                    {name: "👤 Użytkownik", value: user.displayName, inline: true},
                ])
                .setColor("#27ae60")
                .setTimestamp();

            await interaction.editReply({embeds: [embed]});
        } else if (subcommand === "remove") {
            const user = interaction.options.getUser("user");
            const achievementId = interaction.options.getString("achievement_id");

            const userAchievement = await UserAchievement.findOneAndDelete({
                userId: user.id,
                guildId: interaction.guild.id,
                achievementId: achievementId,
            });

            if (!userAchievement) {
                return interaction.editReply({
                    content: `❌ Użytkownik ${user.displayName} nie ma tego osiągnięcia!`,
                });
            }

            const profile = await Profile.findOne({
                userId: user.id,
                guildId: interaction.guild.id,
            });
            if (profile && profile.achievements) {
                profile.achievements = profile.achievements.filter(
                    (id) => id !== achievementId
                );

                const achievement = await Achievement.findOne({id: achievementId});
                if (achievement) {
                    profile.achievementPoints = Math.max(
                        0,
                        (profile.achievementPoints || 0) - achievement.points
                    );
                }

                await profile.save();
            }

            const embed = new EmbedBuilder()
                .setTitle("✅ Osiągnięcie usunięte")
                .setDescription(`Pomyślnie usunięto osiągnięcie użytkownikowi ${user}`)
                .setColor("#e67e22")
                .setTimestamp();

            await interaction.editReply({embeds: [embed]});
        }
    },

    async handleXp(interaction, subcommand) {
        const user = interaction.options.getUser("user");
        const amount = interaction.options.getInteger("amount");

        const profile = await Profile.findOne({
            userId: user.id,
            guildId: interaction.guild.id,
        });
        if (!profile) {
            return interaction.editReply({
                content: `❌ Użytkownik ${user.displayName} nie ma profilu!`,
            });
        }

        const oldXp = profile.xp || 0;
        let newXp = oldXp;

        if (subcommand === "add") {
            newXp = oldXp + amount;
        } else if (subcommand === "remove") {
            newXp = Math.max(0, oldXp - amount);
        } else if (subcommand === "set") {
            newXp = amount;
        }

        profile.xp = newXp;
        await profile.save();

        levelingCache.invalidateUser(user.id, interaction.guild.id);

        const embed = new EmbedBuilder()
            .setTitle("✅ XP zaktualizowane")
            .setDescription(`Pomyślnie zaktualizowano XP użytkownika ${user}`)
            .addFields([
                {
                    name: "📊 Poprzednie XP",
                    value: oldXp.toLocaleString(),
                    inline: true,
                },
                {name: "📈 Nowe XP", value: newXp.toLocaleString(), inline: true},
                {
                    name: "🔄 Zmiana",
                    value: `${newXp > oldXp ? "+" : ""}${(
                        newXp - oldXp
                    ).toLocaleString()}`,
                    inline: true,
                },
            ])
            .setColor("#3498db")
            .setTimestamp();

        await interaction.editReply({embeds: [embed]});
    },

    async handleBoosters(interaction, subcommand) {
        const user = interaction.options.getUser("user");

        if (subcommand === "give") {
            const multiplier = interaction.options.getNumber("multiplier");
            const duration = interaction.options.getInteger("duration");
            const name =
                interaction.options.getString("name") || `Admin Booster x${multiplier}`;

            const expiresAt = new Date();
            expiresAt.setMinutes(expiresAt.getMinutes() + duration);

            const success = await XpMultiplier.addXpBooster(
                user.id,
                interaction.guild.id,
                {
                    name: name,
                    description: `Booster nadany przez administratora`,
                    multiplier: multiplier,
                    expiresAt: expiresAt,
                }
            );

            if (!success) {
                return interaction.editReply({
                    content: "❌ Nie udało się dodać boostera!",
                });
            }

            const embed = new EmbedBuilder()
                .setTitle("✅ Booster nadany")
                .setDescription(`Pomyślnie nadano booster XP użytkownikowi ${user}`)
                .addFields([
                    {name: "🚀 Nazwa", value: name, inline: true},
                    {name: "📈 Mnożnik", value: `x${multiplier}`, inline: true},
                    {name: "⏰ Czas trwania", value: `${duration} minut`, inline: true},
                    {
                        name: "📅 Wygasa",
                        value: expiresAt.toLocaleString("pl-PL"),
                        inline: false,
                    },
                ])
                .setColor("#27ae60")
                .setTimestamp();

            await interaction.editReply({embeds: [embed]});
        } else if (subcommand === "remove") {
            const boosterName = interaction.options.getString("name");

            const success = await XpMultiplier.removeXpBooster(
                user.id,
                interaction.guild.id,
                boosterName
            );

            if (!success) {
                return interaction.editReply({
                    content: "❌ Nie udało się usunąć boostera!",
                });
            }

            const embed = new EmbedBuilder()
                .setTitle("✅ Booster usunięty")
                .setDescription(
                    `Pomyślnie usunięto booster **${boosterName}** użytkownikowi ${user}`
                )
                .setColor("#e67e22")
                .setTimestamp();

            await interaction.editReply({embeds: [embed]});
        }
    },

    async handleCache(interaction, subcommand) {
        if (subcommand === "stats") {
            const stats = levelingCache.getCacheStats();
            const memory = levelingCache.getMemoryUsage();

            const embed = new EmbedBuilder()
                .setTitle("📊 Statystyki Cache")
                .addFields([
                    {name: "🎯 Trafienia", value: stats.hits.toString(), inline: true},
                    {
                        name: "❌ Chybienia",
                        value: stats.misses.toString(),
                        inline: true,
                    },
                    {name: "📈 Wskaźnik trafień", value: stats.hitRate, inline: true},
                    {
                        name: "💾 Profile",
                        value: `${stats.profileCache.keys} kluczy`,
                        inline: true,
                    },
                    {
                        name: "🏆 Rankingi",
                        value: `${stats.leaderboardCache.keys} kluczy`,
                        inline: true,
                    },
                    {
                        name: "⚙️ Konfiguracja",
                        value: `${stats.configCache.keys} kluczy`,
                        inline: true,
                    },
                    {name: "🧠 Pamięć RSS", value: memory.rss, inline: true},
                    {name: "📊 Heap Used", value: memory.heapUsed, inline: true},
                    {name: "📈 Heap Total", value: memory.heapTotal, inline: true},
                ])
                .setColor("#9b59b6")
                .setTimestamp();

            await interaction.editReply({embeds: [embed]});
        } else if (subcommand === "clear") {
            const type = interaction.options.getString("type") || "all";

            if (type === "all") {
                levelingCache.clearAll();
            } else {
                levelingCache.optimize();
            }

            const embed = new EmbedBuilder()
                .setTitle("✅ Cache wyczyszczony")
                .setDescription(`Pomyślnie wyczyszczono cache: ${type}`)
                .setColor("#27ae60")
                .setTimestamp();

            await interaction.editReply({embeds: [embed]});
        }
    },

    async handleGeneralStats(interaction) {
        const totalProfiles = await Profile.countDocuments({
            guildId: interaction.guild.id,
        });
        const totalAchievements = await Achievement.countDocuments();
        const totalUserAchievements = await UserAchievement.countDocuments({
            guildId: interaction.guild.id,
        });
        const totalChallenges = await Challenge.countDocuments({
            $or: [{guildId: interaction.guild.id}, {guildId: null}],
        });

        const topUsers = await Profile.find({guildId: interaction.guild.id})
            .sort({xp: -1})
            .limit(5);

        const topUsersText =
            topUsers.length > 0
                ? topUsers
                    .map((profile, index) => {
                        return `${index + 1}. <@${
                            profile.userId
                        }> - ${profile.xp.toLocaleString()} XP`;
                    })
                    .join("\n")
                : "Brak danych";

        const embed = new EmbedBuilder()
            .setTitle("📊 Statystyki Systemu Levelowania")
            .setDescription(
                `Ogólne statystyki dla serwera **${interaction.guild.name}**`
            )
            .addFields([
                {
                    name: "👥 Profile użytkowników",
                    value: totalProfiles.toString(),
                    inline: true,
                },
                {
                    name: "🏆 Dostępne osiągnięcia",
                    value: totalAchievements.toString(),
                    inline: true,
                },
                {
                    name: "⭐ Odblokowane osiągnięcia",
                    value: totalUserAchievements.toString(),
                    inline: true,
                },
                {
                    name: "🎯 Aktywne wyzwania",
                    value: totalChallenges.toString(),
                    inline: true,
                },
                {
                    name: "📈 Średnia osiągnięć/użytkownik",
                    value:
                        totalProfiles > 0
                            ? (totalUserAchievements / totalProfiles).toFixed(1)
                            : "0",
                    inline: true,
                },
                {
                    name: "🎮 Cache Hit Rate",
                    value: levelingCache.getCacheStats().hitRate,
                    inline: true,
                },
                {
                    name: "🏅 Top 5 użytkowników (XP)",
                    value: topUsersText,
                    inline: false,
                },
            ])
            .setColor("#f39c12")
            .setFooter({text: `Statystyki • ${interaction.guild.name}`})
            .setTimestamp();

        await interaction.editReply({embeds: [embed]});
    },
};
