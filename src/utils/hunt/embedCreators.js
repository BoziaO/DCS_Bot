const { EmbedBuilder } = require("discord.js");

/**
 * Tworzy embed dla pustego polowania
 * @param {Object} locationData - Dane lokacji
 * @param {number} sanityLoss - Utrata poczytalności
 * @param {number} currentSanity - Aktualna poczytalność
 * @returns {EmbedBuilder} Embed pustego polowania
 */
const createEmptyHuntEmbed = (locationData, sanityLoss, currentSanity) => {
  return new EmbedBuilder()
    .setTitle(`${locationData.emoji} Puste polowanie`)
    .setDescription(
      `Przeszukałeś **${locationData.name}**, ale nie znalazłeś żadnego ducha. Może następnym razem będziesz miał więcej szczęścia...`
    )
    .addFields({
      name: "Skutki",
      value: `Stracona poczytalność: **${sanityLoss}%**\nAktualna poczytalność: **${currentSanity}%**`,
    })
    .setColor("#95a5a6")
    .setTimestamp();
};

/**
 * Tworzy embed polowania w toku
 * @param {Object} params - Parametry polowania
 * @returns {EmbedBuilder} Embed polowania w toku
 */
const createHuntInProgressEmbed = (params) => {
  const {
    settings,
    locationData,
    userSanity,
    evidence,
    chosenItemName,
    totalTime,
  } = params;

  const embed = new EmbedBuilder()
    .setTitle(`👻 Polowanie w toku... (${settings.name})`)
    .setDescription(
      `**Lokacja:** ${locationData.emoji} ${locationData.name}\n**Poczytalność:** ${userSanity}%`
    )
    .addFields({
      name: "Zebrane dowody",
      value:
        evidence.length > 0
          ? `• ${evidence.join("\n• ")}`
          : "• Brak wyraźnych dowodów...",
      inline: true,
    })
    .setColor("#34495e")
    .setFooter({
      text: `Masz ${Math.ceil(
        totalTime / 1000
      )} sekund na identyfikację ducha.`,
    });

  if (chosenItemName) {
    embed.addFields({
      name: "Używany przedmiot",
      value: chosenItemName,
      inline: true,
    });
  }

  return embed;
};

/**
 * Tworzy embed wyniku polowania
 * @param {Object} params - Parametry wyniku
 * @returns {EmbedBuilder} Embed wyniku polowania
 */
const createHuntResultEmbed = (params) => {
  const { huntState, userProfile, isSuccess } = params;

  const resultColor = isSuccess ? "#2ecc71" : "#e74c3c";
  const resultTitle = isSuccess ? "✅ Sukces!" : "❌ Porażka!";
  const resultDesc = isSuccess
    ? `Doskonale! To był **${huntState.targetGhost.name}**.\nZarobki: **$${huntState.earnings}**`
    : `Niestety, to był **${huntState.targetGhost.name}**.\nNagroda pocieszenia: **$${huntState.earnings}**`;

  const embed = new EmbedBuilder()
    .setTitle(resultTitle)
    .setDescription(resultDesc)
    .addFields(
      {
        name: "Statystyki",
        value: `Stracona poczytalność: **${
          huntState.initialSanity - huntState.finalSanity
        }%**\nAktualna poczytalność: **${huntState.finalSanity}%**\nPassa: **${
          userProfile.huntStreak
        }**`,
        inline: true,
      },
      {
        name: "Ogólne statystyki",
        value: `Polowania: **${userProfile.totalHunts}**\nSukces: **${
          userProfile.successfulHunts
        }**\nWinrate: **${
          userProfile.totalHunts > 0
            ? Math.round(
                (userProfile.successfulHunts / userProfile.totalHunts) * 100
              )
            : 0
        }%**`,
        inline: true,
      }
    )
    .setColor(resultColor)
    .setTimestamp();

  if (huntState.bonusReport.length > 0) {
    embed.addFields({
      name: "Raport z polowania",
      value: huntState.bonusReport.join("\n"),
    });
  }

  return embed;
};

/**
 * Tworzy embed timeout polowania
 * @param {Object} params - Parametry timeout
 * @returns {EmbedBuilder} Embed timeout
 */
const createTimeoutEmbed = (params) => {
  const { targetGhostName, sanityLoss, finalSanity } = params;

  return new EmbedBuilder()
    .setTitle("⏰ Czas minął!")
    .setDescription(
      `Duch **${targetGhostName}** uciekł w panice! Strach był tak wielki, że straciłeś więcej poczytalności.`
    )
    .addFields({
      name: "Konsekwencje",
      value: `Stracona poczytalność: **${sanityLoss}%**\nAktualna poczytalność: **${finalSanity}%**\nPassa przerwana: **0**`,
    })
    .setColor("#95a5a6")
    .setTimestamp();
};

/**
 * Tworzy embed błędu
 * @param {string} title - Tytuł błędu
 * @param {string} description - Opis błędu
 * @returns {EmbedBuilder} Embed błędu
 */
const createErrorEmbed = (
  title = "❌ Błąd podczas polowania",
  description = "Wystąpił nieoczekiwany błąd. Spróbuj ponownie za chwilę."
) => {
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(description)
    .setColor("#e74c3c")
    .setTimestamp();
};

/**
 * Tworzy embed timeout polowania
 * @param {Object} params - Parametry timeout
 * @returns {EmbedBuilder} Embed timeout
 */
const createEvidenceEmbed = (user, huntState) => {
  return new EmbedBuilder()
    .setTitle("🔍 Zebrane dowody")
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setDescription(
      huntState.collectedEvidence.length > 0
        ? huntState.collectedEvidence.map((e) => `✅ ${e}`).join("\n")
        : "*Brak dowodów*"
    )
    .setColor("#FFFF00");
};

module.exports = {
  createEmptyHuntEmbed,
  createHuntInProgressEmbed,
  createHuntResultEmbed,
  createTimeoutEmbed,
  createErrorEmbed,
  createEvidenceEmbed,
};
