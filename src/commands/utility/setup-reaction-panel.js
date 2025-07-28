const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ChannelType,
} = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-reaction-panel")
    .setDescription("Tworzy panel, do którego można dodawać role za reakcje.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addChannelOption((option) =>
      option
        .setName("kanal")
        .setDescription("Kanał, na którym ma się pojawić panel.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("tytul")
        .setDescription("Tytuł wiadomości w panelu.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("opis")
        .setDescription("Opis w wiadomości panelu (wyjaśnij, co robią role).")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("kolor")
        .setDescription("Kolor ramki w formacie HEX (np. #3498db).")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const channel = interaction.options.getChannel("kanal");
    const title = interaction.options.getString("tytul");
    const description = interaction.options.getString("opis");
    const color = interaction.options.getString("kolor") || "#3498db";

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setFooter({ text: "Wybierz odpowiednią reakcję, aby otrzymać rolę." });

    try {
      const panelMessage = await channel.send({ embeds: [embed] });
      await interaction.editReply(
        `✅ Panel ról za reakcje został utworzony na kanale ${channel}.\nJego ID to: \`${panelMessage.id}\`.\n\nUżyj teraz komendy \`/add-reaction-role\`, aby dodać opcje.`
      );
    } catch (error) {
      console.error(error);
      await interaction.editReply(
        "Wystąpił błąd podczas wysyłania panelu. Sprawdź moje uprawnienia na tym kanale."
      );
    }
  },
};
