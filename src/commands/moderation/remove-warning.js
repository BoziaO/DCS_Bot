const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const Warning = require("../../models/Warning");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-warning")
    .setDescription("Usuwa konkretne ostrzeżenie na podstawie jego ID.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addStringOption((option) =>
      option
        .setName("id")
        .setDescription("ID ostrzeżenia, które chcesz usunąć.")
        .setRequired(true)
    ),

  async execute(interaction) {
    const warningId = interaction.options.getString("id");

    const deletedWarning = await Warning.findOneAndDelete({
      _id: warningId,
      guildId: interaction.guild.id,
    });

    if (!deletedWarning) {
      return interaction.reply({
        content: "Nie znaleziono ostrzeżenia o podanym ID na tym serwerze.",
        ephemeral: true,
      });
    }

    const targetUser = await interaction.client.users.fetch(
      deletedWarning.userId
    );

    const embed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("✅ Usunięto Ostrzeżenie")
      .setDescription(
        `Pomyślnie usunięto ostrzeżenie dla użytkownika **${targetUser.tag}**.`
      )
      .addFields(
        { name: "Usunięty powód", value: deletedWarning.reason },
        { name: "Moderator usuwający", value: interaction.user.toString() }
      )
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
