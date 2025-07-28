const Profile = require("../../models/Profile");

class XpMultiplier {
  /**
   * Oblicza końcowy mnożnik XP dla użytkownika
   * @param {Object} profile - Profil użytkownika
   * @param {Object} options - Dodatkowe opcje
   * @returns {Promise<Object>} Informacje o mnożniku
   */
  static async calculateMultiplier(profile, options = {}) {
    let totalMultiplier = 1.0;
    const activeMultipliers = [];

    const baseMultiplier = 1.0;
    activeMultipliers.push({
      name: "Bazowy",
      value: baseMultiplier,
      source: "system",
    });

    const levelMultiplier = 1 + profile.level * 0.005;
    totalMultiplier *= levelMultiplier;
    activeMultipliers.push({
      name: "Bonus za poziom",
      value: levelMultiplier,
      source: "level",
      description: `+${((levelMultiplier - 1) * 100).toFixed(1)}% za poziom ${
        profile.level
      }`,
    });

    if (profile.messageStreak && profile.messageStreak >= 7) {
      const streakMultiplier = 1 + Math.min(profile.messageStreak * 0.01, 0.5);
      totalMultiplier *= streakMultiplier;
      activeMultipliers.push({
        name: "Seria aktywności",
        value: streakMultiplier,
        source: "streak",
        description: `+${((streakMultiplier - 1) * 100).toFixed(1)}% za ${
          profile.messageStreak
        } dni z rzędu`,
      });
    }

    if (profile.premiumUntil && new Date(profile.premiumUntil) > new Date()) {
      const premiumMultiplier = 2.0;
      totalMultiplier *= premiumMultiplier;
      activeMultipliers.push({
        name: "Premium",
        value: premiumMultiplier,
        source: "premium",
        description: "Podwójne XP dla użytkowników Premium",
      });
    }

    if (profile.xpBoosters && profile.xpBoosters.length > 0) {
      const now = new Date();
      const activeBoosters = profile.xpBoosters.filter(
        (booster) => new Date(booster.expiresAt) > now
      );

      for (const booster of activeBoosters) {
        totalMultiplier *= booster.multiplier;
        activeMultipliers.push({
          name: booster.name,
          value: booster.multiplier,
          source: "booster",
          description: `${booster.description} (wygasa: ${new Date(
            booster.expiresAt
          ).toLocaleString("pl-PL")})`,
        });
      }

      if (activeBoosters.length !== profile.xpBoosters.length) {
        profile.xpBoosters = activeBoosters;
        await profile.save();
      }
    }

    if (profile.achievements && profile.achievements.length > 0) {
      const achievementMultiplier = 1 + profile.achievements.length * 0.002;
      totalMultiplier *= achievementMultiplier;
      activeMultipliers.push({
        name: "Osiągnięcia",
        value: achievementMultiplier,
        source: "achievements",
        description: `+${((achievementMultiplier - 1) * 100).toFixed(1)}% za ${
          profile.achievements.length
        } osiągnięć`,
      });
    }

    const now = new Date();
    const dayOfWeek = now.getDay();
    if (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0) {
      const weekendMultiplier = 1.25;
      totalMultiplier *= weekendMultiplier;
      activeMultipliers.push({
        name: "Bonus weekendowy",
        value: weekendMultiplier,
        source: "weekend",
        description: "+25% XP w weekendy",
      });
    }

    const hour = now.getHours();
    if (hour >= 18 && hour < 22) {
      const peakHourMultiplier = 1.15;
      totalMultiplier *= peakHourMultiplier;
      activeMultipliers.push({
        name: "Godziny szczytu",
        value: peakHourMultiplier,
        source: "peak_hours",
        description: "+15% XP między 18:00-22:00",
      });
    }

    if (options.messageLength) {
      let lengthMultiplier = 1.0;
      if (options.messageLength > 100) {
        lengthMultiplier = 1.1;
      } else if (options.messageLength < 10) {
        lengthMultiplier = 0.8;
      }

      if (lengthMultiplier !== 1.0) {
        totalMultiplier *= lengthMultiplier;
        activeMultipliers.push({
          name: "Długość wiadomości",
          value: lengthMultiplier,
          source: "message_length",
          description:
            lengthMultiplier > 1
              ? "Bonus za długą wiadomość"
              : "Kara za krótką wiadomość",
        });
      }
    }

    return {
      totalMultiplier: Math.round(totalMultiplier * 100) / 100,
      activeMultipliers,
      bonusPercentage: Math.round((totalMultiplier - 1) * 100),
    };
  }

  /**
   * Dodaje tymczasowy booster XP
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @param {Object} booster - Dane boostera
   * @returns {Promise<boolean>} Sukces operacji
   */
  static async addXpBooster(userId, guildId, booster) {
    try {
      const profile = await Profile.findOne({ userId, guildId });
      if (!profile) return false;

      if (!profile.xpBoosters) {
        profile.xpBoosters = [];
      }

      const existingIndex = profile.xpBoosters.findIndex(
        (b) => b.name === booster.name
      );

      if (existingIndex !== -1) {
        profile.xpBoosters[existingIndex].expiresAt = booster.expiresAt;
      } else {
        profile.xpBoosters.push({
          name: booster.name,
          description: booster.description,
          multiplier: booster.multiplier,
          expiresAt: booster.expiresAt,
          addedAt: new Date(),
        });
      }

      await profile.save();
      return true;
    } catch (error) {
      console.error("Błąd podczas dodawania boostera XP:", error);
      return false;
    }
  }

  /**
   * Usuwa booster XP
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @param {string} boosterName - Nazwa boostera
   * @returns {Promise<boolean>} Sukces operacji
   */
  static async removeXpBooster(userId, guildId, boosterName) {
    try {
      const profile = await Profile.findOne({ userId, guildId });
      if (!profile || !profile.xpBoosters) return false;

      profile.xpBoosters = profile.xpBoosters.filter(
        (b) => b.name !== boosterName
      );
      await profile.save();
      return true;
    } catch (error) {
      console.error("Błąd podczas usuwania boostera XP:", error);
      return false;
    }
  }

  /**
   * Pobiera aktywne boostery użytkownika
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @returns {Promise<Array>} Lista aktywnych boosterów
   */
  static async getActiveBoosters(userId, guildId) {
    try {
      const profile = await Profile.findOne({ userId, guildId });
      if (!profile || !profile.xpBoosters) return [];

      const now = new Date();
      return profile.xpBoosters.filter(
        (booster) => new Date(booster.expiresAt) > now
      );
    } catch (error) {
      console.error("Błąd podczas pobierania boosterów:", error);
      return [];
    }
  }

  /**
   * Czyści wygasłe boostery
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @returns {Promise<number>} Liczba usuniętych boosterów
   */
  static async cleanExpiredBoosters(userId, guildId) {
    try {
      const profile = await Profile.findOne({ userId, guildId });
      if (!profile || !profile.xpBoosters) return 0;

      const now = new Date();
      const originalLength = profile.xpBoosters.length;
      profile.xpBoosters = profile.xpBoosters.filter(
        (booster) => new Date(booster.expiresAt) > now
      );

      if (profile.xpBoosters.length !== originalLength) {
        await profile.save();
        return originalLength - profile.xpBoosters.length;
      }

      return 0;
    } catch (error) {
      console.error("Błąd podczas czyszczenia boosterów:", error);
      return 0;
    }
  }
}

module.exports = XpMultiplier;
