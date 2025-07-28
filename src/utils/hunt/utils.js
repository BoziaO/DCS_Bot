const { LOCATION_EFFECTS, RANDOM_EVENTS } = require("./constants");

/**
 * Formatuje czas z milisekund na czytelny format
 * @param {number} milliseconds - Czas w milisekundach
 * @returns {string} Sformatowany czas
 */
const formatTime = (milliseconds) => {
  const seconds = Math.ceil(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
};

/**
 * Bezpieczne wysyłanie embed'a z obsługą błędów
 * @param {Interaction} interaction - Interakcja Discord
 * @param {EmbedBuilder} embed - Embed do wysłania
 * @param {Array} components - Komponenty do dołączenia
 * @returns {Promise} Promise z odpowiedzią
 */
const safeEmbedReply = async (interaction, embed, components = []) => {
  try {
    if (interaction.replied || interaction.deferred) {
      return await interaction.editReply({ embeds: [embed], components });
    } else {
      return await interaction.reply({ embeds: [embed], components });
    }
  } catch (error) {
    console.error("Error sending embed:", error);
    throw error;
  }
};

/**
 * Konsumuje przedmiot z ekwipunku
 * @param {Array} inventory - Ekwipunek gracza
 * @param {string} itemName - Nazwa przedmiotu
 * @returns {boolean} Czy przedmiot został skonsumowany
 */
const consumeItem = (inventory, itemName) => {
  if (!inventory) return false;

  if (Array.isArray(inventory)) {
    const item = inventory.find((i) => i && i.name === itemName);
    if (item && item.quantity > 0) {
      item.quantity -= 1;
      return true;
    }
  } else if (inventory instanceof Map) {
    if (inventory.has(itemName) && inventory.get(itemName) > 0) {
      inventory.set(itemName, inventory.get(itemName) - 1);
      return true;
    }
  } else if (typeof inventory === "object") {
    if (inventory[itemName] && inventory[itemName] > 0) {
      inventory[itemName] -= 1;
      return true;
    }
  }

  return false;
};

/**
 * Wyzwala losowe wydarzenie podczas polowania
 * @param {Object} state - Stan polowania
 * @returns {boolean} Czy wydarzenie zostało wyzwolone
 */
const triggerRandomEvent = (state) => {
  const event = RANDOM_EVENTS.find((e) => Math.random() < e.chance);
  if (event) {
    event.effect(state);
    return true;
  }
  return false;
};

/**
 * Oblicza bonus za passę
 * @param {Object} profile - Profil gracza
 * @returns {Object} Dane o bonusie za passę
 */
const calculateStreakBonus = (profile) => {
  const streak = profile.huntStreak || 0;
  if (streak >= 5)
    return { bonus: 0.5, message: "🔥 Świetna passa! (+50% zarobków)" };
  if (streak >= 3)
    return { bonus: 0.3, message: "🔥 Dobra passa! (+30% zarobków)" };
  if (streak >= 2)
    return { bonus: 0.15, message: "🔥 Mała passa! (+15% zarobków)" };
  return { bonus: 0, message: null };
};

/**
 * Losuje lokację polowania
 * @returns {string} Klucz wybranej lokacji
 */
const getRandomLocation = () => {
  const locations = Object.keys(LOCATION_EFFECTS);
  return locations[Math.floor(Math.random() * locations.length)];
};

/**
 * Tworzy domyślny profil gracza
 * @param {string} userId - ID użytkownika
 * @param {string} guildId - ID serwera
 * @returns {Object} Domyślny profil
 */
const createDefaultProfile = (userId, guildId) => {
  return {
    userId,
    guildId,
    balance: 0,
    sanity: 100,
    inventory: [],
    huntStreak: 0,
    totalHunts: 0,
    successfulHunts: 0,
    lastHunt: null,
    totalEarnings: 0,
    maxEarningsPerHunt: 0,
    itemsUsed: 0,
    favoriteEquipment: [],
  };
};

/**
 * Waliduje stan polowania
 * @param {Object} state - Stan polowania
 * @returns {boolean} Czy stan jest prawidłowy
 */
const validateHuntState = (state) => {
  return (
    state &&
    state.targetGhost &&
    state.locationData &&
    Array.isArray(state.bonusReport) &&
    typeof state.earnings === "number"
  );
};

module.exports = {
  formatTime,
  safeEmbedReply,
  consumeItem,
  triggerRandomEvent,
  calculateStreakBonus,
  getRandomLocation,
  createDefaultProfile,
  validateHuntState,
};
