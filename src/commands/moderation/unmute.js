const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Usuwa wyciszenie z użytkownika.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Użytkownik do odciszenia.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Powód odciszenia.")
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("user");
    const reason =
      interaction.options.getString("reason") || "Nie podano powodu.";
    const targetMember = await interaction.guild.members
      .fetch(targetUser.id)
      .catch(() => null);

    if (!targetMember) {
      return interaction.editReply({
        content: "Nie można znaleźć tego użytkownika na serwerze.",
        ephemeral: true,
      });
    }
    if (!targetMember.isCommunicationDisabled()) {
      return interaction.editReply({
        content: "Ten użytkownik nie jest wyciszony.",
        ephemeral: true,
      });
    }
    if (!targetMember.moderatable) {
      return interaction.editReply({
        content: "Nie mogę zarządzać tym użytkownikiem.",
        ephemeral: true,
      });
    }

    try {
      await targetMember.timeout(
        null,
        `${reason} (Odciszony przez: ${interaction.user.tag})`
      );

      const successEmbed = new EmbedBuilder()
        .setColor("#2ed573")
        .setTitle("Użytkownik odciszony")
        .setDescription(
          `Pomyślnie usunięto wyciszenie z **${targetUser.tag}**.`
        )
        .addFields({ name: "Powód", value: reason })
        .setTimestamp();

      await interaction.editReply({ embeds: [successEmbed], ephemeral: true });
    } catch (error) {
      console.error("Błąd podczas usuwania wyciszenia:", error);
      await interaction.editReply({
        content: "Wystąpił błąd podczas próby usunięcia wyciszenia.",
        ephemeral: true,
      });
    }
  },
};
