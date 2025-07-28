const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");
const { maps, equipment } = require("../../data/phasmophobiaData");
const { cache } = require("../cache");

/**
 * Pobiera dane gry z cache lub fallback do importu
 */
const getGameData = (dataType) => {
  const cached = cache.getGameData(dataType);
  if (cached) return cached;

  switch (dataType) {
    case "maps":
      return maps;
    case "equipment":
      return equipment;
    default:
      return null;
  }
};

/**
 * Tworzy embed wyboru mapy
 */
const createMapSelectionEmbed = (user) => {
  if (!user) {
    console.error("Missing user parameter for createMapSelectionEmbed");
    return null;
  }
  const description = [
    `${user}, wybierz mapę na której chcesz polować!`,
    ``,
    `**Legenda trudności:**`,
    `🟢 **Easy** - Mniejsze ryzyko, mniejsze nagrody`,
    `🟡 **Medium** - Zbalansowane ryzyko i nagrody`,
    `🔴 **Hard** - Wysokie ryzyko, wysokie nagrody`,
    `⚫ **Nightmare** - Ekstremalne ryzyko, maksymalne nagrody`,
    ``,
    `*Wybierz mapę z menu poniżej lub kliknij 'Losowa Mapa' dla niespodzianki!*`,
  ].join("\n");

  const embed = new EmbedBuilder()
    .setTitle("🗺️ **WYBÓR LOKACJI POLOWANIA**")
    .setDescription(description)
    .setColor(0x2f3136)
    .setFooter({ text: "Masz 60 sekund na wybór mapy" });

  try {
    const avatarURL = user.displayAvatarURL({ dynamic: true });
    if (avatarURL) {
      embed.setThumbnail(avatarURL);
    }
  } catch (error) {
    console.warn("Could not set thumbnail:", error);
  }

  return embed;
};

/**
 * Tworzy menu wyboru mapy
 */
const createMapSelectMenu = () => {
  if (!maps || !Array.isArray(maps) || maps.length === 0) {
    console.error("Invalid maps data for createMapSelectMenu:", maps);
    return null;
  }

  const options = maps.slice(0, 25).map((map, index) => {
    const difficultyEmoji = {
      easy: "🟢",
      medium: "🟡",
      hard: "🔴",
      nightmare: "⚫",
    }[map.difficulty];

    const mapName = map.name || `Map ${index + 1}`;
    const mapSize = map.size || "unknown";
    const mapDifficulty = map.difficulty || "medium";
    const baseReward = map.baseReward || 0;

    return {
      label: mapName.slice(0, 100),
      description:
        `${mapSize} • ${mapDifficulty} • $${baseReward} nagroda`.slice(0, 100),
      value: index.toString(),
    };
  });

  return new StringSelectMenuBuilder()
    .setCustomId("hunt_map_select")
    .setPlaceholder("🗺️ Wybierz mapę do polowania...")
    .addOptions(options);
};

/**
 * Tworzy przyciski akcji dla wyboru mapy
 */
const createMapActionButtons = () => {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("hunt_random_map")
      .setLabel("🎲 Losowa Mapa")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("hunt_cancel")
      .setLabel("❌ Anuluj")
      .setStyle(ButtonStyle.Danger)
  );
};

/**
 * Pobiera dostępne itemy z inventory użytkownika
 */
const getAvailableItems = (userProfile) => {
  const availableItems = [];

  if (!userProfile.inventory) return availableItems;

  if (userProfile.inventory instanceof Map) {
    const equipmentData = getGameData("equipment");
    for (const [itemName, quantity] of userProfile.inventory) {
      if (quantity > 0) {
        const itemData = equipmentData.find((eq) => eq.name === itemName);
        if (itemData) {
          availableItems.push({
            name: itemName,
            quantity,
            ...itemData,
          });
        }
      }
    }
  } else if (Array.isArray(userProfile.inventory)) {
    const equipmentData = getGameData("equipment");
    userProfile.inventory.forEach((item) => {
      if (item.quantity > 0) {
        const itemData = equipmentData.find((eq) => eq.name === item.name);
        if (itemData) {
          availableItems.push({
            ...item,
            ...itemData,
          });
        }
      }
    });
  } else if (typeof userProfile.inventory === "object") {
    const equipmentData = getGameData("equipment");
    Object.entries(userProfile.inventory).forEach(([itemName, quantity]) => {
      if (quantity > 0) {
        const itemData = equipmentData.find((eq) => eq.name === itemName);
        if (itemData) {
          availableItems.push({
            name: itemName,
            quantity,
            ...itemData,
          });
        }
      }
    });
  }

  return availableItems;
};

/**
 * Tworzy embed wyboru itemów
 */
const createItemSelectionEmbed = (
  user,
  selectedMap,
  userProfile,
  selectedItems = []
) => {
  const availableItems = getAvailableItems(userProfile);

  const descriptionParts = [
    `${user}, wybierz do **3 itemów** z swojego ekwipunku!`,
    ``,
    `**Wybrana mapa:** ${selectedMap}`,
    `**Wybrane itemy:** ${selectedItems.length}/3`,
    ``,
  ];

  if (selectedItems.length > 0) {
    descriptionParts.push(`**Aktualnie wybrane:**`);
    selectedItems.forEach((item) => descriptionParts.push(`• ${item}`));
    descriptionParts.push(``);
  }

  descriptionParts.push(`**Dostępne itemy:** ${availableItems.length}`);

  if (availableItems.length === 0) {
    descriptionParts.push(`*Nie masz żadnych itemów w ekwipunku!*`);
    descriptionParts.push(``);
    descriptionParts.push(`💡 **Wskazówka:** Kup itemy używając \`/buy\``);
  } else {
    descriptionParts.push(
      `*Wybierz itemy z menu poniżej lub kontynuuj bez ekwipunku*`
    );
  }

  const description = descriptionParts.join("\n");

  const embed = new EmbedBuilder()
    .setTitle(`🎒 **WYBÓR EKWIPUNKU**`)
    .setDescription(description)
    .setColor(0x4a90e2)
    .setFooter({ text: "Itemy dają bonusy podczas polowania!" });

  try {
    const avatarURL = user.displayAvatarURL({ dynamic: true });
    if (avatarURL) {
      embed.setThumbnail(avatarURL);
    }
  } catch (error) {
    console.warn("Could not set thumbnail:", error);
  }

  return embed;
};

/**
 * Tworzy menu wyboru itemów
 */
const createItemSelectMenu = (userProfile, selectedItems = []) => {
  const availableItems = getAvailableItems(userProfile);

  if (availableItems.length === 0) {
    return null;
  }

  const unselectedItems = availableItems.filter(
    (item) => !selectedItems.includes(item.name)
  );

  if (unselectedItems.length === 0) {
    return null;
  }

  const options = unselectedItems.slice(0, 25).map((item) => {
    const itemName = item.name || "Unknown Item";
    const itemType = item.type || "item";
    const quantity = item.quantity || 1;
    const description = item.description || "No description";

    return {
      label: itemName.slice(0, 100),
      description: `${itemType} • x${quantity} • ${description.slice(
        0,
        50
      )}`.slice(0, 100),
      value: itemName,
    };
  });

  return new StringSelectMenuBuilder()
    .setCustomId("hunt_item_select")
    .setPlaceholder("🎒 Wybierz item z ekwipunku...")
    .addOptions(options);
};

/**
 * Tworzy przyciski dla wyboru itemów
 */
const createItemActionButtons = (selectedItems = []) => {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("hunt_continue_without_items")
      .setLabel("➡️ Kontynuuj bez itemów")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("hunt_continue_with_items")
      .setLabel("✅ Kontynuuj z itemami")
      .setStyle(ButtonStyle.Success)
      .setDisabled(selectedItems.length === 0),
    new ButtonBuilder()
      .setCustomId("hunt_clear_items")
      .setLabel("🗑️ Wyczyść wybór")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(selectedItems.length === 0)
  );
};

/**
 * Tworzy embed przygotowania do polowania
 */
const createHuntPreparationEmbed = (
  user,
  selectedMap,
  userProfile,
  selectedItems = []
) => {
  if (!user || !selectedMap || !userProfile) {
    console.error(
      "Missing required parameters for createHuntPreparationEmbed:",
      {
        user: !!user,
        selectedMap: !!selectedMap,
        userProfile: !!userProfile,
      }
    );
    return null;
  }
  const mapData = maps.find((m) => m.name === selectedMap);
  if (!mapData) {
    console.error(
      `Map not found: ${selectedMap}. Available maps:`,
      maps.map((m) => m.name)
    );
    return null;
  }

  if (!mapData.name || !mapData.description) {
    console.error(`Invalid map data for ${selectedMap}:`, mapData);
    return null;
  }

  const sanity = userProfile?.sanity ?? 100;
  const balance = userProfile?.balance ?? 0;
  const totalHunts = userProfile?.totalHunts ?? 0;

  const riskLevel =
    mapData.sanityDrain <= 1
      ? "🟢 Niskie"
      : mapData.sanityDrain <= 2
      ? "🟡 Średnie"
      : mapData.sanityDrain <= 2.5
      ? "🔴 Wysokie"
      : "⚫ Ekstremalne";

  const equipmentData = getGameData("equipment");
  const itemsText =
    selectedItems && Array.isArray(selectedItems) && selectedItems.length > 0
      ? `**Wybrane itemy:**\n${selectedItems
          .filter((item) => item && typeof item === "string")
          .map((item) => {
            const itemData = equipmentData.find((eq) => eq.name === item);
            return `${itemData?.emoji || "📦"} ${item}`;
          })
          .join("\n")}\n\n`
      : `**Ekwipunek:** *Brak wybranych itemów*\n\n`;

  const mapName = mapData.name || "Nieznana lokacja";
  const mapDescription = mapData.description || "Brak opisu";
  const mapEmoji = mapData.emoji || "🏠";
  const baseReward = mapData.baseReward || 0;
  const sanityDrain = mapData.sanityDrain || 1;
  const tips = mapData.tips || "Brak wskazówek";

  const description = [
    `**Lokacja:** ${mapName}`,
    `**Opis:** *${mapDescription}*`,
    ``,
    `**Twoje statystyki:**`,
    `💚 **Poczytalność:** ${sanity}%`,
    `💰 **Saldo:** $${balance.toLocaleString()}`,
    `🎯 **Polowania:** ${totalHunts}`,
    ``,
    itemsText.trim(),
    ``,
    `**Informacje o mapie:**`,
    `📊 **Poziom ryzyka:** ${riskLevel}`,
    `💎 **Nagroda bazowa:** $${baseReward}`,
    `🧠 **Utrata poczytalności:** ${sanityDrain}x`,
    ``,
    `**💡 Wskazówka:** ${tips}`,
  ].join("\n");

  const finalDescription =
    description.length > 4096
      ? description.substring(0, 4093) + "..."
      : description;

  const embed = new EmbedBuilder()
    .setTitle(`${mapEmoji} **PRZYGOTOWANIE DO POLOWANIA**`)
    .setDescription(finalDescription)
    .setColor(
      mapData.difficulty === "easy"
        ? 0x00ff00
        : mapData.difficulty === "medium"
        ? 0xffff00
        : mapData.difficulty === "hard"
        ? 0xff0000
        : 0x800080
    )
    .setFooter({ text: "Wybierz trudność i rozpocznij polowanie!" });

  try {
    const avatarURL = user.displayAvatarURL({ dynamic: true });
    if (avatarURL) {
      embed.setThumbnail(avatarURL);
    }
  } catch (error) {
    console.warn("Could not set thumbnail:", error);
  }

  return embed;
};

/**
 * Tworzy menu wyboru trudności
 */
const createDifficultySelectMenu = () => {
  const options = [
    {
      label: "🟢 Amator",
      description: "75s • Łatwy • 3 dowody • +80% nagrody",
      value: "amateur",
    },
    {
      label: "🟡 Średniozaawansowany",
      description: "60s • Normalny • 2 dowody • +100% nagrody",
      value: "intermediate",
    },
    {
      label: "🔴 Profesjonalny",
      description: "45s • Trudny • 2 dowody • +150% nagrody",
      value: "professional",
    },
    {
      label: "⚫ Koszmar",
      description: "30s • Ekstremalny • 1 dowód • +220% nagrody",
      value: "nightmare",
    },
  ];

  const validOptions = options.map((option) => ({
    label: option.label.slice(0, 100),
    description: option.description.slice(0, 100),
    value: option.value,
  }));

  return new StringSelectMenuBuilder()
    .setCustomId("hunt_difficulty_select")
    .setPlaceholder("⚔️ Wybierz poziom trudności...")
    .addOptions(validOptions);
};

/**
 * Tworzy przyciski akcji dla przygotowania
 */
const createPreparationButtons = (hasItems = false) => {
  const buttons = [
    new ButtonBuilder()
      .setCustomId("hunt_start")
      .setLabel("🚀 Rozpocznij Polowanie!")
      .setStyle(ButtonStyle.Success),
  ];

  if (hasItems) {
    buttons.unshift(
      new ButtonBuilder()
        .setCustomId("hunt_select_items")
        .setLabel("🎒 Wybierz Ekwipunek")
        .setStyle(ButtonStyle.Primary)
    );
  }

  buttons.push(
    new ButtonBuilder()
      .setCustomId("hunt_back_to_maps")
      .setLabel("🔙 Zmień Mapę")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("hunt_cancel")
      .setLabel("❌ Anuluj")
      .setStyle(ButtonStyle.Danger)
  );

  return new ActionRowBuilder().addComponents(buttons);
};

/**
 * Tworzy embed rozpoczęcia polowania
 */
const createHuntStartEmbed = (user, mapName, difficulty, targetGhost) => {
  const mapData = maps.find((m) => m.name === mapName);

  return new EmbedBuilder()
    .setTitle(`${mapData?.emoji || "👻"} **POLOWANIE ROZPOCZĘTE!**`)
    .setDescription(
      `${user}, wkraczasz do **${mapName}**...\n\n` +
        `🎯 **Trudność:** ${
          difficulty.charAt(0).toUpperCase() + difficulty.slice(1)
        }\n` +
        `👻 **Duch:** *Nieznany* (do odkrycia)\n` +
        `🔍 **Twoje zadanie:** Zbierz dowody i zidentyfikuj ducha!\n\n` +
        `*Atmosfera jest gęsta... Coś tu jest...*\n\n` +
        `**Dostępne akcje:**\n` +
        `🔦 **Rozejrzyj się** - Szukaj dowodów\n` +
        `📷 **Zrób zdjęcie** - Dokumentuj aktywność\n` +
        `🎤 **Użyj Spirit Box** - Komunikuj się z duchem\n` +
        `🌡️ **Sprawdź temperaturę** - Wykryj anomalie\n` +
        `🏃 **Uciekaj** - Zakończ polowanie (mniejsze nagrody)`
    )
    .setColor("#FF6B6B")
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setFooter({ text: "Wybierz swoją akcję... Ale uważaj!" });
};

/**
 * Tworzy przyciski akcji polowania
 */
const createHuntActionButtons = () => {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("hunt_investigate")
        .setLabel("🔦 Rozejrzyj się")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("hunt_photo")
        .setLabel("📷 Zrób zdjęcie")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("hunt_spirit_box")
        .setLabel("🎤 Spirit Box")
        .setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("hunt_temperature")
        .setLabel("🌡️ Temperatura")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("hunt_guess")
        .setLabel("🎯 Zgadnij ducha")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("hunt_escape")
        .setLabel("🏃 Uciekaj")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("hunt_view_evidence")
        .setLabel("🔍 Pokaż zebrane dowody")
        .setStyle(ButtonStyle.Secondary)
    ),
  ];
};

/**
 * Tworzy embed wyniku akcji
 */
const createActionResultEmbed = (user, action, result, huntState) => {
  const actionEmojis = {
    investigate: "🔦",
    photo: "📷",
    spirit_box: "🎤",
    temperature: "🌡️",
    guess: "🎯",
    escape: "🏃",
  };

  const actionNames = {
    investigate: "Rozglądanie się",
    photo: "Robienie zdjęcia",
    spirit_box: "Używanie Spirit Box",
    temperature: "Sprawdzanie temperatury",
    guess: "Zgadywanie ducha",
    escape: "Ucieczka",
  };

  return new EmbedBuilder()
    .setTitle(
      `${actionEmojis[action]} **${actionNames[action].toUpperCase()}**`
    )
    .setDescription(
      `${result.description}\n\n` +
        `**Zebrane dowody:**\n${
          huntState.collectedEvidence.length > 0
            ? huntState.collectedEvidence.map((e) => `✅ ${e}`).join("\n")
            : "*Brak dowodów*"
        }\n\n` +
        `**Status:**\n` +
        `💚 **Poczytalność:** ${huntState.currentSanity}%\n` +
        `⏱️ **Czas:** ${Math.floor(huntState.timeRemaining / 1000)}s\n` +
        `🎯 **Akcje:** ${huntState.actionsUsed}/5`
    )
    .setColor(result.success ? "#00FF00" : "#FF6B6B")
    .setThumbnail(user.displayAvatarURL({ dynamic: true }))
    .setFooter({
      text:
        huntState.timeRemaining > 0
          ? "Wybierz następną akcję!"
          : "Czas się skończył!",
    });
};
module.exports = {
  createMapSelectionEmbed,
  createMapSelectMenu,
  createMapActionButtons,
  getAvailableItems,
  createItemSelectionEmbed,
  createItemSelectMenu,
  createItemActionButtons,
  createHuntPreparationEmbed,
  createDifficultySelectMenu,
  createPreparationButtons,
  createHuntStartEmbed,
  createHuntActionButtons,
  createActionResultEmbed,
};
