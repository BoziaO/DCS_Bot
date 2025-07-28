const { ghosts, maps } = require("../../data/phasmophobiaData");
const { DIFFICULTY_SETTINGS, HUNT_ITEM_EFFECTS } = require("./constants");

/**
 * Tworzy stan polowania
 */
const createInteractiveHuntState = (
  targetGhost,
  mapName,
  difficulty,
  userProfile,
  selectedItems = []
) => {
  const mapData = maps.find((m) => m.name === mapName);
  const difficultyData = DIFFICULTY_SETTINGS[difficulty];

  return {
    targetGhost,
    mapData,
    difficulty,
    difficultyData,
    userProfile,
    selectedItems,
    collectedEvidence: [],
    currentSanity: userProfile.sanity,
    timeRemaining: difficultyData.time,
    actionsUsed: 0,
    maxActions: 5,
    earnings: 0,
    bonusReport: [],
    isCompleted: false,
    isCorrect: false,
    startTime: Date.now(),

    sanityLossReduction: 0,
    investigateBonus: 0,
    photoBonus: 0,
    spiritBoxBonus: 0,
    temperatureBonus: 0,
    huntProtection: false,
    ghostActivityReduction: 0,
    toolBonus: false,
  };
};

/**
 * Aplikuje efekty wybranych itemów
 */
const applyItemEffects = (huntState, action = null) => {
  if (!huntState.selectedItems || huntState.selectedItems.length === 0) {
    return;
  }

  huntState.selectedItems.forEach((itemName) => {
    const itemEffect = HUNT_ITEM_EFFECTS[itemName];
    if (itemEffect) {
      try {
        if (
          itemEffect.type === "passive" ||
          itemEffect.type === "protection" ||
          (itemEffect.type === "detection" && !action) ||
          (itemEffect.type === "active" && action)
        ) {
          itemEffect.apply(huntState, action);
        }
      } catch (error) {
        console.error(`Error applying item effect for ${itemName}:`, error);
      }
    }
  });
};

/**
 * Konsumuje jednorazowe itemy
 */
const consumeUsedItems = (huntState, userProfile) => {
  if (!huntState.selectedItems || huntState.selectedItems.length === 0) {
    return;
  }

  huntState.selectedItems.forEach((itemName) => {
    const itemEffect = HUNT_ITEM_EFFECTS[itemName];
    if (itemEffect && itemEffect.type === "consumable") {
      if (userProfile.inventory instanceof Map) {
        const currentQuantity = userProfile.inventory.get(itemName) || 0;
        if (currentQuantity > 1) {
          userProfile.inventory.set(itemName, currentQuantity - 1);
        } else {
          userProfile.inventory.delete(itemName);
        }
      } else if (Array.isArray(userProfile.inventory)) {
        const item = userProfile.inventory.find((i) => i.name === itemName);
        if (item) {
          item.quantity -= 1;
          if (item.quantity <= 0) {
            const index = userProfile.inventory.indexOf(item);
            userProfile.inventory.splice(index, 1);
          }
        }
      } else if (typeof userProfile.inventory === "object") {
        if (userProfile.inventory[itemName]) {
          userProfile.inventory[itemName] -= 1;
          if (userProfile.inventory[itemName] <= 0) {
            delete userProfile.inventory[itemName];
          }
        }
      }
    }
  });
};

/**
 * Obsługuje akcję rozglądania się
 */
const handleInvestigateAction = (huntState) => {
  huntState.actionsUsed++;

  applyItemEffects(huntState, "investigate");

  const evidenceChance = Math.min(0.9, 0.6 + huntState.investigateBonus);
  let sanityLoss = Math.floor(Math.random() * 8 + 5);

  sanityLoss = Math.max(2, sanityLoss - huntState.sanityLossReduction);

  huntState.currentSanity = Math.max(0, huntState.currentSanity - sanityLoss);

  if (
    Math.random() < evidenceChance &&
    huntState.collectedEvidence.length < 3
  ) {
    const availableEvidence = huntState.targetGhost.evidence.filter(
      (e) => !huntState.collectedEvidence.includes(e)
    );

    if (availableEvidence.length > 0) {
      const foundEvidence =
        availableEvidence[Math.floor(Math.random() * availableEvidence.length)];
      huntState.collectedEvidence.push(foundEvidence);

      return {
        success: true,
        description:
          `🔦 Rozglądasz się po pomieszczeniu...\n\n` +
          `✅ **Znaleziono dowód:** ${foundEvidence}!\n` +
          `😰 Widok sprawił, że straciłeś ${sanityLoss}% poczytalności.\n\n` +
          `*Coś tu zdecydowanie jest... Powietrze staje się gęstsze.*`,
        evidenceFound: foundEvidence,
        sanityLoss,
      };
    }
  }

  const randomEvents = [
    "Słyszysz dziwne kroki na górze...",
    "Drzwi same się zatrzaskują za tobą...",
    "Temperatura nagle spada...",
    "Widzisz cień przemykający w rogu oka...",
    "Światła migają niepokojąco...",
    "Słyszysz szepty, ale nie ma tu nikogo...",
    "Przedmioty same się przesuwają...",
  ];

  const randomEvent =
    randomEvents[Math.floor(Math.random() * randomEvents.length)];

  return {
    success: false,
    description:
      `🔦 Rozglądasz się po pomieszczeniu...\n\n` +
      `❌ **Nie znaleziono dowodów**\n` +
      `😰 Straciłeś ${sanityLoss}% poczytalności.\n\n` +
      `*${randomEvent}*`,
    sanityLoss,
  };
};

/**
 * Obsługuje akcję robienia zdjęcia
 */
const handlePhotoAction = (huntState) => {
  huntState.actionsUsed++;

  applyItemEffects(huntState, "photo");

  const photoChance = Math.min(0.8, 0.4 + huntState.photoBonus);
  let sanityLoss = Math.floor(Math.random() * 6 + 3);

  sanityLoss = Math.max(1, sanityLoss - huntState.sanityLossReduction);

  huntState.currentSanity = Math.max(0, huntState.currentSanity - sanityLoss);

  if (Math.random() < photoChance) {
    const photoBonus = Math.floor(Math.random() * 100 + 50);
    huntState.earnings += photoBonus;

    return {
      success: true,
      description:
        `📷 Robisz zdjęcie...\n\n` +
        `✅ **Udane zdjęcie!** Uchwyciłeś aktywność paranormalną!\n` +
        `💰 Bonus za zdjęcie: +$${photoBonus}\n` +
        `😰 Widok ducha sprawił, że straciłeś ${sanityLoss}% poczytalności.\n\n` +
        `*Flash oświetla postać, która natychmiast znika...*`,
      bonus: photoBonus,
      sanityLoss,
    };
  }

  return {
    success: false,
    description:
      `📷 Robisz zdjęcie...\n\n` +
      `❌ **Puste zdjęcie** - Nic nie uchwyciłeś na kamerze.\n` +
      `😰 Straciłeś ${sanityLoss}% poczytalności.\n\n` +
      `*Może duch się ukrywa... Spróbuj ponownie później.*`,
    sanityLoss,
  };
};

/**
 * Obsługuje akcję Spirit Box
 */
const handleSpiritBoxAction = (huntState) => {
  huntState.actionsUsed++;

  applyItemEffects(huntState, "spirit_box");

  const responseChance = Math.min(0.9, 0.5 + huntState.spiritBoxBonus);
  let sanityLoss = Math.floor(Math.random() * 10 + 5);

  sanityLoss = Math.max(2, sanityLoss - huntState.sanityLossReduction);

  huntState.currentSanity = Math.max(0, huntState.currentSanity - sanityLoss);

  if (Math.random() < responseChance) {
    const hasSpirituBox = huntState.targetGhost.evidence.includes("Spirit Box");

    if (hasSpirituBox && !huntState.collectedEvidence.includes("Spirit Box")) {
      huntState.collectedEvidence.push("Spirit Box");

      const ghostResponses = [
        "GET... OUT...",
        "DEATH...",
        "HERE...",
        "KILL...",
        "ADULT...",
        "OLD...",
        "YOUNG...",
        "BEHIND...",
        "CLOSE...",
      ];

      const response =
        ghostResponses[Math.floor(Math.random() * ghostResponses.length)];

      return {
        success: true,
        description:
          `🎤 Włączasz Spirit Box...\n\n` +
          `✅ **Odpowiedź ducha:** "${response}"\n` +
          `✅ **Dowód potwierdzony:** Spirit Box!\n` +
          `😰 Głos ducha sprawił, że straciłeś ${sanityLoss}% poczytalności.\n\n` +
          `*Zimny dreszcz przechodzi przez twoje ciało...*`,
        evidenceFound: "Spirit Box",
        ghostResponse: response,
        sanityLoss,
      };
    } else {
      const noResponseReasons = [
        "Słyszysz tylko statyczny szum...",
        "Duch nie chce się komunikować...",
        "Może duch nie używa tego typu komunikacji...",
        "Cisza... Tylko twój oddech...",
        "Urządzenie działa, ale nikt nie odpowiada...",
      ];

      const reason =
        noResponseReasons[Math.floor(Math.random() * noResponseReasons.length)];

      return {
        success: false,
        description:
          `🎤 Włączasz Spirit Box...\n\n` +
          `❌ **Brak odpowiedzi**\n` +
          `😰 Straciłeś ${sanityLoss}% poczytalności.\n\n` +
          `*${reason}*`,
        sanityLoss,
      };
    }
  }

  return {
    success: false,
    description:
      `🎤 Włączasz Spirit Box...\n\n` +
      `❌ **Brak odpowiedzi** - Tylko statyczny szum.\n` +
      `😰 Straciłeś ${sanityLoss}% poczytalności.\n\n` +
      `*Może duch nie chce się komunikować...*`,
    sanityLoss,
  };
};

/**
 * Obsługuje akcję sprawdzania temperatury
 */
const handleTemperatureAction = (huntState) => {
  huntState.actionsUsed++;

  applyItemEffects(huntState, "temperature");

  let sanityLoss = Math.floor(Math.random() * 5 + 2);

  sanityLoss = Math.max(1, sanityLoss - huntState.sanityLossReduction);

  huntState.currentSanity = Math.max(0, huntState.currentSanity - sanityLoss);

  const hasFreezingTemp = huntState.targetGhost.evidence.includes(
    "Freezing Temperatures"
  );

  if (
    hasFreezingTemp &&
    !huntState.collectedEvidence.includes("Freezing Temperatures")
  ) {
    huntState.collectedEvidence.push("Freezing Temperatures");

    const temperature = Math.floor(Math.random() * 10 - 5);

    return {
      success: true,
      description:
        `🌡️ Sprawdzasz temperaturę termometrem...\n\n` +
        `✅ **Temperatura:** ${temperature}°C - Znacznie poniżej normy!\n` +
        `✅ **Dowód potwierdzony:** Freezing Temperatures!\n` +
        `😰 Zimno sprawił, że straciłeś ${sanityLoss}% poczytalności.\n\n` +
        `*Twój oddech staje się widoczny... To nie jest naturalne.*`,
      evidenceFound: "Freezing Temperatures",
      temperature,
      sanityLoss,
    };
  } else {
    const temperature = Math.floor(Math.random() * 15 + 15);

    return {
      success: false,
      description:
        `🌡️ Sprawdzasz temperaturę termometrem...\n\n` +
        `❌ **Temperatura:** ${temperature}°C - W normie.\n` +
        `😰 Straciłeś ${sanityLoss}% poczytalności.\n\n` +
        `*Temperatura wydaje się normalna, ale nadal czujesz niepokój...*`,
      temperature,
      sanityLoss,
    };
  }
};

/**
 * Obsługuje ucieczkę
 */
const handleEscapeAction = (huntState) => {
  huntState.isCompleted = true;
  huntState.isCorrect = false;

  const baseReward = huntState.mapData.baseReward * 0.3;
  huntState.earnings += Math.floor(baseReward);

  return {
    success: true,
    description:
      `🏃 Decydujesz się uciec z lokacji...\n\n` +
      `✅ **Bezpieczna ucieczka!**\n` +
      `💰 Nagroda za przetrwanie: $${Math.floor(baseReward)}\n` +
      `⚠️ Brak identyfikacji ducha - zmniejszone nagrody.\n\n` +
      `*Czasami mądrość polega na tym, by wiedzieć kiedy się wycofać...*`,
    earnings: Math.floor(baseReward),
  };
};

/**
 * Sprawdza czy polowanie się zakończyło
 */
const checkHuntCompletion = (huntState) => {
  if (huntState.timeRemaining <= 0) {
    huntState.isCompleted = true;
    return { completed: true, reason: "timeout" };
  }

  if (huntState.currentSanity <= 0) {
    huntState.isCompleted = true;
    return { completed: true, reason: "sanity_loss" };
  }

  if (huntState.actionsUsed >= huntState.maxActions) {
    huntState.isCompleted = true;
    return { completed: true, reason: "max_actions" };
  }

  if (
    huntState.collectedEvidence.length >=
    huntState.difficultyData.evidenceAmount
  ) {
    return { completed: false, canGuess: true };
  }

  return { completed: false, canGuess: false };
};

/**
 * Oblicza końcowe nagrody
 */
const calculateFinalRewards = (huntState) => {
  let totalEarnings = huntState.earnings;

  const baseReward = huntState.mapData.baseReward;
  totalEarnings += baseReward;

  totalEarnings *= huntState.difficultyData.earningsMultiplier;

  const timeBonus = Math.floor(huntState.timeRemaining / 1000) * 5;
  totalEarnings += timeBonus;

  const sanityBonus = Math.floor(huntState.currentSanity * 2);
  totalEarnings += sanityBonus;

  if (huntState.isCorrect) {
    totalEarnings *= 1.5;
  }

  return Math.floor(totalEarnings);
};

module.exports = {
  createInteractiveHuntState,
  applyItemEffects,
  consumeUsedItems,
  handleInvestigateAction,
  handlePhotoAction,
  handleSpiritBoxAction,
  handleTemperatureAction,
  handleEscapeAction,
  checkHuntCompletion,
  calculateFinalRewards,
};
