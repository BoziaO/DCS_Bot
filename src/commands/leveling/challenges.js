const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const Profile = require("../../models/Profile");
const ChallengeManager = require("../../utils/leveling/challengeManager");

const challengeManager = new ChallengeManager();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("challenges")
        .setDescription("Sprawdź aktywne wyzwania")
        .addStringOption((option) =>
            option
                .setName("type")
                .setDescription("Typ wyzwań do wyświetlenia")
                .addChoices(
                    {name: "📅 Dzienne", value: "daily"},
                    {name: "📆 Tygodniowe", value: "weekly"},
                    {name: "🗓️ Miesięczne", value: "monthly"},
                    {name: "⭐ Specjalne", value: "special"},
                    {name: "🎉 Eventowe", value: "event"}
                )
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const typeFilter = interaction.options.getString("type");

        const profile = await Profile.findOne({
            userId: interaction.user.id,
            guildId: interaction.guild.id,
        });

        if (!profile) {
            const noProfileEmbed = new EmbedBuilder()
                .setTitle("❌ Brak profilu")
                .setDescription(
                    "Nie masz jeszcze profilu! Napisz kilka wiadomości aby go utworzyć."
                )
                .setColor("#e74c3c")
                .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}));

            return interaction.editReply({embeds: [noProfileEmbed]});
        }

        const userChallenges = await challengeManager.getUserChallenges(
            interaction.user.id,
            interaction.guild.id
        );
        const stats = await challengeManager.getUserChallengeStats(
            interaction.user.id,
            interaction.guild.id
        );

        let filteredChallenges = userChallenges;
        if (typeFilter) {
            filteredChallenges = userChallenges.filter(
                ({challenge}) => challenge.type === typeFilter
            );
        }

        if (filteredChallenges.length === 0) {
            const noChallengesEmbed = new EmbedBuilder()
                .setTitle("📋 Brak wyzwań")
                .setDescription(
                    typeFilter
                        ? `Brak aktywnych wyzwań typu: ${typeFilter}`
                        : "Brak aktywnych wyzwań w tej chwili."
                )
                .setColor("#95a5a6")
                .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}));

            return interaction.editReply({embeds: [noChallengesEmbed]});
        }

        const embed = new EmbedBuilder()
            .setTitle(
                `🎯 ${typeFilter ? `Wyzwania ${typeFilter}` : "Aktywne wyzwania"}`
            )
            .setDescription(`Twój postęp w wyzwaniach`)
            .setColor("#e67e22")
            .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}))
            .addFields([
                {
                    name: "📊 Statystyki",
                    value: `**Ukończone:** ${stats.totalCompleted}\n**Aktywne:** ${stats.totalActive}\n**Wskaźnik:** ${stats.completionRate}%`,
                    inline: true,
                },
            ])
            .setFooter({text: `Wyzwania • ${interaction.guild.name}`})
            .setTimestamp();

        const displayChallenges = filteredChallenges.slice(0, 5);

        for (const {challenge, userChallenge} of displayChallenges) {
            const progress = this.getChallengeProgress(challenge, userChallenge);
            const difficultyEmojis = {
                easy: "🟢",
                medium: "🟡",
                hard: "🔴",
                extreme: "🟣",
            };

            const timeLeft = this.getTimeLeft(challenge.endDate);
            const statusEmoji = userChallenge.completed ? "✅" : "⏳";

            embed.addFields([
                {
                    name: `${statusEmoji} ${challenge.emoji} ${challenge.name}`,
                    value: `${challenge.description}\n\n**Postęp:** ${
                        progress.text
                    }\n**Trudność:** ${difficultyEmojis[challenge.difficulty]} ${
                        challenge.difficulty
                    }\n**Czas:** ${timeLeft}\n**Nagrody:** ${this.getRewardsText(
                        challenge.rewards
                    )}`,
                    inline: false,
                },
            ]);
        }

        const buttons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`challenges_all_${interaction.user.id}`)
                .setLabel("📋 Wszystkie")
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`challenges_completed_${interaction.user.id}`)
                .setLabel("✅ Ukończone")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`challenges_stats_${interaction.user.id}`)
                .setLabel("📊 Statystyki")
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons],
        });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: 300000,
        });

        collector.on("collect", async (buttonInteraction) => {
            try {
                await buttonInteraction.deferUpdate();

                if (buttonInteraction.customId.startsWith("challenges_all_")) {
                    await this.showAllChallenges(buttonInteraction, userChallenges, 0);
                } else if (
                    buttonInteraction.customId.startsWith("challenges_completed_")
                ) {
                    await this.showCompletedChallenges(buttonInteraction, userChallenges);
                } else if (buttonInteraction.customId.startsWith("challenges_stats_")) {
                    await this.showChallengeStats(buttonInteraction, stats, profile);
                }
            } catch (error) {
                console.error("Błąd w kolektorze wyzwań:", error);
            }
        });

        collector.on("end", async () => {
            const disabledButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("challenges_all_disabled")
                    .setLabel("📋 Wszystkie")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId("challenges_completed_disabled")
                    .setLabel("✅ Ukończone")
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(true),
                new ButtonBuilder()
                    .setCustomId("challenges_stats_disabled")
                    .setLabel("📊 Statystyki")
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(true)
            );

            try {
                await interaction.editReply({components: [disabledButtons]});
            } catch (error) {
            }
        });
    },

    getChallengeProgress(challenge, userChallenge) {
        const requirements = challenge.requirements;
        const progress = userChallenge.progress || new Map();

        const mainRequirement = Object.keys(requirements).find(
            (key) => requirements[key] > 0
        );
        if (!mainRequirement) return {text: "Brak wymagań", percentage: 100};

        const required = requirements[mainRequirement];
        const current = progress.get(mainRequirement) || 0;
        const percentage = Math.min(100, Math.round((current / required) * 100));

        const progressBar = this.createProgressBar(current, required);

        return {
            text: `${progressBar} ${current}/${required} (${percentage}%)`,
            percentage,
        };
    },

    createProgressBar(current, max, length = 10) {
        const percentage = max > 0 ? current / max : 0;
        const filled = Math.round(percentage * length);
        const empty = length - filled;

        return `${"▰".repeat(filled)}${"▱".repeat(empty)}`;
    },

    getTimeLeft(endDate) {
        const now = new Date();
        const end = new Date(endDate);
        const diff = end - now;

        if (diff <= 0) return "Wygasło";

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (days > 0) return `${days}d ${hours}h`;
        if (hours > 0) return `${hours}h ${minutes}m`;
        return `${minutes}m`;
    },

    getRewardsText(rewards) {
        const rewardTexts = [];

        if (rewards.xp) rewardTexts.push(`${rewards.xp} XP`);
        if (rewards.money) rewardTexts.push(`${rewards.money} 💰`);
        if (rewards.items && rewards.items.length > 0) {
            const itemText = rewards.items
                .map((item) => `${item.name} x${item.quantity}`)
                .join(", ");
            rewardTexts.push(itemText);
        }
        if (rewards.xpBooster) {
            rewardTexts.push(`XP Booster x${rewards.xpBooster.multiplier}`);
        }

        return rewardTexts.length > 0 ? rewardTexts.join(", ") : "Brak nagród";
    },

    async showAllChallenges(interaction, userChallenges, page = 0) {
        const itemsPerPage = 5;
        const totalPages = Math.ceil(userChallenges.length / itemsPerPage);
        const startIndex = page * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const pageChallenges = userChallenges.slice(startIndex, endIndex);

        const embed = new EmbedBuilder()
            .setTitle(`📋 Wszystkie wyzwania`)
            .setDescription(
                `Strona ${page + 1}/${totalPages} • Łącznie: ${userChallenges.length}`
            )
            .setColor("#e67e22")
            .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}));

        for (const {challenge, userChallenge} of pageChallenges) {
            const progress = this.getChallengeProgress(challenge, userChallenge);
            const timeLeft = this.getTimeLeft(challenge.endDate);
            const statusEmoji = userChallenge.completed ? "✅" : "⏳";

            embed.addFields([
                {
                    name: `${statusEmoji} ${challenge.emoji} ${challenge.name}`,
                    value: `${challenge.description}\n**Postęp:** ${progress.text}\n**Czas:** ${timeLeft}`,
                    inline: false,
                },
            ]);
        }

        const navigationButtons = new ActionRowBuilder();

        if (page > 0) {
            navigationButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`challenges_page_${page - 1}`)
                    .setLabel("⬅️ Poprzednia")
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        if (page < totalPages - 1) {
            navigationButtons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`challenges_page_${page + 1}`)
                    .setLabel("Następna ➡️")
                    .setStyle(ButtonStyle.Secondary)
            );
        }

        navigationButtons.addComponents(
            new ButtonBuilder()
                .setCustomId(`challenges_back`)
                .setLabel("🔙 Powrót")
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({
            embeds: [embed],
            components: [navigationButtons],
        });
    },

    async showCompletedChallenges(interaction, userChallenges) {
        const completedChallenges = userChallenges.filter(
            ({userChallenge}) => userChallenge.completed
        );

        const embed = new EmbedBuilder()
            .setTitle(`✅ Ukończone wyzwania`)
            .setDescription(`Ukończyłeś ${completedChallenges.length} wyzwań`)
            .setColor("#27ae60")
            .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}));

        if (completedChallenges.length === 0) {
            embed.setDescription("Nie ukończyłeś jeszcze żadnego wyzwania.");
        } else {
            const recentCompleted = completedChallenges.slice(0, 10);

            for (const {challenge, userChallenge} of recentCompleted) {
                const completedDate = new Date(
                    userChallenge.completedAt
                ).toLocaleDateString("pl-PL");

                embed.addFields([
                    {
                        name: `✅ ${challenge.emoji} ${challenge.name}`,
                        value: `${
                            challenge.description
                        }\n**Ukończone:** ${completedDate}\n**Nagrody:** ${this.getRewardsText(
                            challenge.rewards
                        )}`,
                        inline: false,
                    },
                ]);
            }
        }

        const backButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`challenges_back`)
                .setLabel("🔙 Powrót")
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({
            embeds: [embed],
            components: [backButton],
        });
    },

    async showChallengeStats(interaction, stats, profile) {
        const embed = new EmbedBuilder()
            .setTitle(`📊 Statystyki wyzwań`)
            .setColor("#3498db")
            .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}))
            .addFields([
                {
                    name: "🎯 Ogólne statystyki",
                    value: `**Ukończone wyzwania:** ${stats.totalCompleted}\n**Aktywne wyzwania:** ${stats.totalActive}\n**Wskaźnik ukończenia:** ${stats.completionRate}%\n**Łączne ukończenia:** ${stats.totalCompletions}`,
                    inline: false,
                },
                {
                    name: "🏆 Osiągnięcia w wyzwaniach",
                    value: `**Punkty za wyzwania:** ${
                        profile.completedChallenges * 10
                    }\n**Średnia dziennie:** ${(stats.totalCompleted / 30).toFixed(
                        1
                    )}\n**Najlepsza seria:** Wkrótce...`,
                    inline: false,
                },
                {
                    name: "📈 Ranking",
                    value: `Jesteś w **top ${Math.ceil(
                        (1 - stats.completionRate / 100) * 100
                    )}%** graczy pod względem wyzwań!`,
                    inline: false,
                },
            ]);

        const backButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`challenges_back`)
                .setLabel("🔙 Powrót")
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({
            embeds: [embed],
            components: [backButton],
        });
    },
};
