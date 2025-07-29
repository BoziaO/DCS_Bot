const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const DailyChallengeConfig = require("../../models/DailyChallengeConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("remove-dailychallenge")
    .setDescription("Wyłącza lub usuwa konfigurację codziennych wyzwań.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("action")
        .setDescription("Wybierz akcję do wykonania")
        .addChoices(
          { name: "⏸️ Wyłącz (zachowaj konfigurację)", value: "disable" },
          { name: "🗑️ Usuń całkowicie", value: "delete" }
        )
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const action = interaction.options.getString("action");

    const config = await DailyChallengeConfig.findOne({
      guildId: interaction.guild.id,
    });

    if (!config) {
      const noConfigEmbed = new EmbedBuilder()
        .setTitle("❌ Brak konfiguracji")
        .setDescription(
          "System codziennych wyzwań nie był skonfigurowany na tym serwerze.\n\nUżyj `/setup-dailychallenge` aby go skonfigurować."
        )
        .setColor("#e74c3c");

      return interaction.editReply({ embeds: [noConfigEmbed] });
    }

    let embed;

    if (action === "disable") {
      await DailyChallengeConfig.findByIdAndUpdate(config._id, {
        enabled: false,
      });

      embed = new EmbedBuilder()
        .setTitle("⏸️ Codzienne Wyzwania Wyłączone")
        .setDescription(
          "Pomyślnie wyłączono automatyczne wysyłanie codziennych wyzwań.\n\nKonfiguracja została zachowana - możesz je ponownie włączyć używając `/setup-dailychallenge`."
        )
        .setColor("#f39c12")
        .addFields([
          {
            name: "📍 Zachowana konfiguracja",
            value: `**Kanał:** <#${
              config.channelId
            }>\n**Częstotliwość:** ${this.getFrequencyText(
              config.renewalFrequency,
              config.customHour
            )}`,
            inline: false,
          },
          {
            name: "💡 Jak ponownie włączyć?",
            value:
              "Użyj `/setup-dailychallenge` z tym samym kanałem aby ponownie włączyć wyzwania.",
            inline: false,
          },
        ]);
    } else if (action === "delete") {
      await DailyChallengeConfig.findByIdAndDelete(config._id);

      embed = new EmbedBuilder()
        .setTitle("🗑️ Konfiguracja Usunięta")
        .setDescription(
          "Pomyślnie usunięto całą konfigurację codziennych wyzwań.\n\nAby ponownie skonfigurować wyzwania, użyj `/setup-dailychallenge`."
        )
        .setColor("#e74c3c")
        .addFields([
          {
            name: "🔄 Usunięta konfiguracja",
            value: `**Kanał:** <#${
              config.channelId
            }>\n**Częstotliwość:** ${this.getFrequencyText(
              config.renewalFrequency,
              config.customHour
            )}\n**Ostatnie odnowienie:** ${
              config.lastRenewal
                ? `<t:${Math.floor(
                    new Date(config.lastRenewal).getTime() / 1000
                  )}:R>`
                : "Nigdy"
            }`,
            inline: false,
          },
        ]);
    }

    embed.setFooter({
      text: `Akcja wykonana • ${interaction.guild.name}`,
      iconURL: interaction.guild.iconURL(),
    });

    await interaction.editReply({ embeds: [embed] });
  },

  getFrequencyText(frequency, customHour = 8) {
    const frequencyTexts = {
      hourly: "Co godzinę",
      every3hours: "Co 3 godziny",
      every6hours: "Co 6 godzin",
      every12hours: "Co 12 godzin",
      daily: `Codziennie o ${customHour}:00`,
    };

    return frequencyTexts[frequency] || "Codziennie";
  },
};
