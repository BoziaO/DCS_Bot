const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
} = require("discord.js");
const welcomeChannelSchema = require("../../models/WelcomeChannel");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-welcome-channel")
    .setDescription("Usuwa konfigurację powitalną z danego kanału.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Kanał, z którego chcesz usunąć powitania.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const channel = interaction.options.getChannel("channel");

      const result = await welcomeChannelSchema.findOneAndDelete({
        guildId: interaction.guildId,
        channelId: channel.id,
      });

      if (!result) {
        await interaction.editReply(
          "Ten kanał nie był skonfigurowany do wysyłania powitań."
        );
        return;
      }

      await interaction.editReply(
        `Pomyślnie usunięto konfigurację powitalną z kanału ${channel}.`
      );
    } catch (error) {
      console.log(`Error in ${__filename}:\n`, error);
      await interaction.editReply(
        "Wystąpił błąd bazy danych. Spróbuj ponownie później."
      );
    }
  },
};
