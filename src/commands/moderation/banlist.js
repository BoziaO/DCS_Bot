const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("banlist")
    .setDescription("Wyświetla listę zbanowanych użytkowników na serwerze.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute(interaction) {
    await interaction.deferReply();

    try {
      const bans = await interaction.guild.bans.fetch();

      if (bans.size === 0) {
        return interaction.editReply(
          "Na tym serwerze nie ma żadnych zbanowanych użytkowników."
        );
      }

      let description = "";
      bans.forEach((ban) => {
        const banReason = ban.reason
          ? ban.reason.replace(/\n/g, " ")
          : "Brak powodu";
        description += `**${ban.user.tag}** (ID: \`${ban.user.id}\`)\n*Powód:* ${banReason}\n\n`;
      });

      const embed = new EmbedBuilder()
        .setTitle(
          `Lista banów na serwerze ${interaction.guild.name} (${bans.size})`
        )
        .setColor("#ff6b81")
        .setDescription(description)
        .setTimestamp();

      if (description.length > 4096) {
        const truncatedDescription = description.substring(0, 4000);
        embed.setDescription(
          truncatedDescription +
            `\n...i więcej. Lista jest zbyt długa, aby ją w całości wyświetlić.`
        );
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Błąd podczas pobierania listy banów:", error);
      await interaction.editReply(
        "Wystąpił błąd podczas próby pobrania listy banów."
      );
    }
  },
};
