const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
} = require("discord.js");
const { cache } = require("../../utils/cache");
const cachePreloader = require("../../utils/cachePreloader");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("cache-management")
    .setDescription("Zarządzaj systemem cache bota")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand.setName("stats").setDescription("Pokaż statystyki cache")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("health").setDescription("Sprawdź zdrowie cache")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("clear")
        .setDescription("Wyczyść cache")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Typ cache do wyczyszczenia")
            .addChoices(
              { name: "Wszystko", value: "all" },
              { name: "Profile użytkowników", value: "profiles" },
              { name: "Konfiguracje gildii", value: "configs" },
              { name: "Dane gry", value: "gamedata" },
              { name: "Cooldowny", value: "cooldowns" }
            )
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("warmup").setDescription("Rozgrzej cache ponownie")
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case "stats":
          await this.handleStats(interaction);
          break;
        case "health":
          await this.handleHealth(interaction);
          break;
        case "clear":
          await this.handleClear(interaction);
          break;
        case "warmup":
          await this.handleWarmup(interaction);
          break;
        default:
          await interaction.editReply({
            content: "❌ Nieznana podkomenda.",
            ephemeral: true,
          });
      }
    } catch (error) {
      console.error("Błąd w cache-management:", error);
      await interaction.editReply({
        content: "❌ Wystąpił błąd podczas zarządzania cache.",
        ephemeral: true,
      });
    }
  },

  async handleStats(interaction) {
    const stats = cache.getStats();
    const memoryUsage = process.memoryUsage();

    const embed = new EmbedBuilder()
      .setTitle("📊 Statystyki Cache")
      .setColor("#3498db")
      .addFields([
        {
          name: "📈 Wykorzystanie",
          value: [
            `**Rozmiar:** ${stats.size}/${cache.maxSize} wpisów`,
            `**Wykorzystanie:** ${((stats.size / cache.maxSize) * 100).toFixed(
              1
            )}%`,
            `**TTL:** ${cache.defaultTTL / 1000}s domyślnie`,
          ].join("\n"),
          inline: true,
        },
        {
          name: "🎯 Wydajność",
          value: [
            `**Hit Rate:** ${(stats.hitRate * 100).toFixed(1)}%`,
            `**Trafienia:** ${stats.hits.toLocaleString()}`,
            `**Chybienia:** ${stats.misses.toLocaleString()}`,
            `**Łącznie:** ${stats.total.toLocaleString()}`,
          ].join("\n"),
          inline: true,
        },
        {
          name: "💾 Pamięć",
          value: [
            `**Heap Used:** ${Math.round(
              memoryUsage.heapUsed / 1024 / 1024
            )}MB`,
            `**Heap Total:** ${Math.round(
              memoryUsage.heapTotal / 1024 / 1024
            )}MB`,
            `**RSS:** ${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
          ].join("\n"),
          inline: true,
        },
      ])
      .setFooter({ text: "Cache Management System" })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },

  async handleHealth(interaction) {
    const health = cache.healthCheck();
    const healthColor = health.healthy ? "#2ecc71" : "#e74c3c";
    const healthStatus = health.healthy ? "✅ Zdrowy" : "⚠️ Wymaga uwagi";

    const embed = new EmbedBuilder()
      .setTitle("🏥 Zdrowie Cache")
      .setColor(healthColor)
      .addFields([
        {
          name: "📋 Status",
          value: healthStatus,
          inline: true,
        },
        {
          name: "📊 Metryki",
          value: [
            `**Rozmiar:** ${health.stats.size}/${cache.maxSize}`,
            `**Hit Rate:** ${(health.stats.hitRate * 100).toFixed(1)}%`,
            `**Pamięć:** ${health.memoryUsage.heapUsed}MB`,
          ].join("\n"),
          inline: true,
        },
      ])
      .setTimestamp();

    if (health.recommendations.length > 0) {
      embed.addFields([
        {
          name: "💡 Rekomendacje",
          value: health.recommendations.map((rec) => `• ${rec}`).join("\n"),
          inline: false,
        },
      ]);
    }

    await interaction.editReply({ embeds: [embed] });
  },

  async handleClear(interaction) {
    const type = interaction.options.getString("type");
    let clearedCount = 0;
    let description = "";

    switch (type) {
      case "all":
        clearedCount = cache.cache.size;
        cache.clear();
        description = "Wyczyszczono całą pamięć cache.";
        break;

      case "profiles":
        clearedCount = this.clearByPrefix("profile:");
        description = "Wyczyszczono profile użytkowników z cache.";
        break;

      case "configs":
        clearedCount = this.clearByPrefix("config:");
        description = "Wyczyszczono konfiguracje gildii z cache.";
        break;

      case "gamedata":
        clearedCount = this.clearByPrefix("phasmophobia:");
        description = "Wyczyszczono dane gry z cache.";
        break;

      case "cooldowns":
        clearedCount = this.clearByPrefix("cooldown:");
        description = "Wyczyszczono cooldowny z cache.";
        break;

      default:
        await interaction.editReply({
          content: "❌ Nieznany typ cache.",
          ephemeral: true,
        });
        return;
    }

    const embed = new EmbedBuilder()
      .setTitle("🧹 Cache Wyczyszczony")
      .setDescription(description)
      .setColor("#f39c12")
      .addFields([
        {
          name: "📊 Statystyki",
          value: `Usunięto **${clearedCount}** wpisów z cache.`,
          inline: false,
        },
      ])
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },

  async handleWarmup(interaction) {
    const startTime = Date.now();

    try {
      const { results, summary } = await cachePreloader.smartPreload(
        interaction.client
      );
      const duration = Date.now() - startTime;

      const embed = new EmbedBuilder()
        .setTitle("🔥 Cache Rozgrzany")
        .setDescription(`Pomyślnie rozgrzano cache w ${duration}ms`)
        .setColor("#2ecc71")
        .addFields([
          {
            name: "📊 Podsumowanie",
            value: [
              `**Załadowane elementy:** ${summary.totalItems}`,
              `**Udane strategie:** ${summary.successfulStrategies}/${summary.totalStrategies}`,
              `**Czas wykonania:** ${duration}ms`,
            ].join("\n"),
            inline: false,
          },
        ]);

      if (results.length > 0) {
        const strategiesText = results
          .filter((r) => r.successful > 0)
          .map((r) => `• ${r.strategy}: ${r.successful}/${r.total} elementów`)
          .join("\n");

        if (strategiesText) {
          embed.addFields([
            {
              name: "🎯 Strategie",
              value: strategiesText,
              inline: false,
            },
          ]);
        }
      }

      if (summary.errors.length > 0) {
        const errorsText = summary.errors
          .map((e) => `• ${e.strategy}: ${e.error}`)
          .join("\n");

        embed.addFields([
          {
            name: "⚠️ Błędy",
            value: errorsText,
            inline: false,
          },
        ]);
      }

      embed.setTimestamp();
      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Błąd Rozgrzewania")
        .setDescription("Wystąpił błąd podczas rozgrzewania cache.")
        .setColor("#e74c3c")
        .addFields([
          {
            name: "🐛 Szczegóły błędu",
            value: error.message,
            inline: false,
          },
        ])
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },

  clearByPrefix(prefix) {
    let count = 0;
    const keysToDelete = [];

    for (const [key] of cache.cache.entries()) {
      if (key.startsWith(prefix)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      cache.delete(key);
      count++;
    }

    return count;
  },
};
