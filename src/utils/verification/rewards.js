const { EmbedBuilder } = require("discord.js");

class VerificationRewards {
  static getRewardTypes() {
    return {
      basic: {
        name: "Podstawowa Weryfikacja",
        description: "Standardowa rola investigatora",
        rewards: [
          "🎯 Rola Investigator",
          "📋 Dostęp do kanałów misyjnych",
          "🎤 Dostęp do pokoi głosowych",
        ],
      },
      challenge_completed: {
        name: "Mistrz Wyzwań",
        description: "Ukończenie wyzwania weryfikacyjnego",
        rewards: [
          "🎯 Rola Investigator",
          "🏆 Rola Challenge Master",
          "📋 Dostęp do kanałów misyjnych",
          "🎤 Dostęp do pokoi głosowych",
          "⭐ 50 punktów doświadczenia",
          "💰 100 monet startowych",
        ],
      },
      speed_verification: {
        name: "Szybka Weryfikacja",
        description: "Weryfikacja w czasie poniżej 10 sekund",
        rewards: [
          "🎯 Rola Investigator",
          "⚡ Rola Speed Runner",
          "📋 Dostęp do kanałów misyjnych",
          "🎤 Dostęp do pokoi głosowych",
          "⭐ 25 punktów doświadczenia",
        ],
      },
      perfect_score: {
        name: "Perfekcyjny Wynik",
        description: "Wszystkie odpowiedzi poprawne w wyzwaniu",
        rewards: [
          "🎯 Rola Investigator",
          "🧠 Rola Ghost Expert",
          "📋 Dostęp do kanałów misyjnych",
          "🎤 Dostęp do pokoi głosowych",
          "⭐ 100 punktów doświadczenia",
          "💰 200 monet startowych",
          "🎁 Specjalny starter pack",
        ],
      },
    };
  }

  static createRewardEmbed(rewardType, user, additionalInfo = {}) {
    const rewards = this.getRewardTypes();
    const reward = rewards[rewardType];

    if (!reward) {
      throw new Error(`Nieznany typ nagrody: ${rewardType}`);
    }

    const embed = new EmbedBuilder()
      .setTitle(`🎉 ${reward.name}`)
      .setDescription(
        `**Gratulacje ${user.displayName}!**\n\n${
          reward.description
        }\n\n**Otrzymane nagrody:**\n${reward.rewards
          .map((r) => `• ${r}`)
          .join("\n")}`
      )
      .setColor("#00FF00")
      .setThumbnail(user.displayAvatarURL())
      .setFooter({ text: "Witaj w zespole investigatorów!" })
      .setTimestamp();

    if (rewardType === "challenge_completed" && additionalInfo.challengeType) {
      embed.addFields({
        name: "🏆 Ukończone Wyzwanie",
        value: additionalInfo.challengeType,
        inline: true,
      });
    }

    if (additionalInfo.timeTaken) {
      embed.addFields({
        name: "⏱️ Czas Weryfikacji",
        value: `${additionalInfo.timeTaken}s`,
        inline: true,
      });
    }

    if (additionalInfo.score) {
      embed.addFields({
        name: "📊 Wynik",
        value: `${additionalInfo.score.correct}/${additionalInfo.score.total}`,
        inline: true,
      });
    }

    return embed;
  }

  static getWelcomeMessage(rewardType, user, guild) {
    const messages = {
      basic: [
        `🎯 ${user.displayName} dołączył do zespołu investigatorów!`,
        `👻 Nowy investigator w ${guild.name}! Witaj ${user.displayName}!`,
        `🔍 ${user.displayName} jest gotowy na pierwszą misję!`,
      ],
      challenge_completed: [
        `🏆 ${user.displayName} ukończył wyzwanie i dołączył do elitarnego zespołu!`,
        `⭐ Mistrz wyzwań ${user.displayName} dołączył do nas!`,
        `🧠 ${user.displayName} udowodnił swoją wiedzę i został investigatorem!`,
      ],
      speed_verification: [
        `⚡ ${user.displayName} zweryfikował się błyskawicznie!`,
        `🏃‍♂️ Speed runner ${user.displayName} dołączył do zespołu!`,
        `💨 ${user.displayName} pobił rekord szybkości weryfikacji!`,
      ],
      perfect_score: [
        `🌟 ${user.displayName} osiągnął perfekcyjny wynik!`,
        `🎯 Ekspert od duchów ${user.displayName} dołączył do nas!`,
        `👑 ${user.displayName} to prawdziwy mistrz paranormalnych!`,
      ],
    };

    const messageArray = messages[rewardType] || messages.basic;
    return messageArray[Math.floor(Math.random() * messageArray.length)];
  }

  static async giveRewards(member, rewardType, additionalData = {}) {
    const rewards = this.getRewardTypes();
    const reward = rewards[rewardType];

    if (!reward) {
      throw new Error(`Nieznany typ nagrody: ${rewardType}`);
    }

    const results = {
      roles: [],
      experience: 0,
      coins: 0,
      items: [],
    };

    try {
      if (rewardType === "challenge_completed") {
        results.experience = 50;
        results.coins = 100;
      } else if (rewardType === "speed_verification") {
        results.experience = 25;
      } else if (rewardType === "perfect_score") {
        results.experience = 100;
        results.coins = 200;
        results.items.push("Starter Pack");
      }

      return results;
    } catch (error) {
      console.error("Błąd podczas nadawania nagród:", error);
      throw error;
    }
  }

  static getMotivationalQuotes() {
    return [
      "Każdy investigator zaczynał od pierwszego kroku w ciemność.",
      "Duchy mogą być przerażające, ale razem jesteśmy silniejsi.",
      "Twoja odwaga zostanie nagrodzona w świecie paranormalnych.",
      "Pamiętaj: EMF Reader to Twój najlepszy przyjaciel.",
      "W ciemności kryją się odpowiedzi na najtrudniejsze pytania.",
      "Każde polowanie to lekcja, każda misja to doświadczenie.",
      "Investigatorzy nigdy nie chodzą sami - masz nas za sobą.",
      "Szałwia, krucyfiks i odwaga - to wszystko czego potrzebujesz.",
    ];
  }

  static getRandomQuote() {
    const quotes = this.getMotivationalQuotes();
    return quotes[Math.floor(Math.random() * quotes.length)];
  }
}

module.exports = VerificationRewards;
