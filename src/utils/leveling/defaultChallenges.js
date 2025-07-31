const Challenge = require("../../models/Challenge");

async function createDefaultChallenges(guildId) {
    const now = new Date();

    const dailyChallenges = [
        {
            id: `daily_messages_${guildId}_${now.getTime()}`,
            name: "Dzienny Gadatliwy",
            description: "Wyślij 20 wiadomości dzisiaj",
            emoji: "💬",
            type: "daily",
            category: "activity",
            requirements: {sendMessages: 20},
            rewards: {xp: 100, money: 50},
            startDate: getStartOfDay(now),
            endDate: getEndOfDay(now),
            guildId: guildId,
            difficulty: "easy",
        },
        {
            id: `daily_xp_${guildId}_${now.getTime()}`,
            name: "Dzienny Zdobywca XP",
            description: "Zdobądź 500 XP dzisiaj",
            emoji: "⭐",
            type: "daily",
            category: "leveling",
            requirements: {gainXp: 500},
            rewards: {xp: 200, money: 100},
            startDate: getStartOfDay(now),
            endDate: getEndOfDay(now),
            guildId: guildId,
            difficulty: "medium",
        },
        {
            id: `daily_active_${guildId}_${now.getTime()}`,
            name: "Dzienny Aktywny",
            description: "Bądź aktywny przez 30 minut",
            emoji: "🕐",
            type: "daily",
            category: "activity",
            requirements: {beActive: 30},
            rewards: {xp: 150, money: 75},
            startDate: getStartOfDay(now),
            endDate: getEndOfDay(now),
            guildId: guildId,
            difficulty: "easy",
        },
    ];

    const weeklyChallenges = [
        {
            id: `weekly_messages_${guildId}_${now.getTime()}`,
            name: "Tygodniowy Komunikator",
            description: "Wyślij 200 wiadomości w tym tygodniu",
            emoji: "📱",
            type: "weekly",
            category: "activity",
            requirements: {sendMessages: 200},
            rewards: {
                xp: 1000,
                money: 500,
                xpBooster: {multiplier: 1.5, duration: 60},
            },
            startDate: getStartOfWeek(now),
            endDate: getEndOfWeek(now),
            guildId: guildId,
            difficulty: "medium",
        },
        {
            id: `weekly_xp_${guildId}_${now.getTime()}`,
            name: "Tygodniowy Mistrz XP",
            description: "Zdobądź 5,000 XP w tym tygodniu",
            emoji: "🌟",
            type: "weekly",
            category: "leveling",
            requirements: {gainXp: 5000},
            rewards: {xp: 2000, money: 1000},
            startDate: getStartOfWeek(now),
            endDate: getEndOfWeek(now),
            guildId: guildId,
            difficulty: "hard",
        },
        {
            id: `weekly_investigate_${guildId}_${now.getTime()}`,
            name: "Tygodniowy Śledczy",
            description: "Ukończ 10 investigate w tym tygodniu",
            emoji: "🔍",
            type: "weekly",
            category: "investigate",
            requirements: {completeInvestigations: 10},
            rewards: {xp: 1500, money: 750},
            startDate: getStartOfWeek(now),
            endDate: getEndOfWeek(now),
            guildId: guildId,
            difficulty: "medium",
        },
        {
            id: `weekly_hunt_${guildId}_${now.getTime()}`,
            name: "Tygodniowy Łowca",
            description: "Ukończ 5 huntów w tym tygodniu",
            emoji: "👻",
            type: "weekly",
            category: "hunt",
            requirements: {completeHunts: 5},
            rewards: {xp: 2000, money: 1000},
            startDate: getStartOfWeek(now),
            endDate: getEndOfWeek(now),
            guildId: guildId,
            difficulty: "hard",
        },
    ];

    const monthlyChallenges = [
        {
            id: `monthly_level_${guildId}_${now.getTime()}`,
            name: "Miesięczny Awans",
            description: "Awansuj o 5 poziomów w tym miesiącu",
            emoji: "📈",
            type: "monthly",
            category: "leveling",
            requirements: {reachLevel: 5},
            rewards: {
                xp: 5000,
                money: 2500,
                items: [{name: "Miesięczna Odznaka", quantity: 1}],
            },
            startDate: getStartOfMonth(now),
            endDate: getEndOfMonth(now),
            guildId: guildId,
            difficulty: "extreme",
        },
        {
            id: `monthly_social_${guildId}_${now.getTime()}`,
            name: "Miesięczny Społeczny",
            description: "Wyślij 1000 wiadomości w tym miesiącu",
            emoji: "🤝",
            type: "monthly",
            category: "social",
            requirements: {sendMessages: 1000},
            rewards: {xp: 10000, money: 5000},
            startDate: getStartOfMonth(now),
            endDate: getEndOfMonth(now),
            guildId: guildId,
            difficulty: "extreme",
        },
        {
            id: `monthly_economy_${guildId}_${now.getTime()}`,
            name: "Miesięczny Ekonomista",
            description: "Zarobić 50,000 monet w tym miesiącu",
            emoji: "💰",
            type: "monthly",
            category: "economy",
            requirements: {earnMoney: 50000},
            rewards: {xp: 7500, money: 10000},
            startDate: getStartOfMonth(now),
            endDate: getEndOfMonth(now),
            guildId: guildId,
            difficulty: "extreme",
        },
    ];

    const specialChallenges = [
        {
            id: `special_streak_${guildId}_${now.getTime()}`,
            name: "Mistrz Konsekwencji",
            description: "Utrzymaj 14-dniową serię aktywności",
            emoji: "🔥",
            type: "special",
            category: "activity",
            requirements: {customCondition: "maintain14DayStreak"},
            rewards: {
                xp: 5000,
                money: 2500,
                xpBooster: {multiplier: 2.0, duration: 120},
                title: "Mistrz Konsekwencji",
            },
            startDate: now,
            endDate: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
            guildId: guildId,
            difficulty: "extreme",
            featured: true,
        },
        {
            id: `special_perfectionist_${guildId}_${now.getTime()}`,
            name: "Perfekcjonista",
            description: "Ukończ wszystkie dzienne wyzwania przez 7 dni",
            emoji: "💎",
            type: "special",
            category: "special",
            requirements: {customCondition: "complete7DaysOfDailies"},
            rewards: {
                xp: 10000,
                money: 5000,
                items: [{name: "Kryształowa Odznaka", quantity: 1}],
                badge: "Perfekcjonista",
            },
            startDate: now,
            endDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000),
            guildId: guildId,
            difficulty: "extreme",
            featured: true,
        },
    ];

    const allChallenges = [
        ...dailyChallenges,
        ...weeklyChallenges,
        ...monthlyChallenges,
        ...specialChallenges,
    ];

    let created = 0;
    for (const challengeData of allChallenges) {
        try {
            const existing = await Challenge.findOne({id: challengeData.id});
            if (!existing) {
                const challenge = new Challenge(challengeData);
                await challenge.save();
                created++;
            }
        } catch (error) {
            console.error(
                `Błąd podczas tworzenia wyzwania ${challengeData.name}:`,
                error
            );
        }
    }

    return {created, total: allChallenges.length};
}

async function createDailyChallenges(guildId) {
    const now = new Date();
    const challenges = [
        {
            id: `daily_messages_${guildId}_${now.toDateString()}`,
            name: "Dzienny Gadatliwy",
            description: "Wyślij 20 wiadomości dzisiaj",
            emoji: "💬",
            type: "daily",
            category: "activity",
            requirements: {sendMessages: 20},
            rewards: {xp: 100, money: 50},
            startDate: getStartOfDay(now),
            endDate: getEndOfDay(now),
            guildId: guildId,
            difficulty: "easy",
        },
        {
            id: `daily_xp_${guildId}_${now.toDateString()}`,
            name: "Dzienny Zdobywca XP",
            description: "Zdobądź 500 XP dzisiaj",
            emoji: "⭐",
            type: "daily",
            category: "leveling",
            requirements: {gainXp: 500},
            rewards: {xp: 200, money: 100},
            startDate: getStartOfDay(now),
            endDate: getEndOfDay(now),
            guildId: guildId,
            difficulty: "medium",
        },
    ];

    let created = 0;
    for (const challengeData of challenges) {
        try {
            const existing = await Challenge.findOne({id: challengeData.id});
            if (!existing) {
                const challenge = new Challenge(challengeData);
                await challenge.save();
                created++;
            }
        } catch (error) {
            console.error(`Błąd podczas tworzenia dziennego wyzwania:`, error);
        }
    }

    return created;
}

async function cleanupExpiredChallenges() {
    try {
        const now = new Date();
        const result = await Challenge.deleteMany({
            endDate: {$lt: now},
            type: {$in: ["daily", "weekly"]},
        });

        console.log(`Usunięto ${result.deletedCount} wygasłych wyzwań`);
        return result.deletedCount;
    } catch (error) {
        console.error("Błąd podczas czyszczenia wyzwań:", error);
        return 0;
    }
}

function getStartOfDay(date) {
    const start = new Date(date);
    start.setHours(0, 0, 0, 0);
    return start;
}

function getEndOfDay(date) {
    const end = new Date(date);
    end.setHours(23, 59, 59, 999);
    return end;
}

function getStartOfWeek(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1);
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
}

function getEndOfWeek(date) {
    const end = getStartOfWeek(date);
    end.setDate(end.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return end;
}

function getStartOfMonth(date) {
    const start = new Date(date);
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
    return start;
}

function getEndOfMonth(date) {
    const end = new Date(date);
    end.setMonth(end.getMonth() + 1);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
    return end;
}

module.exports = {
    createDefaultChallenges,
    createDailyChallenges,
    cleanupExpiredChallenges,
};
