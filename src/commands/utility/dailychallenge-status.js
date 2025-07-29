const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const DailyChallengeConfig = require("../../models/DailyChallengeConfig");
const dailyChallengeScheduler = require("../../utils/challenges/dailyChallengeScheduler");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("dailychallenge-status")
    .setDescription("Sprawdza status codziennych wyzwań dla tego serwera.")
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

      const schedulerStatus = dailyChallengeScheduler.getStatus();

      let channelStatus = "❌ Nie znaleziono";
      let channelMention = "Kanał nie istnieje";

      try {
        const channel = await interaction.client.channels.fetch(
          config.channelId
        );
        if (channel) {
          channelStatus = "✅ Aktywny";
          channelMention = `${channel}`;
        }
      } catch (error) {
        channelStatus = "❌ Błąd dostępu";
      }

      const nextRenewal = this.getNextRenewalTime(config);

      const embed = new EmbedBuilder()
        .setTitle("📊 Status Codziennych Wyzwań")
        .setDescription(
          `Status systemu codziennych wyzwań dla serwera **${interaction.guild.name}**`
        )
        .setColor(config.enabled ? "#2ecc71" : "#e74c3c")
        .addFields([
          {
            name: "📍 Kanał",
            value: `${channelMention}\n**Status:** ${channelStatus}`,
            inline: true,
          },
          {
            name: "⚙️ Konfiguracja",
            value: `**Status:** ${
              config.enabled ? "✅ Włączone" : "❌ Wyłączone"
            }\n**Częstotliwość:** ${this.getFrequencyText(
              config.renewalFrequency,
              config.customHour
            )}`,
            inline: true,
          },
          {
            name: "🕐 Czasy",
            value: `**Ostatnie odnowienie:** ${
              config.lastRenewal
                ? `<t:${Math.floor(
                    new Date(config.lastRenewal).getTime() / 1000
                  )}:R>`
                : "Nigdy"
            }\n**Następne odnowienie:** ${nextRenewal}`,
            inline: false,
          },
          {
            name: "🔧 Scheduler",
            value: `**Status:** ${
              schedulerStatus.initialized
                ? "✅ Zainicjalizowany"
                : "❌ Nie zainicjalizowany"
            }\n**Aktywne serwery:** ${schedulerStatus.activeGuilds}`,
            inline: true,
          },
          {
            name: "📈 Zadania",
            value: this.getTasksStatus(schedulerStatus.tasks),
            inline: true,
          },
        ])
        .setFooter({
          text: `Status sprawdzony • ${new Date().toLocaleString("pl-PL")}`,
          iconURL: interaction.guild.iconURL(),
        })
        .setTimestamp();

      const warnings = [];
      if (!config.enabled) warnings.push("⚠️ Wyzwania są wyłączone");
      if (channelStatus.includes("❌")) warnings.push("⚠️ Problem z kanałem");
      if (!schedulerStatus.initialized)
        warnings.push("⚠️ Scheduler nie jest zainicjalizowany");

      if (warnings.length > 0) {
        embed.addFields([
          {
            name: "⚠️ Ostrzeżenia",
            value: warnings.join("\n"),
            inline: false,
          },
        ]);
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Błąd podczas sprawdzania statusu wyzwań:", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Błąd sprawdzania statusu")
        .setDescription("Wystąpił błąd podczas sprawdzania statusu wyzwań.")
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

  getNextRenewalTime(config) {
    const now = new Date();
    const frequency = config.renewalFrequency;

    switch (frequency) {
      case "hourly":
        const nextHour = new Date(now);
        nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
        return `<t:${Math.floor(nextHour.getTime() / 1000)}:R>`;

      case "every3hours":
        const next3Hours = new Date(now);
        next3Hours.setHours(next3Hours.getHours() + 3, 0, 0, 0);
        return `<t:${Math.floor(next3Hours.getTime() / 1000)}:R>`;

      case "every6hours":
        const next6Hours = new Date(now);
        next6Hours.setHours(next6Hours.getHours() + 6, 0, 0, 0);
        return `<t:${Math.floor(next6Hours.getTime() / 1000)}:R>`;

      case "every12hours":
        const next12Hours = new Date(now);
        next12Hours.setHours(next12Hours.getHours() + 12, 0, 0, 0);
        return `<t:${Math.floor(next12Hours.getTime() / 1000)}:R>`;

      case "daily":
      default:
        const nextDay = new Date(now);
        const customHour = config.customHour || 8;

        if (now.getHours() < customHour) {
          nextDay.setHours(customHour, 0, 0, 0);
        } else {
          nextDay.setDate(nextDay.getDate() + 1);
          nextDay.setHours(customHour, 0, 0, 0);
        }

        return `<t:${Math.floor(nextDay.getTime() / 1000)}:R>`;
    }
  },

  getTasksStatus(tasks) {
    const taskStatuses = [];

    for (const [name, task] of Object.entries(tasks)) {
      const status = task.running ? "✅" : "❌";
      taskStatuses.push(`${status} ${name}`);
    }

    return taskStatuses.length > 0 ? taskStatuses.join("\n") : "Brak zadań";
  },
};
