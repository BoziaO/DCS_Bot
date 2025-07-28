const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const LocationManager = require("../../utils/investigate/locationManager");
const { maps } = require("../../data/phasmophobiaData");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("locations")
    .setDescription("Wyświetl dostępne lokacje do badania.")
    .addStringOption((option) =>
      option
        .setName("filter")
        .setDescription("Filtruj lokacje według typu lub trudności")
        .addChoices(
          { name: "⭐ Łatwe (1 gwiazdka)", value: "difficulty_1" },
          { name: "⭐⭐ Średnie (2 gwiazdki)", value: "difficulty_2" },
          { name: "⭐⭐⭐ Trudne (3 gwiazdki)", value: "difficulty_3" },
          { name: "⭐⭐⭐⭐ Koszmarny (4 gwiazdki)", value: "difficulty_4" },
          { name: "🏠 Domy", value: "type_house" },
          { name: "🏥 Szpitale/Kliniki", value: "type_medical" },
          { name: "🔒 Więzienia", value: "type_prison" },
          { name: "⚰️ Cmentarze", value: "type_cemetery" },
          { name: "🏫 Szkoły", value: "type_school" },
          { name: "🏕️ Kempingi", value: "type_campsite" },
          { name: "🚜 Gospodarstwa", value: "type_farmhouse" }
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const locationManager = new LocationManager();
    const filter = interaction.options.getString("filter");

    let locations = locationManager.getAllLocations();
    let title = "🗺️ Wszystkie dostępne lokacje";

    if (filter) {
      const [filterType, filterValue] = filter.split("_");

      if (filterType === "difficulty") {
        const difficulty = parseInt(filterValue);
        locations = locationManager.getLocationsByDifficulty(difficulty);
        title = `🗺️ Lokacje - Poziom trudności: ${"⭐".repeat(difficulty)}`;
      } else if (filterType === "type") {
        locations = locationManager.getLocationsByType(filterValue);
        const typeNames = {
          house: "Domy",
          medical: "Szpitale/Kliniki",
          prison: "Więzienia",
          cemetery: "Cmentarze",
          school: "Szkoły",
          campsite: "Kempingi",
          farmhouse: "Gospodarstwa",
        };
        title = `🗺️ Lokacje - Typ: ${typeNames[filterValue] || filterValue}`;
      }
    }

    if (locations.length === 0) {
      return interaction.editReply({
        content: "❌ Nie znaleziono lokacji spełniających wybrane kryteria.",
        ephemeral: true,
      });
    }

    const locationsPerPage = 5;
    const totalPages = Math.ceil(locations.length / locationsPerPage);
    let currentPage = 0;

    const createLocationEmbed = (page) => {
      const start = page * locationsPerPage;
      const end = start + locationsPerPage;
      const pageLocations = locations.slice(start, end);

      const embed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(
          `Strona ${page + 1}/${totalPages} • Łącznie lokacji: ${
            locations.length
          }`
        )
        .setColor("#3498db")
        .setTimestamp();

      pageLocations.forEach((location, index) => {
        const dangerStars = "⭐".repeat(location.dangerLevel);
        const sizeInfo = location.size ? ` • Rozmiar: ${location.size}` : "";

        let additionalInfo = "";
        if (location.originalMap) {
          const originalMapData = maps.find(
            (map) => map.name === location.originalMap
          );
          if (originalMapData) {
            additionalInfo = ` • 🎮 Phasmophobia`;
            if (originalMapData.maxPlayers) {
              additionalInfo += ` (${originalMapData.maxPlayers} graczy)`;
            }
            if (originalMapData.objectives) {
              additionalInfo += `\n**Cele w grze:** ${originalMapData.objectives
                .slice(0, 2)
                .join(", ")}${
                originalMapData.objectives.length > 2 ? "..." : ""
              }`;
            }
          } else {
            additionalInfo = " • 🎮 Z gry Phasmophobia";
          }
        }

        const areasPreview =
          location.searchAreas.slice(0, 3).join(", ") +
          (location.searchAreas.length > 3
            ? ` i ${location.searchAreas.length - 3} więcej...`
            : "");

        embed.addFields([
          {
            name: `${location.emoji} ${location.name}`,
            value:
              `*${location.description}*\n` +
              `**Trudność:** ${dangerStars} • **Mnożnik:** x${location.baseMultiplier}${sizeInfo}${additionalInfo}\n` +
              `**Obszary:** ${areasPreview}`,
            inline: false,
          },
        ]);
      });

      return embed;
    };

    const createNavigationButtons = (page, totalPages) => {
      const row = new ActionRowBuilder();

      row.addComponents(
        new ButtonBuilder()
          .setCustomId("prev_page")
          .setLabel("◀️ Poprzednia")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === 0)
      );

      row.addComponents(
        new ButtonBuilder()
          .setCustomId("page_info")
          .setLabel(`${page + 1}/${totalPages}`)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(true)
      );

      row.addComponents(
        new ButtonBuilder()
          .setCustomId("next_page")
          .setLabel("Następna ▶️")
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(page === totalPages - 1)
      );

      row.addComponents(
        new ButtonBuilder()
          .setCustomId("location_stats")
          .setLabel("📊 Statystyki")
          .setStyle(ButtonStyle.Success)
      );

      return row;
    };

    const embed = createLocationEmbed(currentPage);
    const buttons =
      totalPages > 1
        ? createNavigationButtons(currentPage, totalPages)
        : new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("location_stats")
              .setLabel("📊 Statystyki")
              .setStyle(ButtonStyle.Success)
          );

    const response = await interaction.editReply({
      embeds: [embed],
      components: [buttons],
    });

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 300000,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();

      if (i.customId === "prev_page" && currentPage > 0) {
        currentPage--;
      } else if (i.customId === "next_page" && currentPage < totalPages - 1) {
        currentPage++;
      } else if (i.customId === "location_stats") {
        const statsEmbed = this.createLocationStatsEmbed(locations);
        await i.editReply({ embeds: [statsEmbed], components: [] });
        return collector.stop();
      }

      const newEmbed = createLocationEmbed(currentPage);
      const newButtons =
        totalPages > 1
          ? createNavigationButtons(currentPage, totalPages)
          : new ActionRowBuilder().addComponents(
              new ButtonBuilder()
                .setCustomId("location_stats")
                .setLabel("📊 Statystyki")
                .setStyle(ButtonStyle.Success)
            );

      await i.editReply({
        embeds: [newEmbed],
        components: [newButtons],
      });
    });

    collector.on("end", () => {
      interaction.editReply({ components: [] }).catch(() => {});
    });
  },

  createLocationStatsEmbed(locations) {
    const stats = {
      total: locations.length,
      byDifficulty: {},
      byType: {},
      avgMultiplier: 0,
      originalMaps: 0,
    };

    let totalMultiplier = 0;

    locations.forEach((location) => {
      const difficulty = location.dangerLevel;
      stats.byDifficulty[difficulty] =
        (stats.byDifficulty[difficulty] || 0) + 1;

      stats.byType[location.type] = (stats.byType[location.type] || 0) + 1;

      totalMultiplier += location.baseMultiplier;

      if (location.originalMap) {
        stats.originalMaps++;
      }
    });

    stats.avgMultiplier = (totalMultiplier / locations.length).toFixed(2);

    const embed = new EmbedBuilder()
      .setTitle("📊 Statystyki lokacji")
      .setColor("#f39c12")
      .addFields([
        {
          name: "📍 Łączna liczba lokacji",
          value: `${stats.total}`,
          inline: true,
        },
        { name: "🎮 Mapy z gry", value: `${stats.originalMaps}`, inline: true },
        {
          name: "📈 Średni mnożnik",
          value: `x${stats.avgMultiplier}`,
          inline: true,
        },
      ]);

    const difficultyStats = Object.entries(stats.byDifficulty)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([level, count]) => `${"⭐".repeat(parseInt(level))}: ${count}`)
      .join("\n");

    if (difficultyStats) {
      embed.addFields([
        { name: "🎯 Rozkład trudności", value: difficultyStats, inline: true },
      ]);
    }

    const typeStats = Object.entries(stats.byType)
      .sort(([, a], [, b]) => b - a)
      .map(([type, count]) => {
        const typeEmojis = {
          house: "🏠",
          medical: "🏥",
          prison: "🔒",
          cemetery: "⚰️",
          school: "🏫",
          campsite: "🏕️",
          farmhouse: "🚜",
          other: "🏢",
        };
        return `${typeEmojis[type] || "🏢"} ${type}: ${count}`;
      })
      .join("\n");

    if (typeStats) {
      embed.addFields([
        { name: "🏗️ Rozkład typów", value: typeStats, inline: true },
      ]);
    }

    embed.setTimestamp();
    return embed;
  },
};
