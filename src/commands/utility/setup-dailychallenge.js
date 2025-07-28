const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require("discord.js");
const DailyChallengeConfig = require("../../models/DailyChallengeConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-dailychallenge")
    .setDescription("Konfiguruje kanał do wysyłania codziennych wyzwań.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Kanał, na który będą wysyłane wyzwania.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("channel");

    await DailyChallengeConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      { channelId: channel.id },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setTitle("✅ Skonfigurowano Codzienne Wyzwania")
      .setDescription(
        `Pomyślnie ustawiono kanał dla codziennych wyzwań na ${channel}.`
      )
      .setColor("#2ecc71")
      .setFooter({ text: "Wyzwania będą wysyłane codziennie o 8:00." });

    await interaction.editReply({ embeds: [embed] });
  },
};
