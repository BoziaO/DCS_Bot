const cron = require("node-cron");
const {
  createDailyChallenges,
  cleanupExpiredChallenges,
} = require("./defaultChallenges");
const Challenge = require("../../models/Challenge");
const Profile = require("../../models/Profile");

class ChallengeScheduler {
  constructor() {
    this.tasks = new Map();
    this.isInitialized = false;
  }

  /**
   * Inicjalizuje scheduler wyzwań
   */
  initialize() {
    if (this.isInitialized) {
      console.log("Challenge Scheduler już zainicjalizowany");
      return;
    }

    console.log("Inicjalizacja Challenge Scheduler...");

    const dailyTask = cron.schedule(
      "1 0 * * *",
      async () => {
        console.log("Tworzenie nowych dziennych wyzwań...");
        await this.createDailyChallengesForAllGuilds();
      },
      {
        scheduled: false,
        timezone: "Europe/Warsaw",
      }
    );

    const cleanupTask = cron.schedule(
      "5 0 * * *",
      async () => {
        console.log("Czyszczenie wygasłych wyzwań...");
        await cleanupExpiredChallenges();
      },
      {
        scheduled: false,
        timezone: "Europe/Warsaw",
      }
    );

    const weeklyTask = cron.schedule(
      "10 0 * * 1",
      async () => {
        console.log("Tworzenie nowych tygodniowych wyzwań...");
        await this.createWeeklyChallengesForAllGuilds();
      },
      {
        scheduled: false,
        timezone: "Europe/Warsaw",
      }
    );

    const monthlyTask = cron.schedule(
      "15 0 1 * *",
      async () => {
        console.log("Tworzenie nowych miesięcznych wyzwań...");
        await this.createMonthlyChallengesForAllGuilds();
      },
      {
        scheduled: false,
        timezone: "Europe/Warsaw",
      }
    );

    const hourlyTask = cron.schedule(
      "0 * * * *",
      async () => {
        await this.resetDailyStats();
      },
      {
        scheduled: false,
        timezone: "Europe/Warsaw",
      }
    );

    this.tasks.set("daily", dailyTask);
    this.tasks.set("cleanup", cleanupTask);
    this.tasks.set("weekly", weeklyTask);
    this.tasks.set("monthly", monthlyTask);
    this.tasks.set("hourly", hourlyTask);

    this.isInitialized = true;
    console.log("Challenge Scheduler zainicjalizowany pomyślnie");
  }

  /**
   * Uruchamia scheduler
   */
  start() {
    if (!this.isInitialized) {
      this.initialize();
    }

    console.log("Uruchamianie Challenge Scheduler...");

    for (const [name, task] of this.tasks) {
      task.start();
      console.log(`✅ Zadanie ${name} uruchomione`);
    }

    console.log("Challenge Scheduler uruchomiony pomyślnie");
  }

  /**
   * Zatrzymuje scheduler
   */
  stop() {
    console.log("Zatrzymywanie Challenge Scheduler...");

    for (const [name, task] of this.tasks) {
      task.stop();
      console.log(`⏹️ Zadanie ${name} zatrzymane`);
    }

    console.log("Challenge Scheduler zatrzymany");
  }

  /**
   * Tworzy dzienne wyzwania dla wszystkich serwerów
   */
  async createDailyChallengesForAllGuilds() {
    try {
      const guildIds = await Profile.distinct("guildId");

      let totalCreated = 0;
      for (const guildId of guildIds) {
        const created = await createDailyChallenges(guildId);
        totalCreated += created;
      }

      console.log(
        `Utworzono ${totalCreated} nowych dziennych wyzwań dla ${guildIds.length} serwerów`
      );
      return totalCreated;
    } catch (error) {
      console.error("Błąd podczas tworzenia dziennych wyzwań:", error);
      return 0;
    }
  }

  /**
   * Tworzy tygodniowe wyzwania dla wszystkich serwerów
   */
  async createWeeklyChallengesForAllGuilds() {
    try {
      const guildIds = await Profile.distinct("guildId");
      const now = new Date();

      let totalCreated = 0;
      for (const guildId of guildIds) {
        const challenges = [
          {
            id: `weekly_messages_${guildId}_${now.toISOString().split("T")[0]}`,
            name: "Tygodniowy Komunikator",
            description: "Wyślij 200 wiadomości w tym tygodniu",
            emoji: "📱",
            type: "weekly",
            category: "activity",
            requirements: { sendMessages: 200 },
            rewards: {
              xp: 1000,
              money: 500,
              xpBooster: { multiplier: 1.5, duration: 60 },
            },
            startDate: this.getStartOfWeek(now),
            endDate: this.getEndOfWeek(now),
            guildId: guildId,
            difficulty: "medium",
          },
          {
            id: `weekly_xp_${guildId}_${now.toISOString().split("T")[0]}`,
            name: "Tygodniowy Mistrz XP",
            description: "Zdobądź 5,000 XP w tym tygodniu",
            emoji: "🌟",
            type: "weekly",
            category: "leveling",
            requirements: { gainXp: 5000 },
            rewards: { xp: 2000, money: 1000 },
            startDate: this.getStartOfWeek(now),
            endDate: this.getEndOfWeek(now),
            guildId: guildId,
            difficulty: "hard",
          },
        ];

        for (const challengeData of challenges) {
          try {
            const existing = await Challenge.findOne({ id: challengeData.id });
            if (!existing) {
              const challenge = new Challenge(challengeData);
              await challenge.save();
              totalCreated++;
            }
          } catch (error) {
            console.error(
              `Błąd podczas tworzenia tygodniowego wyzwania:`,
              error
            );
          }
        }
      }

      console.log(`Utworzono ${totalCreated} nowych tygodniowych wyzwań`);
      return totalCreated;
    } catch (error) {
      console.error("Błąd podczas tworzenia tygodniowych wyzwań:", error);
      return 0;
    }
  }

  /**
   * Tworzy miesięczne wyzwania dla wszystkich serwerów
   */
  async createMonthlyChallengesForAllGuilds() {
    try {
      const guildIds = await Profile.distinct("guildId");
      const now = new Date();

      let totalCreated = 0;
      for (const guildId of guildIds) {
        const challenges = [
          {
            id: `monthly_social_${guildId}_${now.getFullYear()}_${now.getMonth()}`,
            name: "Miesięczny Społeczny",
            description: "Wyślij 1000 wiadomości w tym miesiącu",
            emoji: "🤝",
            type: "monthly",
            category: "social",
            requirements: { sendMessages: 1000 },
            rewards: { xp: 10000, money: 5000 },
            startDate: this.getStartOfMonth(now),
            endDate: this.getEndOfMonth(now),
            guildId: guildId,
            difficulty: "extreme",
          },
          {
            id: `monthly_economy_${guildId}_${now.getFullYear()}_${now.getMonth()}`,
            name: "Miesięczny Ekonomista",
            description: "Zarobić 50,000 monet w tym miesiącu",
            emoji: "💰",
            type: "monthly",
            category: "economy",
            requirements: { earnMoney: 50000 },
            rewards: { xp: 7500, money: 10000 },
            startDate: this.getStartOfMonth(now),
            endDate: this.getEndOfMonth(now),
            guildId: guildId,
            difficulty: "extreme",
          },
        ];

        for (const challengeData of challenges) {
          try {
            const existing = await Challenge.findOne({ id: challengeData.id });
            if (!existing) {
              const challenge = new Challenge(challengeData);
              await challenge.save();
              totalCreated++;
            }
          } catch (error) {
            console.error(
              `Błąd podczas tworzenia miesięcznego wyzwania:`,
              error
            );
          }
        }
      }

      console.log(`Utworzono ${totalCreated} nowych miesięcznych wyzwań`);
      return totalCreated;
    } catch (error) {
      console.error("Błąd podczas tworzenia miesięcznych wyzwań:", error);
      return 0;
    }
  }

  /**
   * Resetuje dzienne statystyki XP o północy
   */
  async resetDailyStats() {
    try {
      const now = new Date();
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);

      if (now.getHours() === 0) {
        await Profile.updateMany({}, { $set: { dailyXp: 0 } });
        console.log("Zresetowano dzienne XP dla wszystkich użytkowników");
      }

      if (now.getHours() === 0 && now.getDay() === 1) {
        await Profile.updateMany({}, { $set: { weeklyXp: 0 } });
        console.log("Zresetowano tygodniowe XP dla wszystkich użytkowników");
      }

      if (now.getHours() === 0 && now.getDate() === 1) {
        await Profile.updateMany({}, { $set: { monthlyXp: 0 } });
        console.log("Zresetowano miesięczne XP dla wszystkich użytkowników");
      }
    } catch (error) {
      console.error("Błąd podczas resetowania statystyk:", error);
    }
  }

  /**
   * Uruchamia zadanie ręcznie (do testowania)
   */
  async runTask(taskName) {
    if (!this.tasks.has(taskName)) {
      throw new Error(`Nieznane zadanie: ${taskName}`);
    }

    console.log(`Ręczne uruchomienie zadania: ${taskName}`);

    switch (taskName) {
      case "daily":
        return await this.createDailyChallengesForAllGuilds();
      case "weekly":
        return await this.createWeeklyChallengesForAllGuilds();
      case "monthly":
        return await this.createMonthlyChallengesForAllGuilds();
      case "cleanup":
        return await cleanupExpiredChallenges();
      case "hourly":
        return await this.resetDailyStats();
      default:
        throw new Error(`Nieobsługiwane zadanie: ${taskName}`);
    }
  }

  getStartOfWeek(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  getEndOfWeek(date) {
    const end = this.getStartOfWeek(date);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  getStartOfMonth(date) {
    const start = new Date(date);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  getEndOfMonth(date) {
    const end = new Date(date);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return end;
  }

  /**
   * Pobiera status schedulera
   */
  getStatus() {
    const status = {
      initialized: this.isInitialized,
      tasks: {},
    };

    for (const [name, task] of this.tasks) {
      status.tasks[name] = {
        running: task.running || false,
        scheduled: task.scheduled || false,
      };
    }

    return status;
  }
}

const challengeScheduler = new ChallengeScheduler();

module.exports = challengeScheduler;
