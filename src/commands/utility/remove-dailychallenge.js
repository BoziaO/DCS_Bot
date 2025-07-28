const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const DailyChallengeConfig = require("../../models/DailyChallengeConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-dailychallenge")
    .setDescription("Wyłącza automatyczne wysyłanie codziennych wyzwań.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const result = await DailyChallengeConfig.findOneAndDelete({
      guildId: interaction.guild.id,
    });

    if (!result) {
      return interaction.editReply({
        content:
          "System codziennych wyzwań nie był skonfigurowany na tym serwerze.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("✅ Codzienne Wyzwania Wyłączone")
      .setDescription(
        "Pomyślnie wyłączono automatyczne wysyłanie codziennych wyzwań."
      )
      .setColor("#e74c3c");

    await interaction.editReply({ embeds: [embed] });
  },
};
