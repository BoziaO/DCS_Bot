const Profile = require("../../models/Profile");
const LevelCalculator = require("./levelCalculator");
const { EmbedBuilder } = require("discord.js");

class PrestigeManager {
  /**
   * Sprawdza czy użytkownik może awansować prestiż
   * @param {Object} profile - Profil użytkownika
   * @returns {boolean} Czy może awansować prestiż
   */
  static canPrestige(profile) {
    const currentLevel = LevelCalculator.calculateLevel(profile.xp);
    return currentLevel >= 100;
  }

  /**
   * Oblicza wymagane XP dla następnego prestiżu
   * @param {number} prestige - Aktualny prestiż
   * @returns {number} Wymagane XP
   */
  static getPrestigeRequirement(prestige) {
    return LevelCalculator.calculateXpForLevel(100);
  }

  /**
   * Oblicza bonusy za prestiż
   * @param {number} prestige - Poziom prestiżu
   * @returns {Object} Bonusy za prestiż
   */
  static getPrestigeBonuses(prestige) {
    return {
      xpMultiplier: 1 + prestige * 0.1,
      moneyMultiplier: 1 + prestige * 0.05,
      maxLevel: 100 + prestige * 10,
      specialRewards: this.getSpecialRewards(prestige),
    };
  }

  /**
   * Pobiera specjalne nagrody za prestiż
   * @param {number} prestige - Poziom prestiżu
   * @returns {Object} Specjalne nagrody
   */
  static getSpecialRewards(prestige) {
    const rewards = {
      title: null,
      badge: null,
      items: [],
      permanentBonuses: [],
    };

    if (prestige >= 1) rewards.title = "⭐ Prestiżowy";
    if (prestige >= 3) rewards.title = "🌟 Elitarny";
    if (prestige >= 5) rewards.title = "✨ Legendarny";
    if (prestige >= 10) rewards.title = "💫 Mistrzowski";
    if (prestige >= 15) rewards.title = "🔥 Nieśmiertelny";
    if (prestige >= 20) rewards.title = "👑 Boski";

    if (prestige >= 1) rewards.badge = "⭐";
    if (prestige >= 5) rewards.badge = "🌟";
    if (prestige >= 10) rewards.badge = "💫";
    if (prestige >= 15) rewards.badge = "🔥";
    if (prestige >= 20) rewards.badge = "👑";

    if (prestige === 1) {
      rewards.items.push({ name: "Prestiżowy Amulet", quantity: 1 });
    }
    if (prestige === 5) {
      rewards.items.push({ name: "Elitarna Odznaka", quantity: 1 });
    }
    if (prestige === 10) {
      rewards.items.push({ name: "Legendarny Kryształ", quantity: 1 });
    }

    if (prestige >= 3) {
      rewards.permanentBonuses.push("Podwójne nagrody weekendowe");
    }
    if (prestige >= 7) {
      rewards.permanentBonuses.push("Bonus za długie serie aktywności");
    }
    if (prestige >= 12) {
      rewards.permanentBonuses.push("Dostęp do ekskluzywnych wyzwań");
    }

    return rewards;
  }

  /**
   * Wykonuje awans prestiżu
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @returns {Promise<Object|null>} Wynik awansu prestiżu
   */
  static async performPrestige(userId, guildId) {
    try {
      const profile = await Profile.findOne({ userId, guildId });
      if (!profile) return null;

      if (!this.canPrestige(profile)) {
        return { success: false, reason: "Nie osiągnąłeś poziomu 100" };
      }

      const oldPrestige = profile.prestige || 0;
      const newPrestige = oldPrestige + 1;

      const currentXp = profile.xp || 0;
      const prestigeXpGain = Math.floor(currentXp * 0.2);

      profile.prestige = newPrestige;
      profile.prestigeXp = (profile.prestigeXp || 0) + prestigeXpGain;
      profile.xp = Math.floor(currentXp * 0.1);
      profile.level = LevelCalculator.calculateLevel(profile.xp);

      const specialRewards = this.getSpecialRewards(newPrestige);

      if (specialRewards.items.length > 0) {
        if (!profile.inventory) profile.inventory = new Map();

        for (const item of specialRewards.items) {
          if (profile.inventory.has(item.name)) {
            const currentQuantity = profile.inventory.get(item.name);
            profile.inventory.set(item.name, currentQuantity + item.quantity);
          } else {
            profile.inventory.set(item.name, item.quantity);
          }
        }
      }

      const moneyBonus = 10000 * newPrestige;
      profile.balance = (profile.balance || 0) + moneyBonus;
      profile.totalEarnings = (profile.totalEarnings || 0) + moneyBonus;

      await profile.save();

      return {
        success: true,
        oldPrestige,
        newPrestige,
        prestigeXpGain,
        moneyBonus,
        specialRewards,
        bonuses: this.getPrestigeBonuses(newPrestige),
      };
    } catch (error) {
      console.error("Błąd podczas awansu prestiżu:", error);
      return { success: false, reason: "Błąd systemu" };
    }
  }

  /**
   * Oblicza efektywny poziom z uwzględnieniem prestiżu
   * @param {Object} profile - Profil użytkownika
   * @returns {Object} Informacje o efektywnym poziomie
   */
  static getEffectiveLevel(profile) {
    const baseLevel = LevelCalculator.calculateLevel(profile.xp);
    const prestige = profile.prestige || 0;
    const prestigeXp = profile.prestigeXp || 0;

    const prestigeBonus = Math.floor(prestigeXp / 10000);
    const effectiveLevel = baseLevel + prestige * 100 + prestigeBonus;

    return {
      baseLevel,
      prestige,
      prestigeXp,
      prestigeBonus,
      effectiveLevel,
      displayLevel: `${baseLevel}${prestige > 0 ? ` (P${prestige})` : ""}`,
    };
  }

  /**
   * Pobiera ranking prestiżu
   * @param {string} guildId - ID serwera
   * @param {number} limit - Limit wyników
   * @returns {Promise<Array>} Ranking prestiżu
   */
  static async getPrestigeLeaderboard(guildId, limit = 10) {
    try {
      const profiles = await Profile.find({ guildId })
        .sort({
          prestige: -1,
          prestigeXp: -1,
          xp: -1,
        })
        .limit(limit);

      return profiles.map((profile, index) => {
        const effectiveLevel = this.getEffectiveLevel(profile);
        return {
          rank: index + 1,
          userId: profile.userId,
          prestige: profile.prestige || 0,
          prestigeXp: profile.prestigeXp || 0,
          level: effectiveLevel.baseLevel,
          effectiveLevel: effectiveLevel.effectiveLevel,
          displayLevel: effectiveLevel.displayLevel,
        };
      });
    } catch (error) {
      console.error("Błąd podczas pobierania rankingu prestiżu:", error);
      return [];
    }
  }

  /**
   * Tworzy embed z informacją o awansie prestiżu
   * @param {Object} result - Wynik awansu prestiżu
   * @param {Object} user - Użytkownik Discord
   * @returns {EmbedBuilder} Embed z awansem prestiżu
   */
  static createPrestigeEmbed(result, user) {
    const embed = new EmbedBuilder()
      .setTitle("🌟 AWANS PRESTIŻU! 🌟")
      .setDescription(
        `Gratulacje ${user}! Osiągnąłeś/aś **Prestiż ${result.newPrestige}**!`
      )
      .setColor("#f1c40f")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields([
        {
          name: "⭐ Nowy Prestiż",
          value: `${result.newPrestige}`,
          inline: true,
        },
        {
          name: "💎 Prestiż XP",
          value: `+${result.prestigeXpGain.toLocaleString()}`,
          inline: true,
        },
        {
          name: "💰 Bonus Pieniędzy",
          value: `+${result.moneyBonus.toLocaleString()}`,
          inline: true,
        },
      ])
      .setFooter({ text: "Twoja podróż na nowy poziom rozpoczyna się teraz!" })
      .setTimestamp();

    const bonuses = result.bonuses;
    const bonusText = [
      `XP Multiplier: x${bonuses.xpMultiplier}`,
      `Money Multiplier: x${bonuses.moneyMultiplier}`,
      `Max Level: ${bonuses.maxLevel}`,
    ];

    embed.addFields([
      {
        name: "🎯 Nowe Bonusy",
        value: bonusText.join("\n"),
        inline: false,
      },
    ]);

    const specialRewards = result.specialRewards;
    if (
      specialRewards.title ||
      specialRewards.items.length > 0 ||
      specialRewards.permanentBonuses.length > 0
    ) {
      const rewardText = [];

      if (specialRewards.title) {
        rewardText.push(`**Tytuł:** ${specialRewards.title}`);
      }

      if (specialRewards.items.length > 0) {
        const itemText = specialRewards.items
          .map((item) => `${item.name} x${item.quantity}`)
          .join(", ");
        rewardText.push(`**Przedmioty:** ${itemText}`);
      }

      if (specialRewards.permanentBonuses.length > 0) {
        rewardText.push(
          `**Stałe bonusy:** ${specialRewards.permanentBonuses.join(", ")}`
        );
      }

      embed.addFields([
        {
          name: "🎁 Specjalne Nagrody",
          value: rewardText.join("\n"),
          inline: false,
        },
      ]);
    }

    return embed;
  }

  /**
   * Tworzy embed z informacjami o prestiżu
   * @param {Object} profile - Profil użytkownika
   * @param {Object} user - Użytkownik Discord
   * @returns {EmbedBuilder} Embed z informacjami o prestiżu
   */
  static createPrestigeInfoEmbed(profile, user) {
    const effectiveLevel = this.getEffectiveLevel(profile);
    const canPrestigeNow = this.canPrestige(profile);
    const bonuses = this.getPrestigeBonuses(profile.prestige || 0);

    const embed = new EmbedBuilder()
      .setTitle("🌟 System Prestiżu")
      .setDescription(`Informacje o prestiżu dla ${user.displayName}`)
      .setColor(canPrestigeNow ? "#f1c40f" : "#3498db")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields([
        {
          name: "⭐ Aktualny Prestiż",
          value: `${profile.prestige || 0}`,
          inline: true,
        },
        {
          name: "💎 Prestiż XP",
          value: `${(profile.prestigeXp || 0).toLocaleString()}`,
          inline: true,
        },
        {
          name: "🎯 Efektywny Poziom",
          value: `${effectiveLevel.effectiveLevel}`,
          inline: true,
        },
        {
          name: "📊 Aktualne Bonusy",
          value: `XP: x${bonuses.xpMultiplier}\nPieniądze: x${bonuses.moneyMultiplier}\nMax Level: ${bonuses.maxLevel}`,
          inline: true,
        },
        {
          name: "🚀 Status Prestiżu",
          value: canPrestigeNow
            ? "✅ Możesz awansować prestiż!"
            : `❌ Potrzebujesz poziomu 100 (aktualnie: ${effectiveLevel.baseLevel})`,
          inline: true,
        },
      ])
      .setFooter({ text: "Użyj /prestige aby awansować na wyższy prestiż!" })
      .setTimestamp();

    const nextPrestige = (profile.prestige || 0) + 1;
    const nextBonuses = this.getPrestigeBonuses(nextPrestige);
    const nextRewards = this.getSpecialRewards(nextPrestige);

    if (nextRewards.title || nextRewards.items.length > 0) {
      const nextRewardText = [];
      if (nextRewards.title) nextRewardText.push(`Tytuł: ${nextRewards.title}`);
      if (nextRewards.items.length > 0) {
        const itemText = nextRewards.items
          .map((item) => `${item.name} x${item.quantity}`)
          .join(", ");
        nextRewardText.push(`Przedmioty: ${itemText}`);
      }

      embed.addFields([
        {
          name: `🎁 Nagrody za Prestiż ${nextPrestige}`,
          value: nextRewardText.join("\n") || "Brak specjalnych nagród",
          inline: false,
        },
      ]);
    }

    return embed;
  }
}

module.exports = PrestigeManager;
