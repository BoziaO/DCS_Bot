const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Profile = require("../../models/Profile");
const AchievementManager = require("../../utils/leveling/achievementManager");

const achievementManager = new AchievementManager();

module.exports = {
  data: new SlashCommandBuilder()
    .setName("achievements")
    .setDescription("Sprawdź swoje osiągnięcia")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Użytkownik do sprawdzenia (opcjonalne)")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const targetUser = interaction.options.getUser("user") || interaction.user;

    const profile = await Profile.findOne({
      userId: targetUser.id,
      guildId: interaction.guild.id,
    });

    if (!profile) {
      const noProfileEmbed = new EmbedBuilder()
        .setTitle("❌ Brak profilu")
        .setDescription(
          `${
            targetUser.id === interaction.user.id
              ? "Nie masz"
              : "Ten użytkownik nie ma"
          } jeszcze profilu!`
        )
        .setColor("#e74c3c")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

      return interaction.editReply({ embeds: [noProfileEmbed] });
    }

    const userAchievements = await achievementManager.getUserAchievements(
      targetUser.id,
      interaction.guild.id
    );
    const stats = await achievementManager.getUserAchievementStats(
      targetUser.id,
      interaction.guild.id
    );

    if (!stats) {
      return interaction.editReply({
        content: "Wystąpił błąd podczas pobierania osiągnięć.",
      });
    }

    const embed = new EmbedBuilder()
      .setTitle(`🏆 Osiągnięcia - ${targetUser.displayName}`)
      .setDescription(
        `Postęp w osiągnięciach: **${stats.total}/${stats.totalAvailable}** (${stats.percentage}%)`
      )
      .setColor("#f39c12")
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields([
        {
          name: "📊 Statystyki",
          value: `**Punkty osiągnięć:** ${stats.points}\n**Ukończone:** ${stats.total}/${stats.totalAvailable}\n**Procent:** ${stats.percentage}%`,
          inline: true,
        },
        {
          name: "🎯 Według rzadkości",
          value: `🔘 Pospolite: ${stats.byRarity.common}\n🟢 Niepospolite: ${stats.byRarity.uncommon}\n🔵 Rzadkie: ${stats.byRarity.rare}\n🟣 Epickie: ${stats.byRarity.epic}\n🟡 Legendarne: ${stats.byRarity.legendary}\n🔴 Mityczne: ${stats.byRarity.mythic}`,
          inline: true,
        },
        {
          name: "📂 Według kategorii",
          value: `📈 Levelowanie: ${stats.byCategory.leveling}\n💬 Aktywność: ${stats.byCategory.activity}\n💰 Ekonomia: ${stats.byCategory.economy}\n👥 Społeczne: ${stats.byCategory.social}\n🔍 Investigate: ${stats.byCategory.investigate}\n👻 Hunt: ${stats.byCategory.hunt}\n⭐ Specjalne: ${stats.byCategory.special}`,
          inline: true,
        },
      ])
      .setFooter({ text: `Profil osiągnięć • ${interaction.guild.name}` })
      .setTimestamp();

    if (userAchievements.length > 0) {
      const recentAchievements = userAchievements.slice(0, 5);
      const achievementText = recentAchievements
        .map(({ achievement, userAchievement }) => {
          const rarityEmojis = {
            common: "🔘",
            uncommon: "🟢",
            rare: "🔵",
            epic: "🟣",
            legendary: "🟡",
            mythic: "🔴",
          };

          const date = new Date(userAchievement.unlockedAt).toLocaleDateString(
            "pl-PL"
          );
          return `${rarityEmojis[achievement.rarity]} **${
            achievement.name
          }** - ${date}`;
        })
        .join("\n");

      embed.addFields([
        {
          name: "🏆 Ostatnie osiągnięcia",
          value: achievementText,
          inline: false,
        },
      ]);
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`achievements_all_${targetUser.id}`)
        .setLabel("📋 Wszystkie")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`achievements_categories_${targetUser.id}`)
        .setLabel("📂 Kategorie")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`achievements_progress_${targetUser.id}`)
        .setLabel("📊 Postęp")
        .setStyle(ButtonStyle.Success)
    );

    await interaction.editReply({
      embeds: [embed],
      components: [buttons],
    });

    const collector = interaction.channel.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 120000,
    });

    collector.on("collect", async (buttonInteraction) => {
      try {
        if (!buttonInteraction.isRepliable()) {
          console.warn("Interaction is no longer repliable");
          return;
        }

        await buttonInteraction.deferUpdate();

        if (buttonInteraction.customId.startsWith("achievements_all_")) {
          await showAllAchievements(
            buttonInteraction,
            targetUser,
            userAchievements,
            0
          );
        } else if (
          buttonInteraction.customId.startsWith("achievements_categories_")
        ) {
          await showAchievementsByCategory(
            buttonInteraction,
            targetUser,
            stats
          );
        } else if (
          buttonInteraction.customId.startsWith("achievements_progress_")
        ) {
          await showAchievementProgress(buttonInteraction, targetUser, stats);
        } else if (
          buttonInteraction.customId.startsWith("achievements_back_")
        ) {
          const freshStats = await achievementManager.getUserAchievementStats(
            targetUser.id,
            interaction.guild.id
          );

          const mainEmbed = new EmbedBuilder()
            .setTitle(`🏆 Osiągnięcia - ${targetUser.displayName}`)
            .setDescription(
              `Postęp w osiągnięciach: **${freshStats.total}/${freshStats.totalAvailable}** (${freshStats.percentage}%)`
            )
            .setColor("#f39c12")
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields([
              {
                name: "📊 Statystyki",
                value: `**Punkty osiągnięć:** ${freshStats.points}\n**Ukończone:** ${freshStats.total}/${freshStats.totalAvailable}\n**Procent:** ${freshStats.percentage}%`,
                inline: true,
              },
              {
                name: "🎯 Według rzadkości",
                value: `🔘 Pospolite: ${freshStats.byRarity.common}\n🟢 Niepospolite: ${freshStats.byRarity.uncommon}\n🔵 Rzadkie: ${freshStats.byRarity.rare}\n🟣 Epickie: ${freshStats.byRarity.epic}\n🟡 Legendarne: ${freshStats.byRarity.legendary}\n🔴 Mityczne: ${freshStats.byRarity.mythic}`,
                inline: true,
              },
              {
                name: "📂 Według kategorii",
                value: `📈 Levelowanie: ${freshStats.byCategory.leveling}\n💬 Aktywność: ${freshStats.byCategory.activity}\n💰 Ekonomia: ${freshStats.byCategory.economy}\n👥 Społeczne: ${freshStats.byCategory.social}\n🔍 Investigate: ${freshStats.byCategory.investigate}\n👻 Hunt: ${freshStats.byCategory.hunt}\n⭐ Specjalne: ${freshStats.byCategory.special}`,
                inline: true,
              },
            ])
            .setFooter({ text: `Profil osiągnięć • ${interaction.guild.name}` })
            .setTimestamp();

          if (userAchievements.length > 0) {
            const recentAchievements = userAchievements.slice(0, 5);
            const achievementText = recentAchievements
              .map(({ achievement, userAchievement }) => {
                const rarityEmojis = {
                  common: "🔘",
                  uncommon: "🟢",
                  rare: "🔵",
                  epic: "🟣",
                  legendary: "🟡",
                  mythic: "🔴",
                };

                const date = new Date(
                  userAchievement.unlockedAt
                ).toLocaleDateString("pl-PL");
                return `${rarityEmojis[achievement.rarity]} **${
                  achievement.name
                }** - ${date}`;
              })
              .join("\n");

            mainEmbed.addFields([
              {
                name: "🏆 Ostatnie osiągnięcia",
                value: achievementText,
                inline: false,
              },
            ]);
          }

          await buttonInteraction.editReply({
            embeds: [mainEmbed],
            components: [buttons],
          });
        } else if (
          buttonInteraction.customId.startsWith("achievements_page_")
        ) {
          const parts = buttonInteraction.customId.split("_");
          const page = parseInt(parts[2]);
          await showAllAchievements(
            buttonInteraction,
            targetUser,
            userAchievements,
            page
          );
        }
      } catch (error) {
        console.error("Błąd w kolektorze osiągnięć:", error);

        try {
          if (!buttonInteraction.replied && !buttonInteraction.deferred) {
            await buttonInteraction.reply({
              content: "❌ Wystąpił błąd podczas przetwarzania żądania.",
              ephemeral: true,
            });
          }
        } catch (replyError) {
          console.error("Could not send error reply:", replyError);
        }
      }
    });

    collector.on("end", async (collected, reason) => {
      try {
        if (reason === "time" && interaction.channel) {
          const disabledButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("achievements_all_disabled")
              .setLabel("📋 Wszystkie")
              .setStyle(ButtonStyle.Primary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId("achievements_categories_disabled")
              .setLabel("📂 Kategorie")
              .setStyle(ButtonStyle.Secondary)
              .setDisabled(true),
            new ButtonBuilder()
              .setCustomId("achievements_progress_disabled")
              .setLabel("📊 Postęp")
              .setStyle(ButtonStyle.Success)
              .setDisabled(true)
          );

          await interaction.editReply({ components: [disabledButtons] });
        }
      } catch (error) {
        console.warn("Could not disable buttons:", error.message);
      }
    });
  },
};

async function showAllAchievements(
  interaction,
  targetUser,
  userAchievements,
  page = 0
) {
  const itemsPerPage = 10;
  const totalPages = Math.ceil(userAchievements.length / itemsPerPage);
  const startIndex = page * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageAchievements = userAchievements.slice(startIndex, endIndex);

  const embed = new EmbedBuilder()
    .setTitle(`🏆 Wszystkie osiągnięcia - ${targetUser.displayName}`)
    .setDescription(
      `Strona ${page + 1}/${totalPages} • Łącznie: ${userAchievements.length}`
    )
    .setColor("#f39c12")
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }));

  if (pageAchievements.length > 0) {
    const achievementText = pageAchievements
      .map(({ achievement, userAchievement }) => {
        const rarityEmojis = {
          common: "🔘",
          uncommon: "🟢",
          rare: "🔵",
          epic: "🟣",
          legendary: "🟡",
          mythic: "🔴",
        };

        const date = new Date(userAchievement.unlockedAt).toLocaleDateString(
          "pl-PL"
        );
        return `${rarityEmojis[achievement.rarity]} **${achievement.name}**\n${
          achievement.description
        }\n*Odblokowane: ${date}* • **+${achievement.points} pkt**\n`;
      })
      .join("\n");

    embed.setDescription(`${embed.data.description}\n\n${achievementText}`);
  } else {
    embed.setDescription(
      `${embed.data.description}\n\nBrak osiągnięć na tej stronie.`
    );
  }

  const navigationButtons = new ActionRowBuilder();

  if (page > 0) {
    navigationButtons.addComponents(
      new ButtonBuilder()
        .setCustomId(`achievements_page_${page - 1}_${targetUser.id}`)
        .setLabel("⬅️ Poprzednia")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  if (page < totalPages - 1) {
    navigationButtons.addComponents(
      new ButtonBuilder()
        .setCustomId(`achievements_page_${page + 1}_${targetUser.id}`)
        .setLabel("Następna ➡️")
        .setStyle(ButtonStyle.Secondary)
    );
  }

  navigationButtons.addComponents(
    new ButtonBuilder()
      .setCustomId(`achievements_back_${targetUser.id}`)
      .setLabel("🔙 Powrót")
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.editReply({
    embeds: [embed],
    components: [navigationButtons],
  });
}

async function showAchievementsByCategory(interaction, targetUser, stats) {
  const embed = new EmbedBuilder()
    .setTitle(`📂 Osiągnięcia według kategorii - ${targetUser.displayName}`)
    .setColor("#3498db")
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .addFields([
      {
        name: "📈 Levelowanie",
        value: `${stats.byCategory.leveling} osiągnięć`,
        inline: true,
      },
      {
        name: "💬 Aktywność",
        value: `${stats.byCategory.activity} osiągnięć`,
        inline: true,
      },
      {
        name: "💰 Ekonomia",
        value: `${stats.byCategory.economy} osiągnięć`,
        inline: true,
      },
      {
        name: "👥 Społeczne",
        value: `${stats.byCategory.social} osiągnięć`,
        inline: true,
      },
      {
        name: "🔍 Investigate",
        value: `${stats.byCategory.investigate} osiągnięć`,
        inline: true,
      },
      {
        name: "👻 Hunt",
        value: `${stats.byCategory.hunt} osiągnięć`,
        inline: true,
      },
      {
        name: "⭐ Specjalne",
        value: `${stats.byCategory.special} osiągnięć`,
        inline: true,
      },
    ]);

  const backButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`achievements_back_${targetUser.id}`)
      .setLabel("🔙 Powrót")
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.editReply({
    embeds: [embed],
    components: [backButton],
  });
}

async function showAchievementProgress(interaction, targetUser, stats) {
  const embed = new EmbedBuilder()
    .setTitle(`📊 Szczegółowy postęp - ${targetUser.displayName}`)
    .setColor("#27ae60")
    .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
    .addFields([
      {
        name: "🎯 Ogólne statystyki",
        value: `**Punkty osiągnięć:** ${stats.points}\n**Ukończone:** ${stats.total}/${stats.totalAvailable}\n**Procent ukończenia:** ${stats.percentage}%`,
        inline: false,
      },
      {
        name: "🏆 Według rzadkości",
        value: `🔘 **Pospolite:** ${stats.byRarity.common}\n🟢 **Niepospolite:** ${stats.byRarity.uncommon}\n🔵 **Rzadkie:** ${stats.byRarity.rare}\n🟣 **Epickie:** ${stats.byRarity.epic}\n🟡 **Legendarne:** ${stats.byRarity.legendary}\n🔴 **Mityczne:** ${stats.byRarity.mythic}`,
        inline: true,
      },
      {
        name: "📈 Ranking",
        value: `Jesteś w **top ${Math.ceil(
          (1 - stats.percentage / 100) * 100
        )}%** graczy pod względem osiągnięć!`,
        inline: false,
      },
    ]);

  const backButton = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`achievements_back_${targetUser.id}`)
      .setLabel("🔙 Powrót")
      .setStyle(ButtonStyle.Primary)
  );

  await interaction.editReply({
    embeds: [embed],
    components: [backButton],
  });
}
