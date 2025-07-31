const Achievement = require("../../models/Achievement");

const defaultAchievements = [
    {
        id: "first_steps",
        name: "Pierwsze Kroki",
        description: "Osiągnij poziom 5",
        emoji: "👶",
        category: "leveling",
        requirements: {level: 5},
        rewards: {xp: 100, money: 50},
        rarity: "common",
        points: 10,
    },
    {
        id: "getting_stronger",
        name: "Rosnę w Siłę",
        description: "Osiągnij poziom 10",
        emoji: "💪",
        category: "leveling",
        requirements: {level: 10},
        rewards: {xp: 200, money: 100},
        rarity: "common",
        points: 15,
    },
    {
        id: "experienced",
        name: "Doświadczony",
        description: "Osiągnij poziom 25",
        emoji: "🎯",
        category: "leveling",
        requirements: {level: 25},
        rewards: {xp: 500, money: 250},
        rarity: "uncommon",
        points: 25,
    },
    {
        id: "veteran",
        name: "Weteran",
        description: "Osiągnij poziom 50",
        emoji: "🏅",
        category: "leveling",
        requirements: {level: 50},
        rewards: {xp: 1000, money: 500},
        rarity: "rare",
        points: 50,
    },
    {
        id: "master",
        name: "Mistrz",
        description: "Osiągnij poziom 100",
        emoji: "👑",
        category: "leveling",
        requirements: {level: 100},
        rewards: {
            xp: 5000,
            money: 2000,
            items: [{name: "Korona Mistrza", quantity: 1}],
        },
        rarity: "legendary",
        points: 100,
    },
    {
        id: "xp_collector",
        name: "Kolekcjoner XP",
        description: "Zdobądź 10,000 XP",
        emoji: "⭐",
        category: "leveling",
        requirements: {totalXp: 10000},
        rewards: {xp: 500, money: 200},
        rarity: "uncommon",
        points: 20,
    },
    {
        id: "xp_hoarder",
        name: "Zbieracz XP",
        description: "Zdobądź 100,000 XP",
        emoji: "🌟",
        category: "leveling",
        requirements: {totalXp: 100000},
        rewards: {xp: 2000, money: 1000},
        rarity: "epic",
        points: 75,
    },

    {
        id: "chatterbox",
        name: "Gadatliwy",
        description: "Wyślij 100 wiadomości",
        emoji: "💬",
        category: "activity",
        requirements: {messageCount: 100},
        rewards: {xp: 200, money: 100},
        rarity: "common",
        points: 15,
    },
    {
        id: "social_butterfly",
        name: "Towarzyski Motyl",
        description: "Wyślij 1,000 wiadomości",
        emoji: "🦋",
        category: "activity",
        requirements: {messageCount: 1000},
        rewards: {xp: 1000, money: 500},
        rarity: "uncommon",
        points: 30,
    },
    {
        id: "conversation_king",
        name: "Król Konwersacji",
        description: "Wyślij 10,000 wiadomości",
        emoji: "👑",
        category: "activity",
        requirements: {messageCount: 10000},
        rewards: {xp: 5000, money: 2000},
        rarity: "epic",
        points: 80,
    },
    {
        id: "streak_starter",
        name: "Początek Serii",
        description: "Utrzymaj 7-dniową serię aktywności",
        emoji: "🔥",
        category: "activity",
        requirements: {messageStreak: 7},
        rewards: {xp: 300, money: 150},
        rarity: "uncommon",
        points: 25,
    },
    {
        id: "streak_master",
        name: "Mistrz Serii",
        description: "Utrzymaj 30-dniową serię aktywności",
        emoji: "🌟",
        category: "activity",
        requirements: {messageStreak: 30},
        rewards: {
            xp: 2000,
            money: 1000,
            xpBooster: {multiplier: 2.0, duration: 60},
        },
        rarity: "legendary",
        points: 100,
    },

    {
        id: "first_coins",
        name: "Pierwsze Monety",
        description: "Zdobądź 1,000 monet",
        emoji: "🪙",
        category: "economy",
        requirements: {totalEarnings: 1000},
        rewards: {xp: 100, money: 100},
        rarity: "common",
        points: 10,
    },
    {
        id: "money_maker",
        name: "Zarabiacz",
        description: "Zdobądź 10,000 monet",
        emoji: "💰",
        category: "economy",
        requirements: {totalEarnings: 10000},
        rewards: {xp: 500, money: 500},
        rarity: "uncommon",
        points: 25,
    },
    {
        id: "wealthy",
        name: "Bogaty",
        description: "Miej 50,000 monet na koncie",
        emoji: "💎",
        category: "economy",
        requirements: {balance: 50000},
        rewards: {xp: 1000, money: 1000},
        rarity: "rare",
        points: 50,
    },
    {
        id: "millionaire",
        name: "Milioner",
        description: "Zdobądź łącznie 1,000,000 monet",
        emoji: "🏦",
        category: "economy",
        requirements: {totalEarnings: 1000000},
        rewards: {
            xp: 10000,
            money: 10000,
            items: [{name: "Złoty Certyfikat", quantity: 1}],
        },
        rarity: "mythic",
        points: 200,
    },
    {
        id: "big_spender",
        name: "Wielki Wydawca",
        description: "Wydaj 100,000 monet",
        emoji: "💸",
        category: "economy",
        requirements: {moneySpent: 100000},
        rewards: {xp: 2000, money: 1000},
        rarity: "rare",
        points: 40,
    },

    {
        id: "first_investigation",
        name: "Pierwszy Śledczy",
        description: "Ukończ pierwsze investigate",
        emoji: "🔍",
        category: "investigate",
        requirements: {totalInvestigations: 1},
        rewards: {xp: 100, money: 50},
        rarity: "common",
        points: 10,
    },
    {
        id: "detective",
        name: "Detektyw",
        description: "Ukończ 50 investigate",
        emoji: "🕵️",
        category: "investigate",
        requirements: {totalInvestigations: 50},
        rewards: {xp: 1000, money: 500},
        rarity: "uncommon",
        points: 30,
    },
    {
        id: "master_investigator",
        name: "Mistrz Śledczy",
        description: "Ukończ 200 investigate",
        emoji: "🎖️",
        category: "investigate",
        requirements: {totalInvestigations: 200},
        rewards: {xp: 5000, money: 2000},
        rarity: "epic",
        points: 75,
    },

    {
        id: "first_hunt",
        name: "Pierwszy Polowacz",
        description: "Ukończ pierwszy hunt",
        emoji: "👻",
        category: "hunt",
        requirements: {totalHunts: 1},
        rewards: {xp: 100, money: 50},
        rarity: "common",
        points: 10,
    },
    {
        id: "ghost_hunter",
        name: "Łowca Duchów",
        description: "Ukończ 50 huntów",
        emoji: "🎯",
        category: "hunt",
        requirements: {totalHunts: 50},
        rewards: {xp: 1000, money: 500},
        rarity: "uncommon",
        points: 30,
    },
    {
        id: "nightmare_slayer",
        name: "Pogromca Koszmarów",
        description: "Ukończ 10 nightmare huntów",
        emoji: "😈",
        category: "hunt",
        requirements: {nightmareHunts: 10},
        rewards: {xp: 2000, money: 1000},
        rarity: "rare",
        points: 60,
    },

    {
        id: "perfect_sanity",
        name: "Perfekcyjna Poczytalność",
        description: "Miej 100% poczytalności",
        emoji: "🧘",
        category: "special",
        requirements: {customCondition: "perfectSanity"},
        rewards: {xp: 500, money: 250},
        rarity: "rare",
        points: 40,
    },
    {
        id: "madness",
        name: "Szaleństwo",
        description: "Spadnij do 10% poczytalności",
        emoji: "🤪",
        category: "special",
        requirements: {customCondition: "lowSanity"},
        rewards: {xp: 300, money: 150},
        rarity: "uncommon",
        points: 25,
    },
    {
        id: "night_owl",
        name: "Nocny Marek",
        description: "Bądź aktywny między 22:00 a 6:00",
        emoji: "🦉",
        category: "special",
        requirements: {customCondition: "nightOwl"},
        rewards: {xp: 200, money: 100},
        rarity: "uncommon",
        points: 20,
    },
    {
        id: "early_bird",
        name: "Ranny Ptaszek",
        description: "Bądź aktywny między 6:00 a 10:00",
        emoji: "🐦",
        category: "special",
        requirements: {customCondition: "earlyBird"},
        rewards: {xp: 200, money: 100},
        rarity: "uncommon",
        points: 20,
    },
    {
        id: "weekend_warrior",
        name: "Wojownik Weekendu",
        description: "Bądź aktywny w weekend",
        emoji: "⚔️",
        category: "special",
        requirements: {customCondition: "weekendWarrior"},
        rewards: {xp: 300, money: 150},
        rarity: "uncommon",
        points: 25,
    },
];

async function initializeDefaultAchievements() {
    try {
        console.log("Inicjalizacja domyślnych osiągnięć...");

        let created = 0;
        let updated = 0;

        for (const achievementData of defaultAchievements) {
            const existing = await Achievement.findOne({id: achievementData.id});

            if (existing) {
                await Achievement.findOneAndUpdate(
                    {id: achievementData.id},
                    achievementData,
                    {new: true}
                );
                updated++;
            } else {
                const achievement = new Achievement(achievementData);
                await achievement.save();
                created++;
            }
        }

        console.log(
            `Osiągnięcia zainicjalizowane: ${created} utworzonych, ${updated} zaktualizowanych`
        );
        return {created, updated, total: defaultAchievements.length};
    } catch (error) {
        console.error("Błąd podczas inicjalizacji osiągnięć:", error);
        throw error;
    }
}

async function removeDefaultAchievements() {
    try {
        const achievementIds = defaultAchievements.map((a) => a.id);
        const result = await Achievement.deleteMany({
            id: {$in: achievementIds},
        });
        console.log(`Usunięto ${result.deletedCount} domyślnych osiągnięć`);
        return result.deletedCount;
    } catch (error) {
        console.error("Błąd podczas usuwania osiągnięć:", error);
        throw error;
    }
}

async function getAchievementStats() {
    try {
        const total = await Achievement.countDocuments();
        const byCategory = await Achievement.aggregate([
            {$group: {_id: "$category", count: {$sum: 1}}},
        ]);
        const byRarity = await Achievement.aggregate([
            {$group: {_id: "$rarity", count: {$sum: 1}}},
        ]);

        return {
            total,
            byCategory: byCategory.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            byRarity: byRarity.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
        };
    } catch (error) {
        console.error("Błąd podczas pobierania statystyk osiągnięć:", error);
        throw error;
    }
}

module.exports = {
    defaultAchievements,
    initializeDefaultAchievements,
    removeDefaultAchievements,
    getAchievementStats,
};
