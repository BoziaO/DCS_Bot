const {HUNT_ITEM_EFFECTS} = require("./constants");

const handleHuntItemAutocomplete = async (interaction, userProfile) => {
    try {
        if (!userProfile || !userProfile.inventory) {
            return await interaction.respond([]);
        }

        const huntableItemNames = Object.keys(HUNT_ITEM_EFFECTS);
        const focusedValue = interaction.options.getFocused().toLowerCase();

        let userHuntableItems = [];

        if (Array.isArray(userProfile.inventory)) {
            userHuntableItems = userProfile.inventory
                .filter(
                    (item) =>
                        item && huntableItemNames.includes(item.name) && item.quantity > 0
                )
                .map((item) => ({
                    displayName: `${item.name} (${item.quantity}x)`,
                    realName: item.name,
                }));
        } else if (userProfile.inventory instanceof Map) {
            userHuntableItems = Array.from(userProfile.inventory.entries())
                .filter(
                    ([itemName, quantity]) =>
                        huntableItemNames.includes(itemName) && quantity > 0
                )
                .map(([itemName, quantity]) => ({
                    displayName: `${itemName} (${quantity}x)`,
                    realName: itemName,
                }));
        } else if (typeof userProfile.inventory === "object") {
            userHuntableItems = Object.entries(userProfile.inventory)
                .filter(
                    ([itemName, quantity]) =>
                        huntableItemNames.includes(itemName) && quantity > 0
                )
                .map(([itemName, quantity]) => ({
                    displayName: `${itemName} (${quantity}x)`,
                    realName: itemName,
                }));
        }

        const filteredItems = userHuntableItems.filter((choice) =>
            choice.displayName.toLowerCase().includes(focusedValue)
        );

        await interaction.respond(
            filteredItems.slice(0, 25).map((choice) => ({
                name: choice.displayName,
                value: choice.realName,
            }))
        );
    } catch (error) {
        console.error("Autocomplete error:", error);
        await interaction.respond([]);
    }
};

module.exports = {
    handleHuntItemAutocomplete,
};
