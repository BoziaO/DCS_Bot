const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Profile = require("../../models/Profile");
const LevelCalculator = require("../../utils/leveling/levelCalculator");
const XpMultiplier = require("../../utils/leveling/xpMultiplier");
const PrestigeManager = require("../../utils/leveling/prestigeManager");
const levelingCache = require("../../utils/leveling/levelingCache");

const getRankColor = (level) => {
  if (level >= 100) return "#ff6b6b";
  if (level >= 75) return "#4ecdc4";
  if (level >= 50) return "#45b7d1";
  if (level >= 25) return "#96ceb4";
  if (level >= 10) return "#ffeaa7";
  return "#dddddd";
};

const getRankTitle = (level) => {
  if (level >= 100) return "ᴅᴇᴍᴏɴ";
  if (level >= 80) return "ᴛʜᴇ ᴛᴡɪɴꜱ";
  if (level >= 60) return "ᴍᴀʀᴀ";
  if (level >= 40) return "ꜰᴀɴᴛᴏᴍ";
  if (level >= 20) return "ᴊɪɴɴ";
  if (level >= 10) return "ꜱᴘɪʀɪᴛ";
  return "ꜱʜᴀᴅᴇ";
};

const getRankEmoji = (level) => {
  if (level >= 100) return "😈";
  if (level >= 80) return "👥";
  if (level >= 60) return "🌙";
  if (level >= 40) return "👤";
  if (level >= 20) return "🧞";
  if (level >= 10) return "👻";
  return "🌑";
};

const createProgressBar = (current, max, length = 20) => {
  const percentage = max > 0 ? current / max : 0;
  const filled = Math.round(percentage * length);
  const empty = length - filled;

  const fillChar = "▰";
  const emptyChar = "▱";

  return `${fillChar.repeat(filled)}${emptyChar.repeat(empty)}`;
};

const getSanityEmoji = (sanity) => {
  if (sanity >= 80) return "🧠";
  if (sanity >= 60) return "😵‍💫";
  if (sanity >= 40) return "😖";
  if (sanity >= 20) return "😵";
  return "🤯";
};

const getBadges = (profile) => {
  const badges = [];
  const { xp, balance, sanity, messageCount } = profile;

  if (xp >= 50000) badges.push("🌟");
  if (xp >= 100000) badges.push("✨");
  if (xp >= 200000) badges.push("💫");

  if (balance >= 10000) badges.push("💎");
  if (balance >= 50000) badges.push("💰");
  if (balance >= 100000) badges.push("🏦");

  if (messageCount >= 1000) badges.push("💬");
  if (messageCount >= 5000) badges.push("📢");
  if (messageCount >= 10000) badges.push("📣");

  if (sanity <= 10) badges.push("🤪");
  if (sanity === 100) badges.push("🧘");

  return badges.length > 0 ? badges.join(" ") : "📝";
};

const createAnimatedEmbed = async (user, profile, guildRank, interaction) => {
  const xp = profile.xp || 0;
  const messageCount = profile.messageCount || 0;

  const levelProgress = LevelCalculator.getLevelProgress(xp);
  const currentLevel = levelProgress.currentLevel;
  const progressXp = levelProgress.progressXp;
  const neededXp = levelProgress.neededXp;

  const prestigeInfo = PrestigeManager.getEffectiveLevel(profile);

  const multiplierInfo = await XpMultiplier.calculateMultiplier(profile);

  const progressBar = createProgressBar(progressXp, neededXp);
  const badges = getBadges(profile);
  const rankEmoji = getRankEmoji(currentLevel);

  const embed = new EmbedBuilder()
    .setTitle(`${rankEmoji} ${getRankTitle(currentLevel)}`)
    .setDescription(
      `**${user.displayName}** • ${
        prestigeInfo.displayLevel
      } • Rank **#${guildRank}**${
        prestigeInfo.prestige > 0
          ? ` • ⭐ Prestiż ${prestigeInfo.prestige}`
          : ""
      }`
    )
    .setColor(getRankColor(currentLevel))
    .setThumbnail(user.displayAvatarURL({ dynamic: true, size: 256 }))
    .addFields([
      {
        name: "📊 Postęp do następnego poziomu",
        value: `\`\`\`${progressBar}\`\`\`\n**${progressXp.toLocaleString()}** / **${neededXp.toLocaleString()}** XP (${levelProgress.progressPercentage.toFixed(
          1
        )}%)`,
        inline: false,
      },
      {
        name: "🎯 Całkowite XP",
        value: `**${xp.toLocaleString()}**`,
        inline: true,
      },
      {
        name: "💬 Wiadomości",
        value: `**${messageCount.toLocaleString()}**`,
        inline: true,
      },
      {
        name: "🔥 Mnożnik XP",
        value: `**x${multiplierInfo.totalMultiplier}** (+${multiplierInfo.bonusPercentage}%)`,
        inline: true,
      },
      {
        name: "📈 Aktywność",
        value: `**${(messageCount / 30).toFixed(1)}**/dzień${
          profile.messageStreak
            ? `\n🔥 Seria: ${profile.messageStreak} dni`
            : ""
        }`,
        inline: true,
      },
      {
        name: "🏆 Osiągnięcia",
        value: `**${
          (profile.achievements || []).length
        }** odblokowanych\n⭐ **${profile.achievementPoints || 0}** punktów`,
        inline: true,
      },
      {
        name: "🎯 Wyzwania",
        value: `**${profile.completedChallenges || 0}** ukończonych`,
        inline: true,
      },
    ])
    .setFooter({
      text: `Profil • ${interaction.guild.name}`,
      iconURL: interaction.guild.iconURL({ dynamic: true }),
    })
    .setTimestamp();

  if (prestigeInfo.prestige > 0) {
    embed.addFields([
      {
        name: "🌟 System Prestiżu",
        value: `**Prestiż:** ${
          prestigeInfo.prestige
        }\n**Prestiż XP:** ${prestigeInfo.prestigeXp.toLocaleString()}\n**Efektywny poziom:** ${
          prestigeInfo.effectiveLevel
        }`,
        inline: false,
      },
    ]);
  }

  return embed;
};

const createStatsEmbed = async (user, profile) => {
  const xp = profile.xp || 0;
  const messageCount = profile.messageCount || 0;
  const currentLevel = LevelCalculator.calculateLevel(xp);

  const avgXpPerMessage = messageCount > 0 ? (xp / messageCount).toFixed(1) : 0;
  const levelsToMaster = 100 - currentLevel;
  const xpToMaster = LevelCalculator.getXpNeededForLevel(xp, 100);

  const prestigeInfo = PrestigeManager.getEffectiveLevel(profile);
  const multiplierInfo = await XpMultiplier.calculateMultiplier(profile);

  const avgXpPerDay = (profile.dailyXp || 0) * multiplierInfo.totalMultiplier;
  const timeEstimate = LevelCalculator.estimateTimeToLevel(
    xp,
    100,
    avgXpPerDay
  );

  return new EmbedBuilder()
    .setTitle(`📊 Szczegółowe Statystyki`)
    .setDescription(`**${user.displayName}** - Analiza profilu`)
    .setColor("#9b59b6")
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .addFields([
      {
        name: "🎮 Postęp w grze",
        value: `**Poziom:** ${currentLevel}\n**XP:** ${xp.toLocaleString()}\n**Średnio XP/wiadomość:** ${avgXpPerMessage}`,
        inline: true,
      },
      {
        name: "📱 Aktywność",
        value: `**Wiadomości:** ${messageCount.toLocaleString()}\n**Dziennie:** ~${(
          messageCount / 30
        ).toFixed(1)}\n**Seria:** ${profile.messageStreak || 0} dni`,
        inline: true,
      },
      {
        name: "🎯 Cele",
        value: `**Do Master:** ${levelsToMaster} poziomów\n**XP potrzebne:** ${xpToMaster.toLocaleString()}\n**Progres:** ${(
          (currentLevel / 100) *
          100
        ).toFixed(1)}%`,
        inline: true,
      },
      {
        name: "🔥 Mnożniki XP",
        value: `**Aktualny:** x${multiplierInfo.totalMultiplier}\n**Bonus:** +${
          multiplierInfo.bonusPercentage
        }%\n**Aktywne boostery:** ${
          multiplierInfo.activeMultipliers.filter((m) =>
            m.name.includes("Booster")
          ).length
        }`,
        inline: true,
      },
      {
        name: "🏆 Osiągnięcia",
        value: `**Odblokowane:** ${
          (profile.achievements || []).length
        }\n**Punkty:** ${profile.achievementPoints || 0}\n**Wyzwania:** ${
          profile.completedChallenges || 0
        }`,
        inline: true,
      },
      {
        name: "⏱️ Szacowany czas do Master",
        value: timeEstimate || "Brak danych",
        inline: true,
      },
    ])
    .setFooter({ text: "Szczegółowe statystyki profilu" })
    .setTimestamp();
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rank")
    .setDescription("Sprawdź swój poziom i statystyki")
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
          } jeszcze profilu!\n\n**Jak zacząć:**\n🔸 Pisz na czacie aby zdobywać XP\n🔸 Bierz udział w aktywności serwera\n🔸 Wypełnij swój profil`
        )
        .setColor("#e74c3c")
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setFooter({ text: "Rozpocznij swoją przygodę już dziś!" });

      return interaction.editReply({ embeds: [noProfileEmbed] });
    }

    const allProfiles = await Profile.find({
      guildId: interaction.guild.id,
    }).sort({ xp: -1 });

    const guildRank =
      allProfiles.findIndex((p) => p.userId === targetUser.id) + 1;

    try {
      const embed = await createAnimatedEmbed(
        targetUser,
        profile,
        guildRank,
        interaction
      );

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`stats_${targetUser.id}`)
          .setLabel("📊 Statystyki")
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`refresh_${targetUser.id}`)
          .setLabel("🔄 Odśwież")
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

          if (buttonInteraction.customId.startsWith("stats_")) {
            await buttonInteraction.deferReply({ ephemeral: true });

            const updatedProfile = await Profile.findOne({
              userId: targetUser.id,
              guildId: interaction.guild.id,
            });
            if (!updatedProfile) {
              return await buttonInteraction.editReply({
                content: "Wystąpił błąd: Nie można odnaleźć Twojego profilu.",
              });
            }

            const statsEmbed = createStatsEmbed(targetUser, updatedProfile);
            await buttonInteraction.editReply({ embeds: [statsEmbed] });
            return;
          }

          if (buttonInteraction.customId.startsWith("refresh_")) {
            await buttonInteraction.deferUpdate();

            const updatedProfile = await Profile.findOne({
              userId: targetUser.id,
              guildId: interaction.guild.id,
            });
            if (!updatedProfile) {
              await interaction.editReply({
                content: "Wystąpił błąd: Nie można odnaleźć Twojego profilu.",
                components: [],
                embeds: [],
              });
              return collector.stop();
            }

            const allProfilesForRank = await Profile.find({
              guildId: interaction.guild.id,
            }).sort({ xp: -1 });
            const updatedGuildRank =
              allProfilesForRank.findIndex((p) => p.userId === targetUser.id) +
              1;

            const updatedEmbed = await createAnimatedEmbed(
              targetUser,
              updatedProfile,
              updatedGuildRank,
              interaction
            );
            await buttonInteraction.editReply({ embeds: [updatedEmbed] });
          }
        } catch (error) {
          console.error("Błąd w kolektorze komendy rank:", error);

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
                .setCustomId("stats_disabled")
                .setLabel("📊 Statystyki")
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId("refresh_disabled")
                .setLabel("🔄 Odśwież")
                .setStyle(ButtonStyle.Success)
                .setDisabled(true)
            );

            await interaction.editReply({ components: [disabledButtons] });
          }
        } catch (error) {
          console.warn("Could not disable buttons:", error.message);
        }
      });
    } catch (error) {
      console.error("Błąd podczas tworzenia embedu rangi:", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("⚠️ Błąd systemu")
        .setDescription(
          "Wystąpił problem podczas ładowania profilu. Spróbuj ponownie za chwilę."
        )
        .setColor("#e74c3c")
        .setFooter({
          text: "Jeśli problem się powtarza, skontaktuj się z administratorem",
        });

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },
};
