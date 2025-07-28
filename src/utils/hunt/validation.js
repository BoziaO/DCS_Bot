const {
  DIFFICULTY_SETTINGS,
  LOCATION_EFFECTS,
  HUNT_ITEM_EFFECTS,
} = require("./constants");
const { formatTime } = require("./utils");

/**
 * Waliduje parametry polowania
 * @param {Object} params - Parametry do walidacji
 * @returns {Object} Wynik walidacji
 */
const validateHuntParameters = (params) => {
  const { difficulty, location, itemName } = params;
  const errors = [];

  if (difficulty && !DIFFICULTY_SETTINGS[difficulty]) {
    errors.push("Nieważny poziom trudności!");
  }

  if (location && !LOCATION_EFFECTS[location]) {
    errors.push("Nieważna lokacja!");
  }

  if (itemName && !HUNT_ITEM_EFFECTS[itemName]) {
    errors.push(`Nieznany przedmiot: ${itemName}`);
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Sprawdza cooldown polowania
 * @param {Object} userProfile - Profil użytkownika
 * @param {Object} settings - Ustawienia trudności
 * @returns {Object} Wynik sprawdzenia cooldown
 */
const checkHuntCooldown = (userProfile, settings) => {
  const lastHuntTime = userProfile.lastHunt?.getTime() || 0;
  const cooldownRemaining = settings.cooldown - (Date.now() - lastHuntTime);

  return {
    isOnCooldown: cooldownRemaining > 0,
    remainingTime: cooldownRemaining,
    message:
      cooldownRemaining > 0
        ? `⏰ Jesteś wyczerpany/a po ostatnim polowaniu. Odpocznij jeszcze **${formatTime(
            cooldownRemaining
          )}**.`
        : null,
  };
};

/**
 * Sprawdza poziom poczytalności
 * @param {Object} userProfile - Profil użytkownika
 * @param {Object} settings - Ustawienia trudności
 * @returns {Object} Wynik sprawdzenia poczytalności
 */
const checkSanityLevel = (userProfile, settings) => {
  const hasEnoughSanity = userProfile.sanity >= settings.minSanity;

  return {
    hasEnoughSanity,
    message: !hasEnoughSanity
      ? `🧠 Twoja poczytalność jest zbyt niska (**${userProfile.sanity}%** < **${settings.minSanity}%**)! Użyj tabletek lub odpocznij.`
      : null,
  };
};

/**
 * Sprawdza dostępność przedmiotu
 * @param {Object} userProfile - Profil użytkownika
 * @param {string} itemName - Nazwa przedmiotu
 * @returns {Object} Wynik sprawdzenia przedmiotu
 */
const checkItemAvailability = (userProfile, itemName) => {
  if (!itemName) {
    return { hasItem: true, message: null };
  }

  let hasItem = false;

  if (userProfile.inventory) {
    if (Array.isArray(userProfile.inventory)) {
      hasItem = userProfile.inventory.some(
        (i) => i && i.name === itemName && i.quantity > 0
      );
    } else if (userProfile.inventory instanceof Map) {
      hasItem =
        userProfile.inventory.has(itemName) &&
        userProfile.inventory.get(itemName) > 0;
    } else if (typeof userProfile.inventory === "object") {
      hasItem =
        userProfile.inventory[itemName] && userProfile.inventory[itemName] > 0;
    }
  }

  return {
    hasItem,
    message: !hasItem
      ? `❌ Nie masz przedmiotu "${itemName}" w ekwipunku!`
      : null,
  };
};

/**
 * Waliduje dane duchów
 * @param {Array} ghosts - Lista duchów
 * @returns {Object} Wynik walidacji
 */
const validateGhostData = (ghosts) => {
  const isValid = ghosts && Array.isArray(ghosts) && ghosts.length > 0;

  return {
    isValid,
    message: !isValid
      ? "❌ Błąd: Brak danych o duchach. Skontaktuj się z administratorem."
      : null,
  };
};

/**
 * Kompleksowa walidacja przed rozpoczęciem polowania
 * @param {Object} params - Parametry polowania
 * @param {Object} userProfile - Profil użytkownika
 * @param {Array} ghosts - Lista duchów
 * @returns {Object} Wynik kompleksowej walidacji
 */
const validateHuntStart = (params, userProfile, ghosts) => {
  const { difficulty, location, itemName } = params;
  const settings = DIFFICULTY_SETTINGS[difficulty];

  const paramValidation = validateHuntParameters({
    difficulty,
    location,
    itemName,
  });
  if (!paramValidation.isValid) {
    return {
      canStart: false,
      error: paramValidation.errors[0],
    };
  }

  const cooldownCheck = checkHuntCooldown(userProfile, settings);
  if (cooldownCheck.isOnCooldown) {
    return {
      canStart: false,
      error: cooldownCheck.message,
    };
  }

  const sanityCheck = checkSanityLevel(userProfile, settings);
  if (!sanityCheck.hasEnoughSanity) {
    return {
      canStart: false,
      error: sanityCheck.message,
    };
  }

  const itemCheck = checkItemAvailability(userProfile, itemName);
  if (!itemCheck.hasItem) {
    return {
      canStart: false,
      error: itemCheck.message,
    };
  }

  const ghostValidation = validateGhostData(ghosts);
  if (!ghostValidation.isValid) {
    return {
      canStart: false,
      error: ghostValidation.message,
    };
  }

  return {
    canStart: true,
    settings,
    error: null,
  };
};

module.exports = {
  validateHuntParameters,
  checkHuntCooldown,
  checkSanityLevel,
  checkItemAvailability,
  validateGhostData,
  validateHuntStart,
};
