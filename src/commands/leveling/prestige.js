const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Profile = require("../../models/Profile");
const PrestigeManager = require("../../utils/leveling/prestigeManager");
const levelingCache = require("../../utils/leveling/levelingCache");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("prestige")
    .setDescription("Sprawdź system prestiżu lub awansuj na wyższy prestiż")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("info")
        .setDescription("Sprawdź informacje o systemie prestiżu")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("up")
        .setDescription("Awansuj na wyższy prestiż (wymaga poziomu 100)")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("leaderboard")
        .setDescription("Sprawdź ranking prestiżu")
        .addIntegerOption((option) =>
          option
            .setName("limit")
            .setDescription("Liczba pozycji do wyświetlenia (1-20)")
            .setMinValue(1)
            .setMaxValue(20)
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const subcommand = interaction.options.getSubcommand();

    if (subcommand === "info") {
      await this.handleInfo(interaction);
    } else if (subcommand === "up") {
      await this.handlePrestigeUp(interaction);
    } else if (subcommand === "leaderboard") {
      await this.handleLeaderboard(interaction);
    }
  },

  async handleInfo(interaction) {
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
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

      return interaction.editReply({ embeds: [noProfileEmbed] });
    }

    const embed = PrestigeManager.createPrestigeInfoEmbed(
      profile,
      interaction.user
    );

    let components = [];
    if (PrestigeManager.canPrestige(profile)) {
      const prestigeButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("prestige_up_confirm")
          .setLabel("🌟 Awansuj Prestiż")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("prestige_cancel")
          .setLabel("❌ Anuluj")
          .setStyle(ButtonStyle.Danger)
      );
      components = [prestigeButton];
    }

    await interaction.editReply({
      embeds: [embed],
      components,
    });

    if (components.length > 0) {
      const collector = interaction.channel.createMessageComponentCollector({
        filter: (i) => i.user.id === interaction.user.id,
        time: 60000,
      });

      collector.on("collect", async (buttonInteraction) => {
        try {
          if (!buttonInteraction.isRepliable()) {
            console.warn("Interaction is no longer repliable");
            return;
          }

          await buttonInteraction.deferUpdate();

          if (buttonInteraction.customId === "prestige_up_confirm") {
            await this.performPrestige(buttonInteraction, profile);
          } else if (buttonInteraction.customId === "prestige_cancel") {
            const cancelEmbed = new EmbedBuilder()
              .setTitle("❌ Anulowano")
              .setDescription("Awans prestiżu został anulowany.")
              .setColor("#95a5a6");

            await buttonInteraction.editReply({
              embeds: [cancelEmbed],
              components: [],
            });
          }

          collector.stop();
        } catch (error) {
          console.error("Błąd w kolektorze prestiżu:", error);

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
                .setCustomId("prestige_up_disabled")
                .setLabel("🌟 Awansuj Prestiż")
                .setStyle(ButtonStyle.Success)
                .setDisabled(true),
              new ButtonBuilder()
                .setCustomId("prestige_cancel_disabled")
                .setLabel("❌ Anuluj")
                .setStyle(ButtonStyle.Danger)
                .setDisabled(true)
            );

            await interaction.editReply({ components: [disabledButtons] });
          }
        } catch (error) {
          console.warn("Could not disable buttons:", error.message);
        }
      });
    }
  },

  async handlePrestigeUp(interaction) {
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
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

      return interaction.editReply({ embeds: [noProfileEmbed] });
    }

    await this.performPrestige(interaction, profile);
  },

  async performPrestige(interaction, profile) {
    const result = await PrestigeManager.performPrestige(
      interaction.user.id,
      interaction.guild.id
    );

    if (!result.success) {
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Nie można awansować prestiżu")
        .setDescription(result.reason)
        .setColor("#e74c3c")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }));

      return interaction.editReply({
        embeds: [errorEmbed],
        components: [],
      });
    }

    const prestigeEmbed = PrestigeManager.createPrestigeEmbed(
      result,
      interaction.user
    );

    levelingCache.invalidateUser(interaction.user.id, interaction.guild.id);

    await interaction.editReply({
      embeds: [prestigeEmbed],
      components: [],
    });

    try {
      const announcementEmbed = new EmbedBuilder()
        .setTitle("🌟 NOWY PRESTIŻ! 🌟")
        .setDescription(
          `${interaction.user} właśnie awansował na **Prestiż ${result.newPrestige}**! 🎉`
        )
        .setColor("#f1c40f")
        .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
        .setTimestamp();

      await interaction.followUp({ embeds: [announcementEmbed] });
    } catch (error) {
      console.error("Błąd podczas wysyłania ogłoszenia o prestiżu:", error);
    }
  },

  async handleLeaderboard(interaction) {
    const limit = interaction.options.getInteger("limit") || 10;

    let leaderboard = levelingCache.getLeaderboard(
      interaction.guild.id,
      "prestige"
    );

    if (!leaderboard) {
      leaderboard = await PrestigeManager.getPrestigeLeaderboard(
        interaction.guild.id,
        limit
      );
      levelingCache.setLeaderboard(
        interaction.guild.id,
        "prestige",
        leaderboard,
        300
      );
    }

    if (leaderboard.length === 0) {
      const noDataEmbed = new EmbedBuilder()
        .setTitle("📊 Ranking Prestiżu")
        .setDescription("Brak danych do wyświetlenia rankingu prestiżu.")
        .setColor("#95a5a6")
        .setFooter({ text: `${interaction.guild.name}` });

      return interaction.editReply({ embeds: [noDataEmbed] });
    }

    const embed = new EmbedBuilder()
      .setTitle("🌟 Ranking Prestiżu")
      .setDescription(`Top ${leaderboard.length} graczy z najwyższym prestiżem`)
      .setColor("#f1c40f")
      .setFooter({
        text: `${interaction.guild.name} • Aktualizowane co 5 minut`,
      })
      .setTimestamp();

    const rankingText = [];
    for (const entry of leaderboard) {
      const user = await interaction.client.users
        .fetch(entry.userId)
        .catch(() => null);
      const username = user ? user.displayName : "Nieznany użytkownik";

      let rankEmoji = "🥉";
      if (entry.rank === 1) rankEmoji = "🥇";
      else if (entry.rank === 2) rankEmoji = "🥈";

      const prestigeText = entry.prestige > 0 ? `P${entry.prestige}` : "Brak";
      const levelText = `Lv.${entry.level}`;
      const effectiveText =
        entry.effectiveLevel !== entry.level
          ? ` (${entry.effectiveLevel})`
          : "";

      rankingText.push(
        `${rankEmoji} **#${entry.rank}** ${username}\n` +
          `🌟 Prestiż: **${prestigeText}** | 📊 Poziom: **${levelText}${effectiveText}**\n` +
          `💎 Prestiż XP: **${entry.prestigeXp.toLocaleString()}**`
      );
    }

    embed.setDescription(
      `${embed.data.description}\n\n${rankingText.join("\n\n")}`
    );

    const userEntry = leaderboard.find(
      (entry) => entry.userId === interaction.user.id
    );
    if (userEntry) {
      embed.addFields([
        {
          name: "👤 Twoja pozycja",
          value: `**#${userEntry.rank}** • Prestiż ${userEntry.prestige} • Poziom ${userEntry.level}`,
          inline: false,
        },
      ]);
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
