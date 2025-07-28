const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const LogConfig = require("../../models/LogConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-logs")
    .setDescription("Wyłącza system logowania zdarzeń na serwerze.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const result = await LogConfig.findOneAndDelete({
      guildId: interaction.guild.id,
    });

    if (!result) {
      return interaction.editReply(
        "System logów nie był skonfigurowany na tym serwerze."
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("✅ System Logów Wyłączony")
      .setDescription("Pomyślnie wyłączono logowanie zdarzeń na serwerze.")
      .setColor("#e74c3c");

    await interaction.editReply({ embeds: [embed] });
  },
};
