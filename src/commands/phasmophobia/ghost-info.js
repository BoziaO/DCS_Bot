const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { ghosts, maps } = require("../../data/phasmophobiaData");
const { cache } = require("../../utils/cache");

/**
 * Pobiera dane gry z cache lub fallback do importu
 */
const getGameData = (dataType) => {
  const cached = cache.getGameData(dataType);
  if (cached) return cached;

  switch (dataType) {
    case "ghosts":
      return ghosts;
    case "maps":
      return maps;
    default:
      return null;
  }
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ghost-info")
    .setDescription("Sprawdź informacje o duchach z Phasmophobia")
    .addStringOption((option) =>
      option
        .setName("ghost")
        .setDescription("Wybierz ducha do sprawdzenia")
        .setRequired(false)
        .setAutocomplete(true)
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused();
    const ghostsData = getGameData("ghosts");

    const filtered = ghostsData.filter((ghost) =>
      ghost.name.toLowerCase().includes(focusedValue.toLowerCase())
    );

    await interaction.respond(
      filtered.slice(0, 25).map((ghost) => ({
        name: ghost.name,
        value: ghost.name.toLowerCase(),
      }))
    );
  },

  async execute(interaction) {
    await interaction.deferReply();

    const ghostName = interaction.options.getString("ghost");

    try {
      if (!ghostName) {
        const ghostsData = getGameData("ghosts");
        const embed = new EmbedBuilder()
          .setTitle("👻 Lista Wszystkich Duchów")
          .setDescription(
            "Oto wszystkie duchy dostępne w Phasmophobia. Użyj `/ghost-info ghost:[nazwa]` aby sprawdzić szczegóły konkretnego ducha."
          )
          .setColor("#8B0000")
          .setTimestamp();

        const byDifficulty = {
          1: [],
          2: [],
          3: [],
          4: [],
          5: [],
        };

        ghostsData.forEach((ghost) => {
          const difficulty = ghost.huntDifficulty || 2;
          if (!byDifficulty[difficulty]) byDifficulty[difficulty] = [];
          byDifficulty[difficulty].push(ghost.name);
        });

        const difficultyNames = {
          1: "🟢 Łatwe",
          2: "🟡 Średnie",
          3: "🟠 Trudne",
          4: "🔴 Bardzo trudne",
          5: "⚫ Ekstremalne",
        };

        Object.entries(byDifficulty).forEach(([difficulty, ghostList]) => {
          if (ghostList.length > 0) {
            embed.addFields([
              {
                name: difficultyNames[difficulty],
                value: ghostList.join(", "),
                inline: false,
              },
            ]);
          }
        });

        embed.addFields([
          {
            name: "💡 Wskazówka",
            value:
              "Każdy duch ma unikalne zachowania i słabości. Poznanie ich jest kluczem do udanych polowań!",
            inline: false,
          },
        ]);

        return interaction.editReply({ embeds: [embed] });
      }

      const ghostsData = getGameData("ghosts");
      const ghost = ghostsData.find(
        (g) => g.name.toLowerCase() === ghostName.toLowerCase()
      );

      if (!ghost) {
        return interaction.editReply({
          content: `❌ Nie znaleziono ducha o nazwie "${ghostName}". Użyj \`/ghost-info\` bez parametrów aby zobaczyć listę wszystkich duchów.`,
          ephemeral: true,
        });
      }

      const difficultyStars = "⭐".repeat(ghost.huntDifficulty || 2);
      const aggressivenessStars = "🔥".repeat(ghost.aggressiveness || 2);

      const embed = new EmbedBuilder()
        .setTitle(`👻 ${ghost.name}`)
        .setDescription(ghost.description || "Brak opisu")
        .setColor(this.getDifficultyColor(ghost.huntDifficulty || 2))
        .addFields([
          {
            name: "🔍 Dowody",
            value: ghost.evidence.map((e) => `• ${e}`).join("\n"),
            inline: true,
          },
          {
            name: "💪 Mocne strony",
            value: ghost.strengths.map((s) => `• ${s}`).join("\n"),
            inline: true,
          },
          {
            name: "🎯 Słabości",
            value: ghost.weaknesses.map((w) => `• ${w}`).join("\n"),
            inline: false,
          },
          {
            name: "📊 Statystyki polowania",
            value: [
              `🎯 **Próg polowania:** ${
                ghost.huntThreshold || 50
              }% poczytalności`,
              `⭐ **Trudność polowania:** ${difficultyStars} (${
                ghost.huntDifficulty || 2
              }/5)`,
              `🔥 **Agresywność:** ${aggressivenessStars} (${
                ghost.aggressiveness || 2
              }/5)`,
            ].join("\n"),
            inline: true,
          },
        ])
        .setTimestamp();

      if (ghost.huntBehavior) {
        embed.addFields([
          {
            name: "🎭 Zachowanie podczas polowania",
            value: ghost.huntBehavior,
            inline: true,
          },
        ]);
      }

      if (ghost.detectionMethods && ghost.detectionMethods.length > 0) {
        embed.addFields([
          {
            name: "🔍 Metody wykrywania",
            value: ghost.detectionMethods.map((m) => `• ${m}`).join("\n"),
            inline: false,
          },
        ]);
      }

      if (ghost.suggestedActions && ghost.suggestedActions.length > 0) {
        embed.addFields([
          {
            name: "💡 Sugerowane działania",
            value: ghost.suggestedActions.map((a) => `• ${a}`).join("\n"),
            inline: false,
          },
        ]);
      }

      if (ghost.preferredLocations && ghost.preferredLocations.length > 0) {
        const mapsData = getGameData("maps");
        const preferredMapNames = ghost.preferredLocations
          .map((locationId) => {
            const map = mapsData.find(
              (m) => m.name.toLowerCase().replace(/\s+/g, "_") === locationId
            );
            return map ? `${map.emoji} ${map.name}` : locationId;
          })
          .join(", ");

        embed.setFooter({
          text: `Preferowane lokacje: ${preferredMapNames}`,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error("Błąd w komendzie ghost-info:", error);
      await interaction.editReply({
        content:
          "❌ Wystąpił błąd podczas pobierania informacji o duchu. Spróbuj ponownie później.",
        ephemeral: true,
      });
    }
  },

  getDifficultyColor(difficulty) {
    const colors = {
      1: "#00FF00",
      2: "#FFFF00",
      3: "#FF8C00",
      4: "#FF0000",
      5: "#8B0000",
    };
    return colors[difficulty] || "#808080";
  },
};
