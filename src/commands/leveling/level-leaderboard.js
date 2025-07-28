const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const Profile = require("../../models/Profile");

const calculateLevel = (xp) => {
  return Math.floor(0.1 * Math.sqrt(xp || 0));
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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("level-leaderboard")
    .setDescription(
      "Pokaż ranking użytkowników serwera na podstawie statystyk."
    )
    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Typ rankingu")
        .setRequired(false)
        .addChoices(
          { name: "Poziom", value: "xp" },
          { name: "Wiadomości", value: "messages" }
        )
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const type = interaction.options.getString("type") || "xp";
    const itemsPerPage = 10;
    let currentPage = 0;
    const guildId = interaction.guild.id;

    const getSortField = (type) => {
      switch (type) {
        case "messages":
          return { messageCount: -1 };
        default:
          return { xp: -1 };
      }
    };

    const getTypeTitle = (type) => {
      switch (type) {
        case "messages":
          return "💬 Ranking Aktywności";
        default:
          return "🏆 Ranking Poziomów";
      }
    };

    const getTypeEmoji = (type) => {
      switch (type) {
        case "messages":
          return "💬";
        default:
          return "🏆";
      }
    };

    const fetchAndBuildEmbed = async (page, totalPages, userRankData) => {
      const profiles = await Profile.find({ guildId })
        .sort(getSortField(type))
        .skip(page * itemsPerPage)
        .limit(itemsPerPage);

      const embed = new EmbedBuilder()
        .setTitle(`${getTypeTitle(type)} - Strona ${page + 1}/${totalPages}`)
        .setColor("#3498db")
        .setTimestamp()
        .setFooter({ text: `Serwer: ${interaction.guild.name}` });

      if (profiles.length === 0) {
        embed.setDescription("Brak danych do wyświetlenia.");
        return embed;
      }

      let description = "";

      for (let i = 0; i < profiles.length; i++) {
        const profile = profiles[i];
        const position = page * itemsPerPage + i + 1;

        try {
          const user = await interaction.client.users.fetch(profile.userId, {
            cache: true,
          });
          const level = calculateLevel(profile.xp || 0);

          let medal = "";
          if (position === 1) medal = "🥇";
          else if (position === 2) medal = "🥈";
          else if (position === 3) medal = "🥉";
          else medal = `**${position}.**`;

          let value = "";
          switch (type) {
            case "messages":
              value = `${(
                profile.messageCount || 0
              ).toLocaleString()} wiadomości`;
              break;
            default:
              value = `Level ${level} (${(
                profile.xp || 0
              ).toLocaleString()} XP)`;
          }

          if (type === "xp") {
            description += `${medal} **${user.username}** • ${getRankTitle(
              level
            )}\n> ${value}\n`;
          } else {
            description += `${medal} **${user.username}**\n> ${value}\n`;
          }
        } catch (error) {
          description += `${position}. *Użytkownik opuścił serwer*\n`;
        }
      }

      embed.setDescription(description.trim());

      if (userRankData.position > 0) {
        embed.addFields([
          {
            name: "📍 Twoja pozycja",
            value: `**#${userRankData.position}** - ${userRankData.value}`,
            inline: false,
          },
        ]);
      }

      return embed;
    };

    const totalProfiles = await Profile.countDocuments({ guildId });
    if (totalProfiles === 0) {
      const emptyEmbed = new EmbedBuilder()
        .setTitle(getTypeTitle(type))
        .setDescription("Brak danych do wyświetlenia.")
        .setColor("#95a5a6");
      return interaction.editReply({ embeds: [emptyEmbed] });
    }

    const totalPages = Math.ceil(totalProfiles / itemsPerPage);

    const userProfile = await Profile.findOne({
      userId: interaction.user.id,
      guildId,
    });
    let userRankData = { position: 0, value: "Brak danych" };

    if (userProfile) {
      const sortKey = Object.keys(getSortField(type))[0];
      const userValueRaw = userProfile[sortKey] || 0;

      const userPosition =
        (await Profile.countDocuments({
          guildId,
          [sortKey]: { $gt: userValueRaw },
        })) + 1;

      let userValueFormatted = "";
      const userLevel = calculateLevel(userProfile.xp);
      switch (type) {
        case "messages":
          userValueFormatted = `${(
            userProfile.messageCount || 0
          ).toLocaleString()} wiadomości`;
          break;
        default:
          userValueFormatted = `Level ${userLevel} (${(
            userProfile.xp || 0
          ).toLocaleString()} XP)`;
      }
      userRankData = { position: userPosition, value: userValueFormatted };
    }

    const initialEmbed = await fetchAndBuildEmbed(
      currentPage,
      totalPages,
      userRankData
    );

    if (totalPages <= 1) {
      return interaction.editReply({ embeds: [initialEmbed] });
    }

    const createButtons = (page, maxPage) => {
      return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("first")
          .setEmoji("⏮️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId("prev")
          .setEmoji("◀️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page === 0),
        new ButtonBuilder()
          .setCustomId("next")
          .setEmoji("▶️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= maxPage - 1),
        new ButtonBuilder()
          .setCustomId("last")
          .setEmoji("⏭️")
          .setStyle(ButtonStyle.Primary)
          .setDisabled(page >= maxPage - 1)
      );
    };

    const message = await interaction.editReply({
      embeds: [initialEmbed],
      components: [createButtons(currentPage, totalPages)],
    });

    const collector = message.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 300000,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();
      switch (i.customId) {
        case "first":
          currentPage = 0;
          break;
        case "prev":
          currentPage = Math.max(0, currentPage - 1);
          break;
        case "next":
          currentPage = Math.min(totalPages - 1, currentPage + 1);
          break;
        case "last":
          currentPage = totalPages - 1;
          break;
      }

      const newEmbed = await fetchAndBuildEmbed(
        currentPage,
        totalPages,
        userRankData
      );
      await i.editReply({
        embeds: [newEmbed],
        components: [createButtons(currentPage, totalPages)],
      });
    });

    collector.on("end", () => {
      interaction
        .editReply({
          components: [],
        })
        .catch(() => {});
    });
  },
};
