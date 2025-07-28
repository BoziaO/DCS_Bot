/**
 * Profile System Constants
 * Contains all static data for the profile system including ranks, achievements, and ghost types
 */

const GHOST_HUNTER_RANKS = {
  1: { name: "Nowicjusz", icon: "🔰", minHunts: 0, color: "#95a5a6" },
  2: { name: "Amator", icon: "🎯", minHunts: 5, color: "#3498db" },
  3: {
    name: "Średniozaawansowany",
    icon: "🏆",
    minHunts: 15,
    color: "#e67e22",
  },
  4: { name: "Ekspert", icon: "⭐", minHunts: 35, color: "#f39c12" },
  5: { name: "Mistrz", icon: "👑", minHunts: 60, color: "#9b59b6" },
  6: { name: "Legenda", icon: "💎", minHunts: 100, color: "#e74c3c" },
  7: { name: "Paranormal Expert", icon: "🌟", minHunts: 150, color: "#1abc9c" },
  8: { name: "Duch Łowca", icon: "👻", minHunts: 250, color: "#2c3e50" },
};

const ACHIEVEMENTS = {
  first_hunt: {
    name: "Pierwsze Polowanie",
    description: "Ukończ swoje pierwsze polowanie",
    icon: "🎯",
    reward: 100,
    condition: (profile) => profile.totalHunts >= 1,
  },
  perfect_streak: {
    name: "Perfekcyjna Seria",
    description: "Zdobądź 5 sukcesów z rzędu",
    icon: "🔥",
    reward: 500,
    condition: (profile) => profile.huntStreak >= 5,
  },
  ghost_whisperer: {
    name: "Szepczący do Duchów",
    description: "Zidentyfikuj 25 duchów prawidłowo",
    icon: "👻",
    reward: 1000,
    condition: (profile) => profile.successfulHunts >= 25,
  },
  fearless: {
    name: "Bez Strachu",
    description: "Ukończ polowanie z 100% poczytalnością",
    icon: "💪",
    reward: 300,
    condition: (profile) => profile.maxSanityHunt === 100,
  },
  collector: {
    name: "Kolekcjoner",
    description: "Zdobądź 20 różnych przedmiotów",
    icon: "🎒",
    reward: 750,
    condition: (profile) => profile.inventory && profile.inventory.length >= 20,
  },
  millionaire: {
    name: "Milioner",
    description: "Zdobądź $10,000",
    icon: "💰",
    reward: 2000,
    condition: (profile) => profile.balance >= 10000,
  },
  nightmare_survivor: {
    name: "Survivor Koszmaru",
    description: "Ukończ polowanie na poziomie Koszmar",
    icon: "😈",
    reward: 1500,
    condition: (profile) => profile.nightmareHunts >= 1,
  },
  equipment_master: {
    name: "Mistrz Sprzętu",
    description: "Użyj 50 przedmiotów podczas polowań",
    icon: "🔧",
    reward: 800,
    condition: (profile) => profile.itemsUsed >= 50,
  },
  marathon_hunter: {
    name: "Maraton Łowcy",
    description: "Spędź 100 godzin na polowaniach",
    icon: "⏰",
    reward: 1200,
    condition: (profile) => profile.playtime >= 6000,
  },
  ghost_expert: {
    name: "Ekspert Duchów",
    description: "Napotykaj wszystkie typy duchów",
    icon: "🎓",
    reward: 1500,
    condition: (profile) =>
      Object.keys(profile.ghostEncounters || {}).length >= 12,
  },
};

const GHOST_TYPES = {
  Spirit: "👻",
  Wraith: "🌫️",
  Phantom: "👤",
  Poltergeist: "📦",
  Banshee: "😱",
  Jinn: "🧞",
  Mare: "🌙",
  Revenant: "🧟",
  Shade: "🌑",
  Demon: "😈",
  Yurei: "🎭",
  Oni: "👹",
  Yokai: "🎌",
  Hantu: "❄️",
  Goryo: "📹",
  Myling: "🔇",
  Onryo: "💔",
  "The Twins": "👥",
  Raiju: "⚡",
  Obake: "🔄",
  "The Mimic": "🎪",
  Moroi: "🩸",
  Deogen: "👁️",
  Thaye: "👴",
};

const LOADING_MESSAGES = [
  "🔄 **Inicjalizacja systemu profilu...**\n*Łączenie z bazą danych łowców duchów*",
  "📊 **Analiza danych wydajności...**\n*Przetwarzanie statystyk polowań*",
  "👻 **Skanowanie encyklopedii duchów...**\n*Weryfikacja napotkanych jednostek*",
  "🎒 **Inwentaryzacja arsenału...**\n*Katalogowanie wyposażenia łowcy*",
  "🏆 **Weryfikacja osiągnięć...**\n*Sprawdzanie postępów i nagród*",
  "⚡ **Optymalizacja danych...**\n*Finalizowanie raportu wydajności*",
];

const VIEW_NAMES = {
  main: "Główny Profil",
  stats: "Analiza Statystyk",
  achievements: "Kolekcja Osiągnięć",
  inventory: "Arsenał Łowcy",
};

const REQUIRED_PROFILE_FIELDS = [
  "balance",
  "sanity",
  "totalHunts",
  "successfulHunts",
  "huntStreak",
  "maxStreak",
  "maxSanityHunt",
  "minSanity",
  "nightmareHunts",
  "itemsUsed",
  "playtime",
  "totalEarnings",
  "moneySpent",
  "deaths",
  "revivals",
  "evidenceFound",
  "cursedObjectsUsed",
  "perfectHunts",
  "photosTaken",
  "ghostsExorcised",
  "teamHunts",
];

module.exports = {
  GHOST_HUNTER_RANKS,
  ACHIEVEMENTS,
  GHOST_TYPES,
  LOADING_MESSAGES,
  VIEW_NAMES,
  REQUIRED_PROFILE_FIELDS,
};
