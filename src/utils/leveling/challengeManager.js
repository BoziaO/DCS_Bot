const Challenge = require("../../models/Challenge");
const UserChallenge = require("../../models/UserChallenge");
const Profile = require("../../models/Profile");
const { EmbedBuilder } = require("discord.js");

class ChallengeManager {
  constructor() {
    this.cache = new Map();
    this.loadChallenges();
    this.setupDailyReset();
  }

  /**
   * Ładuje wyzwania do cache
   */
  async loadChallenges() {
    try {
      const challenges = await Challenge.find({
        enabled: true,
        endDate: { $gt: new Date() },
      });

      for (const challenge of challenges) {
        this.cache.set(challenge.id, challenge);
      }

      console.log(`Załadowano ${challenges.length} aktywnych wyzwań do cache`);
    } catch (error) {
      console.error("Błąd podczas ładowania wyzwań:", error);
    }
  }

  /**
   * Konfiguruje automatyczne resetowanie dziennych wyzwań
   */
  setupDailyReset() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    setTimeout(() => {
      this.resetDailyChallenges();

      setInterval(() => this.resetDailyChallenges(), 24 * 60 * 60 * 1000);
    }, msUntilMidnight);
  }

  /**
   * Resetuje dzienne wyzwania
   */
  async resetDailyChallenges() {
    try {
      console.log("Resetowanie dziennych wyzwań...");

      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      await Challenge.deleteMany({
        type: "daily",
        endDate: { $lt: new Date() },
      });

      await this.generateDailyChallenges();

      await this.loadChallenges();

      console.log("Dzienne wyzwania zostały zresetowane");
    } catch (error) {
      console.error("Błąd podczas resetowania dziennych wyzwań:", error);
    }
  }

  /**
   * Generuje nowe dzienne wyzwania
   */
  async generateDailyChallenges() {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const dailyChallenges = [
      {
        id: `daily_messages_${today.toISOString().split("T")[0]}`,
        name: "Aktywny Rozmówca",
        description: "Wyślij 20 wiadomości na czacie",
        emoji: "💬",
        type: "daily",
        category: "activity",
        requirements: { sendMessages: 20 },
        rewards: { xp: 100, money: 50 },
        startDate: today,
        endDate: tomorrow,
        difficulty: "easy",
      },
      {
        id: `daily_xp_${today.toISOString().split("T")[0]}`,
        name: "Zdobywca Doświadczenia",
        description: "Zdobądź 500 XP",
        emoji: "⭐",
        type: "daily",
        category: "leveling",
        requirements: { gainXp: 500 },
        rewards: { xp: 200, money: 100 },
        startDate: today,
        endDate: tomorrow,
        difficulty: "medium",
      },
      {
        id: `daily_investigate_${today.toISOString().split("T")[0]}`,
        name: "Śledczy Dnia",
        description: "Ukończ 3 investigate",
        emoji: "🔍",
        type: "daily",
        category: "investigate",
        requirements: { completeInvestigations: 3 },
        rewards: {
          xp: 300,
          money: 200,
          xpBooster: { multiplier: 1.5, duration: 60 },
        },
        startDate: today,
        endDate: tomorrow,
        difficulty: "medium",
      },
    ];

    const selectedChallenges = this.shuffleArray(dailyChallenges).slice(
      0,
      Math.floor(Math.random() * 2) + 2
    );

    for (const challengeData of selectedChallenges) {
      const challenge = new Challenge(challengeData);
      await challenge.save();
    }
  }

  /**
   * Miesza tablicę (Fisher-Yates shuffle)
   */
  shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  /**
   * Aktualizuje postęp wyzwań użytkownika
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @param {string} action - Typ akcji
   * @param {number} amount - Ilość
   * @returns {Promise<Array>} Lista ukończonych wyzwań
   */
  async updateProgress(userId, guildId, action, amount = 1) {
    try {
      const completedChallenges = [];
      const activeChallenges = await this.getActiveChallenges(guildId);

      for (const challenge of activeChallenges) {
        const requirement = this.getRequirementForAction(challenge, action);
        if (!requirement) continue;

        let userChallenge = await UserChallenge.findOne({
          userId,
          guildId,
          challengeId: challenge.id,
        });

        if (!userChallenge) {
          userChallenge = new UserChallenge({
            userId,
            guildId,
            challengeId: challenge.id,
            progress: new Map(),
          });
        }

        const currentProgress = userChallenge.progress.get(action) || 0;
        const newProgress = currentProgress + amount;
        userChallenge.progress.set(action, newProgress);

        if (!userChallenge.completed && newProgress >= requirement) {
          userChallenge.completed = true;
          userChallenge.completedAt = new Date();
          userChallenge.completionCount++;

          await this.applyRewards(userId, guildId, challenge);

          completedChallenges.push({
            challenge,
            userChallenge,
          });

          await Challenge.findOneAndUpdate(
            { id: challenge.id },
            { $inc: { completedBy: 1 } }
          );
        }

        await userChallenge.save();
      }

      return completedChallenges;
    } catch (error) {
      console.error("Błąd podczas aktualizacji postępu wyzwań:", error);
      return [];
    }
  }

  /**
   * Pobiera wymaganie dla danej akcji
   * @param {Object} challenge - Wyzwanie
   * @param {string} action - Akcja
   * @returns {number|null} Wymagana ilość
   */
  getRequirementForAction(challenge, action) {
    const actionMap = {
      sendMessage: "sendMessages",
      gainXp: "gainXp",
      earnMoney: "earnMoney",
      spendMoney: "spendMoney",
      completeInvestigation: "completeInvestigations",
      completeHunt: "completeHunts",
      findItem: "findItems",
      identifyGhost: "identifyGhosts",
      useCommand: "useCommands",
      beActive: "beActive",
    };

    const requirementKey = actionMap[action];
    return requirementKey ? challenge.requirements[requirementKey] : null;
  }

  /**
   * Stosuje nagrody za ukończenie wyzwania
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @param {Object} challenge - Wyzwanie
   */
  async applyRewards(userId, guildId, challenge) {
    try {
      const profile = await Profile.findOne({ userId, guildId });
      if (!profile) return;

      const rewards = challenge.rewards;

      if (rewards.xp) {
        profile.xp = (profile.xp || 0) + rewards.xp;
      }

      if (rewards.money) {
        profile.balance = (profile.balance || 0) + rewards.money;
        profile.totalEarnings = (profile.totalEarnings || 0) + rewards.money;
      }

      if (rewards.items && rewards.items.length > 0) {
        if (!profile.inventory) profile.inventory = [];

        for (const rewardItem of rewards.items) {
          const existingItem = profile.inventory.find(
            (item) => item.name === rewardItem.name
          );
          if (existingItem) {
            existingItem.quantity += rewardItem.quantity;
          } else {
            profile.inventory.push({
              name: rewardItem.name,
              quantity: rewardItem.quantity,
            });
          }
        }
      }

      if (rewards.xpBooster) {
        if (!profile.xpBoosters) profile.xpBoosters = [];

        const expiresAt = new Date();
        expiresAt.setMinutes(
          expiresAt.getMinutes() + rewards.xpBooster.duration
        );

        profile.xpBoosters.push({
          name: `Nagroda za wyzwanie: ${challenge.name}`,
          description: `Bonus XP za ukończenie wyzwania`,
          multiplier: rewards.xpBooster.multiplier,
          expiresAt: expiresAt,
        });
      }

      profile.completedChallenges = (profile.completedChallenges || 0) + 1;

      await profile.save();
    } catch (error) {
      console.error("Błąd podczas stosowania nagród za wyzwanie:", error);
    }
  }

  /**
   * Pobiera aktywne wyzwania dla serwera
   * @param {string} guildId - ID serwera
   * @returns {Promise<Array>} Lista aktywnych wyzwań
   */
  async getActiveChallenges(guildId) {
    try {
      const now = new Date();
      return await Challenge.find({
        enabled: true,
        startDate: { $lte: now },
        endDate: { $gt: now },
        $or: [{ guildId: guildId }, { guildId: null }],
      });
    } catch (error) {
      console.error("Błąd podczas pobierania aktywnych wyzwań:", error);
      return [];
    }
  }

  /**
   * Pobiera wyzwania użytkownika
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @returns {Promise<Array>} Lista wyzwań użytkownika
   */
  async getUserChallenges(userId, guildId) {
    try {
      const activeChallenges = await this.getActiveChallenges(guildId);
      const userChallenges = await UserChallenge.find({ userId, guildId });

      const result = [];

      for (const challenge of activeChallenges) {
        const userChallenge = userChallenges.find(
          (uc) => uc.challengeId === challenge.id
        );

        result.push({
          challenge,
          userChallenge: userChallenge || {
            progress: new Map(),
            completed: false,
            completionCount: 0,
          },
        });
      }

      return result;
    } catch (error) {
      console.error("Błąd podczas pobierania wyzwań użytkownika:", error);
      return [];
    }
  }

  /**
   * Tworzy embed z informacją o ukończonym wyzwaniu
   * @param {Object} challenge - Wyzwanie
   * @param {Object} user - Użytkownik Discord
   * @returns {EmbedBuilder} Embed z wyzwaniem
   */
  createChallengeCompletedEmbed(challenge, user) {
    const difficultyColors = {
      easy: "#27ae60",
      medium: "#f39c12",
      hard: "#e74c3c",
      extreme: "#8e44ad",
    };

    const difficultyNames = {
      easy: "Łatwe",
      medium: "Średnie",
      hard: "Trudne",
      extreme: "Ekstremalne",
    };

    const embed = new EmbedBuilder()
      .setTitle(`${challenge.emoji} Wyzwanie ukończone!`)
      .setDescription(`**${challenge.name}**\n${challenge.description}`)
      .setColor(difficultyColors[challenge.difficulty] || "#27ae60")
      .setThumbnail(user.displayAvatarURL({ dynamic: true }))
      .addFields([
        {
          name: "⚡ Trudność",
          value: difficultyNames[challenge.difficulty] || "Średnie",
          inline: true,
        },
        {
          name: "📂 Kategoria",
          value: this.getCategoryName(challenge.category),
          inline: true,
        },
        {
          name: "⏰ Typ",
          value: this.getTypeName(challenge.type),
          inline: true,
        },
      ])
      .setFooter({ text: `Świetna robota, ${user.displayName}!` })
      .setTimestamp();

    if (challenge.rewards) {
      const rewardText = [];
      if (challenge.rewards.xp) rewardText.push(`+${challenge.rewards.xp} XP`);
      if (challenge.rewards.money)
        rewardText.push(`+${challenge.rewards.money} 💰`);
      if (challenge.rewards.items && challenge.rewards.items.length > 0) {
        const itemText = challenge.rewards.items
          .map((item) => `${item.name} x${item.quantity}`)
          .join(", ");
        rewardText.push(itemText);
      }
      if (challenge.rewards.xpBooster) {
        rewardText.push(
          `XP Booster x${challenge.rewards.xpBooster.multiplier} (${challenge.rewards.xpBooster.duration}min)`
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
      activity: "Aktywność",
      leveling: "Levelowanie",
      economy: "Ekonomia",
      investigate: "Investigate",
      hunt: "Hunt",
      social: "Społeczne",
      special: "Specjalne",
    };

    return categories[category] || category;
  }

  /**
   * Pobiera nazwę typu wyzwania
   * @param {string} type - Typ
   * @returns {string} Nazwa typu
   */
  getTypeName(type) {
    const types = {
      daily: "Dzienne",
      weekly: "Tygodniowe",
      monthly: "Miesięczne",
      special: "Specjalne",
      event: "Eventowe",
    };

    return types[type] || type;
  }

  /**
   * Pobiera statystyki wyzwań użytkownika
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @returns {Promise<Object>} Statystyki wyzwań
   */
  async getUserChallengeStats(userId, guildId) {
    try {
      const userChallenges = await UserChallenge.find({ userId, guildId });
      const totalCompleted = userChallenges.filter((uc) => uc.completed).length;
      const totalActive = await this.getActiveChallenges(guildId);

      return {
        totalCompleted,
        totalActive: totalActive.length,
        completionRate:
          totalActive.length > 0
            ? Math.round((totalCompleted / totalActive.length) * 100)
            : 0,
        totalCompletions: userChallenges.reduce(
          (sum, uc) => sum + uc.completionCount,
          0
        ),
      };
    } catch (error) {
      console.error("Błąd podczas pobierania statystyk wyzwań:", error);
      return null;
    }
  }
}

module.exports = ChallengeManager;
