const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const DailyChallengeConfig = require("../../models/DailyChallengeConfig");
const dailyChallengeScheduler = require("../../utils/challenges/dailyChallengeScheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("renew-dailychallenge")
    .setDescription("Ręcznie odnawia codzienne wyzwanie dla tego serwera.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await DailyChallengeConfig.findOne({
        guildId: interaction.guild.id,
      });

      if (!config) {
        const noConfigEmbed = new EmbedBuilder()
          .setTitle("❌ Brak konfiguracji")
          .setDescription(
            "Ten serwer nie ma skonfigurowanych codziennych wyzwań.\n\nUżyj `/setup-dailychallenge` aby je skonfigurować."
          )
          .setColor("#e74c3c");

        return interaction.editReply({ embeds: [noConfigEmbed] });
      }

      if (!config.enabled) {
        const disabledEmbed = new EmbedBuilder()
          .setTitle("❌ Wyzwania wyłączone")
          .setDescription(
            "Codzienne wyzwania są wyłączone dla tego serwera.\n\nUżyj `/setup-dailychallenge` aby je włączyć."
          )
          .setColor("#e74c3c");

        return interaction.editReply({ embeds: [disabledEmbed] });
      }

      const channel = await interaction.client.channels
        .fetch(config.channelId)
        .catch(() => null);
      if (!channel) {
        const noChannelEmbed = new EmbedBuilder()
          .setTitle("❌ Kanał nie istnieje")
          .setDescription(
            "Skonfigurowany kanał dla wyzwań nie istnieje.\n\nUżyj `/setup-dailychallenge` aby skonfigurować nowy kanał."
          )
          .setColor("#e74c3c");

        return interaction.editReply({ embeds: [noChannelEmbed] });
      }

      await dailyChallengeScheduler.manualRenewal(interaction.guild.id);

      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Wyzwanie odnowione")
        .setDescription(`Pomyślnie wysłano nowe wyzwanie na kanał ${channel}.`)
        .setColor("#2ecc71")
        .addFields([
          {
            name: "📍 Kanał",
            value: `${channel}`,
            inline: true,
          },
          {
            name: "⏰ Częstotliwość",
            value: this.getFrequencyText(
              config.renewalFrequency,
              config.customHour
            ),
            inline: true,
          },
          {
            name: "🕐 Ostatnie odnowienie",
            value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
            inline: true,
          },
        ])
        .setFooter({
          text: `Ręczne odnowienie • ${interaction.guild.name}`,
          iconURL: interaction.guild.iconURL(),
        });

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      console.error("Błąd podczas ręcznego odnowienia wyzwania:", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Błąd odnowienia")
        .setDescription(
          "Wystąpił błąd podczas odnowienia wyzwania. Spróbuj ponownie później."
        )
        .setColor("#e74c3c")
        .addFields([
          {
            name: "🔍 Szczegóły błędu",
            value: `\`\`\`${error.message}\`\`\``,
            inline: false,
          },
        ]);

      await interaction.editReply({ embeds: [errorEmbed] });
    }
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
