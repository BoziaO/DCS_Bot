const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");
const LogConfig = require("../../models/LogConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-logs")
    .setDescription("Konfiguruje kanał do logowania zdarzeń na serwerze.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Kanał, na który będą wysyłane logi.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("channel");

    await LogConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { channelId: channel.id },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setTitle("✅ System Logów Skonfigurowany")
      .setDescription(`Pomyślnie ustawiono kanał logów na ${channel}.`)
      .setColor("#2ecc71");

    await interaction.editReply({ embeds: [embed] });
  },
};
