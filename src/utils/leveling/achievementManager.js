const Achievement = require("../../models/Achievement");
const UserAchievement = require("../../models/UserAchievement");
const Profile = require("../../models/Profile");
const { EmbedBuilder } = require("discord.js");

class AchievementManager {
  constructor() {
    this.cache = new Map();
    this.loadAchievements();
  }

  /**
   * Ładuje osiągnięcia do cache
   */
  async loadAchievements() {
    try {
      const achievements = await Achievement.find({ enabled: true });
      for (const achievement of achievements) {
        this.cache.set(achievement.id, achievement);
      }
      console.log(`Załadowano ${achievements.length} osiągnięć do cache`);
    } catch (error) {
      console.error("Błąd podczas ładowania osiągnięć:", error);
    }
  }

  /**
   * Sprawdza i odblokuje osiągnięcia dla użytkownika
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @param {Object} profile - Profil użytkownika
   * @returns {Promise<Array>} Lista nowo odblokowanych osiągnięć
   */
  async checkAchievements(userId, guildId, profile) {
    try {
      const unlockedAchievements = [];
      const userAchievements = await UserAchievement.find({ userId, guildId });
      const unlockedIds = userAchievements.map((ua) => ua.achievementId);

      for (const [achievementId, achievement] of this.cache) {
        if (unlockedIds.includes(achievementId)) continue;

        if (achievement.guildId && achievement.guildId !== guildId) continue;

        if (
          await this.checkRequirements(achievement, profile, userId, guildId)
        ) {
          const newAchievement = await this.unlockAchievement(
            userId,
            guildId,
            achievementId
          );
          if (newAchievement) {
            unlockedAchievements.push({
              achievement,
              userAchievement: newAchievement,
            });
          }
        }
      }

      return unlockedAchievements;
    } catch (error) {
      console.error("Błąd podczas sprawdzania osiągnięć:", error);
      return [];
    }
  }

  /**
   * Sprawdza czy użytkownik spełnia wymagania osiągnięcia
   * @param {Object} achievement - Osiągnięcie
   * @param {Object} profile - Profil użytkownika
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @returns {Promise<boolean>} Czy wymagania są spełnione
   */
  async checkRequirements(achievement, profile, userId, guildId) {
    const req = achievement.requirements;

    if (req.level && profile.level < req.level) return false;

    if (req.totalXp && profile.xp < req.totalXp) return false;

    if (req.messageCount && profile.messageCount < req.messageCount)
      return false;

    if (req.messageStreak && profile.messageStreak < req.messageStreak)
      return false;

    if (req.balance && profile.balance < req.balance) return false;

    if (req.totalEarnings && profile.totalEarnings < req.totalEarnings)
      return false;

    if (req.moneySpent && profile.moneySpent < req.moneySpent) return false;

    if (
      req.totalInvestigations &&
      profile.totalInvestigations < req.totalInvestigations
    )
      return false;
    if (
      req.successfulInvestigations &&
      profile.successfulInvestigations < req.successfulInvestigations
    )
      return false;

    if (req.totalHunts && profile.totalHunts < req.totalHunts) return false;
    if (req.successfulHunts && profile.successfulHunts < req.successfulHunts)
      return false;
    if (req.huntStreak && profile.huntStreak < req.huntStreak) return false;
    if (req.nightmareHunts && profile.nightmareHunts < req.nightmareHunts)
      return false;

    if (req.itemsUsed && profile.itemsUsed < req.itemsUsed) return false;
    if (req.photosTaken && profile.photosTaken < req.photosTaken) return false;
    if (req.ghostsExorcised && profile.ghostsExorcised < req.ghostsExorcised)
      return false;

    if (req.accountAge) {
      const accountAge = Math.floor(
        (Date.now() - profile.createdAt) / (1000 * 60 * 60 * 24)
      );
      if (accountAge < req.accountAge) return false;
    }

    if (req.customCondition) {
      const result = await this.checkCustomCondition(
        req.customCondition,
        profile,
        userId,
        guildId
      );
      if (!result) return false;
    }

    return true;
  }

  /**
   * Sprawdza niestandardowe warunki osiągnięcia
   * @param {string} conditionName - Nazwa warunku
   * @param {Object} profile - Profil użytkownika
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @returns {Promise<boolean>} Wynik sprawdzenia
   */
  async checkCustomCondition(conditionName, profile, userId, guildId) {
    switch (conditionName) {
      case "perfectSanity":
        return profile.sanity === 100;

      case "lowSanity":
        return profile.sanity <= 10;

      case "richPlayer":
        return profile.balance >= 100000;

      case "activePlayer":
        const daysSinceLastActive = Math.floor(
          (Date.now() - profile.lastActive) / (1000 * 60 * 60 * 24)
        );
        return daysSinceLastActive <= 1;

      case "weekendWarrior":
        const now = new Date();
        const dayOfWeek = now.getDay();
        return dayOfWeek === 6 || dayOfWeek === 0;

      case "nightOwl":
        const hour = new Date().getHours();
        return hour >= 22 || hour <= 6;

      case "earlyBird":
        const morningHour = new Date().getHours();
        return morningHour >= 6 && morningHour <= 10;

      default:
        return false;
    }
  }

  /**
   * Odblokuje osiągnięcie dla użytkownika
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @param {string} achievementId - ID osiągnięcia
   * @returns {Promise<Object|null>} Odblokowane osiągnięcie
   */
  async unlockAchievement(userId, guildId, achievementId) {
    try {
      const existing = await UserAchievement.findOne({
        userId,
        guildId,
        achievementId,
      });
      if (existing) return null;

      const userAchievement = new UserAchievement({
        userId,
        guildId,
        achievementId,
        unlockedAt: new Date(),
        progress: 100,
      });

      await userAchievement.save();

      const profile = await Profile.findOne({ userId, guildId });
      if (profile) {
        if (!profile.achievements) profile.achievements = [];
        profile.achievements.push(achievementId);

        const achievement = this.cache.get(achievementId);
        if (achievement) {
          profile.achievementPoints =
            (profile.achievementPoints || 0) + achievement.points;

          await this.applyRewards(profile, achievement);
        }

        await profile.save();
      }

      await Achievement.findOneAndUpdate(
        { id: achievementId },
        { $inc: { unlockedBy: 1 } }
      );

      return userAchievement;
    } catch (error) {
      console.error("Błąd podczas odblokowywania osiągnięcia:", error);
      return null;
    }
  }

  /**
   * Stosuje nagrody za osiągnięcie
   * @param {Object} profile - Profil użytkownika
   * @param {Object} achievement - Osiągnięcie
   */
  async applyRewards(profile, achievement) {
    const rewards = achievement.rewards;

    if (rewards.xp) {
      profile.xp = (profile.xp || 0) + rewards.xp;
    }

    if (rewards.money) {
      profile.balance = (profile.balance || 0) + rewards.money;
      profile.totalEarnings = (profile.totalEarnings || 0) + rewards.money;
    }

    if (rewards.items && rewards.items.length > 0) {
      if (!profile.inventory) profile.inventory = new Map();

      for (const rewardItem of rewards.items) {
        if (profile.inventory.has(rewardItem.name)) {
          const currentQuantity = profile.inventory.get(rewardItem.name);
          profile.inventory.set(
            rewardItem.name,
            currentQuantity + rewardItem.quantity
          );
        } else {
          profile.inventory.set(rewardItem.name, rewardItem.quantity);
        }
      }
    }

    if (rewards.xpBooster) {
      if (!profile.xpBoosters) profile.xpBoosters = [];

      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + rewards.xpBooster.duration);

      profile.xpBoosters.push({
        name: `Nagroda za osiągnięcie: ${achievement.name}`,
        description: `Bonus XP za odblokowanie osiągnięcia`,
        multiplier: rewards.xpBooster.multiplier,
        expiresAt: expiresAt,
      });
    }
  }

  /**
   * Tworzy embed z informacją o odblokowanym osiągnięciu
   * @param {Object} achievement - Osiągnięcie
   * @param {Object} user - Użytkownik Discord
   * @returns {EmbedBuilder} Embed z osiągnięciem
   */
  createAchievementEmbed(achievement, user) {
    const rarityColors = {
      common: "#95a5a6",
      uncommon: "#27ae60",
      rare: "#3498db",
      epic: "#9b59b6",
      legendary: "#f39c12",
      mythic: "#e74c3c",
    };

    const rarityNames = {
      common: "Pospolite",
      uncommon: "Niepospolite",
      rare: "Rzadkie",
      epic: "Epickie",
      legendary: "Legendarne",
      mythic: "Mityczne",
    };

    const embed = new EmbedBuilder()
      .setTitle(`${achievement.emoji} Osiągnięcie odblokowane!`)
      .setDescription(`**${achievement.name}**\n${achievement.description}`)
      .setColor(rarityColors[achievement.rarity] || "#95a5a6")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields([
        {
          name: "🏆 Rzadkość",
          value: rarityNames[achievement.rarity] || "Pospolite",
          inline: true,
        },
        {
          name: "⭐ Punkty",
          value: achievement.points.toString(),
          inline: true,
        },
        {
          name: "📂 Kategoria",
          value: this.getCategoryName(achievement.category),
          inline: true,
        },
      ])
      .setFooter({ text: `Gratulacje, ${user.displayName}!` })
      .setTimestamp();

    if (achievement.rewards) {
      const rewardText = [];
      if (achievement.rewards.xp)
        rewardText.push(`+${achievement.rewards.xp} XP`);
      if (achievement.rewards.money)
        rewardText.push(`+${achievement.rewards.money} 💰`);
      if (achievement.rewards.items && achievement.rewards.items.length > 0) {
        const itemText = achievement.rewards.items
          .map((item) => `${item.name} x${item.quantity}`)
          .join(", ");
        rewardText.push(itemText);
      }
      if (achievement.rewards.xpBooster) {
        rewardText.push(
          `XP Booster x${achievement.rewards.xpBooster.multiplier} (${achievement.rewards.xpBooster.duration}min)`
        );
      }

      if (rewardText.length > 0) {
        embed.addFields([
          {
            name: "🎁 Nagrody",
            value: rewardText.join("\n"),
            inline: false,
          },
        ]);
      }
    }

    return embed;
  }

  /**
   * Pobiera nazwę kategorii
   * @param {string} category - Kategoria
   * @returns {string} Nazwa kategorii
   */
  getCategoryName(category) {
    const categories = {
      leveling: "Levelowanie",
      activity: "Aktywność",
      economy: "Ekonomia",
      social: "Społeczne",
      special: "Specjalne",
      investigate: "Investigate",
      hunt: "Hunt",
    };

    return categories[category] || category;
  }

  /**
   * Pobiera osiągnięcia użytkownika
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @returns {Promise<Array>} Lista osiągnięć użytkownika
   */
  async getUserAchievements(userId, guildId) {
    try {
      const userAchievements = await UserAchievement.find({ userId, guildId });
      const achievements = [];

      for (const userAchievement of userAchievements) {
        const achievement = this.cache.get(userAchievement.achievementId);
        if (achievement) {
          achievements.push({
            achievement,
            userAchievement,
          });
        }
      }

      return achievements.sort(
        (a, b) => b.userAchievement.unlockedAt - a.userAchievement.unlockedAt
      );
    } catch (error) {
      console.error("Błąd podczas pobierania osiągnięć użytkownika:", error);
      return [];
    }
  }

  /**
   * Pobiera statystyki osiągnięć użytkownika
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @returns {Promise<Object>} Statystyki osiągnięć
   */
  async getUserAchievementStats(userId, guildId) {
    try {
      const userAchievements = await this.getUserAchievements(userId, guildId);
      const totalAchievements = this.cache.size;

      const stats = {
        total: userAchievements.length,
        totalAvailable: totalAchievements,
        percentage: Math.round(
          (userAchievements.length / totalAchievements) * 100
        ),
        points: 0,
        byRarity: {
          common: 0,
          uncommon: 0,
          rare: 0,
          epic: 0,
          legendary: 0,
          mythic: 0,
        },
        byCategory: {
          leveling: 0,
          activity: 0,
          economy: 0,
          social: 0,
          special: 0,
          investigate: 0,
          hunt: 0,
        },
      };

      for (const { achievement } of userAchievements) {
        stats.points += achievement.points;
        stats.byRarity[achievement.rarity]++;
        stats.byCategory[achievement.category]++;
      }

      return stats;
    } catch (error) {
      console.error("Błąd podczas pobierania statystyk osiągnięć:", error);
      return null;
    }
  }
}

module.exports = AchievementManager;
