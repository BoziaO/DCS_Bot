const {LOCATION_EFFECTS, RANDOM_EVENTS} = require("./constants");

const formatTime = (milliseconds) => {
    const seconds = Math.ceil(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    if (minutes > 0) {
        return `${minutes}m ${remainingSeconds}s`;
    }
    return `${remainingSeconds}s`;
};

const safeEmbedReply = async (interaction, embed, components = []) => {
    try {
        if (interaction.replied || interaction.deferred) {
            return await interaction.editReply({embeds: [embed], components});
        } else {
            return await interaction.reply({embeds: [embed], components});
        }
    } catch (error) {
        console.error("Error sending embed:", error);
        throw error;
    }
};

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

const triggerRandomEvent = (state) => {
    const event = RANDOM_EVENTS.find((e) => Math.random() < e.chance);
    if (event) {
        event.effect(state);
        return true;
    }
    return false;
};

const calculateStreakBonus = (profile) => {
    const streak = profile.huntStreak || 0;
    if (streak >= 5)
        return {bonus: 0.5, message: "🔥 Świetna passa! (+50% zarobków)"};
    if (streak >= 3)
        return {bonus: 0.3, message: "🔥 Dobra passa! (+30% zarobków)"};
    if (streak >= 2)
        return {bonus: 0.15, message: "🔥 Mała passa! (+15% zarobków)"};
    return {bonus: 0, message: null};
};

const getRandomLocation = () => {
    const locations = Object.keys(LOCATION_EFFECTS);
    return locations[Math.floor(Math.random() * locations.length)];
};

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
