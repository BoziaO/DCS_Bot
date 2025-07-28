const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const LocationManager = require("./locationManager");
const FindManager = require("./findManager");
const EquipmentManager = require("./equipmentManager");
const { parseDuration, formatDuration } = require("../time");

class InvestigateCore {
  constructor() {
    this.locationManager = new LocationManager();
    this.findManager = new FindManager();
    this.equipmentManager = new EquipmentManager();
    this.cooldownTime = parseDuration("4m");
  }

  async checkCooldown(userProfile) {
    const lastInvestigateTime = userProfile.lastInvestigate?.getTime() || 0;
    const timeLeft = this.cooldownTime - (Date.now() - lastInvestigateTime);

    if (timeLeft > 0) {
      return {
        onCooldown: true,
        timeLeft: formatDuration(timeLeft),
      };
    }

    return { onCooldown: false };
  }

  checkSanityRequirement(userProfile, minSanity = 20) {
    return userProfile.sanity >= minSanity;
  }

  createLocationEmbed(location) {
    const dangerStars = "⭐".repeat(location.dangerLevel);
    const sizeInfo = location.size ? `\n📏 Rozmiar: ${location.size}` : "";

    return new EmbedBuilder()
      .setTitle("🌙 Nocny zwiad")
      .setDescription(
        `Dotarłeś/aś do lokacji: **${location.name}**\n` +
          `*${location.description}*\n\n` +
          `${location.emoji} Poziom niebezpieczeństwa: ${dangerStars}` +
          `${sizeInfo}\n\n` +
          `**Czy chcesz kontynuować badanie?**`
      )
      .setColor("#2c3e50")
      .setTimestamp();
  }

  createConfirmationButtons() {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("investigate_confirm")
        .setLabel("Wejdź do środka")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🚪"),
      new ButtonBuilder()
        .setCustomId("investigate_cancel")
        .setLabel("Wycofaj się")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🏃")
    );
  }

  createAreaSelectionEmbed(location) {
    return new EmbedBuilder()
      .setTitle("🔍 Wybierz obszar do przeszukania")
      .setDescription(`Jesteś w: **${location.name}**\n\nGdzie chcesz szukać?`)
      .setColor("#3498db");
  }

  createAreaButtons(location) {
    const emojis = ["🏠", "🚪", "🪑", "🛏️", "📚", "🔍", "🗃️", "🚽", "🪜"];

    const areaButtons = location.searchAreas.slice(0, 9).map((area, index) =>
      new ButtonBuilder()
        .setCustomId(`area_${index}`)
        .setLabel(area.charAt(0).toUpperCase() + area.slice(1))
        .setStyle(ButtonStyle.Secondary)
        .setEmoji(emojis[index] || "🔍")
    );

    const areaRows = [];
    for (let i = 0; i < areaButtons.length; i += 3) {
      areaRows.push(
        new ActionRowBuilder().addComponents(areaButtons.slice(i, i + 3))
      );
    }

    return areaRows;
  }

  createSearchingEmbed(selectedArea, location) {
    return new EmbedBuilder()
      .setTitle("🔍 Przeszukujesz lokację...")
      .setDescription(
        `Ostrożnie badasz **${selectedArea}** w lokacji **${location.name}**...\n\n` +
          `*Nasłuchujesz każdego dźwięku...*`
      )
      .setColor("#95a5a6")
      .setTimestamp();
  }

  async processInvestigation(userProfile, location, selectedArea) {
    const userLevel = this.calculateUserLevel(userProfile);
    const find = this.findManager.getRandomFind(
      location.baseMultiplier,
      userLevel
    );
    let result = this.findManager.processFind(
      find,
      selectedArea,
      location,
      userProfile
    );

    const equipmentBonuses = this.equipmentManager.calculateEquipmentBonuses(
      userProfile.inventory || []
    );
    result = this.equipmentManager.applyEquipmentBonuses(
      result,
      equipmentBonuses
    );

    await this.applyRewards(userProfile, result.rewards);

    userProfile.sanity = Math.max(
      0,
      Math.min(100, userProfile.sanity + result.sanityChange)
    );
    userProfile.lastInvestigate = new Date();

    this.updateStatistics(userProfile, location, result);

    await userProfile.save();

    return result;
  }

  async applyRewards(userProfile, rewards) {
    if (rewards.money > 0) {
      userProfile.balance += rewards.money;
      userProfile.totalEarnings =
        (userProfile.totalEarnings || 0) + rewards.money;
    }

    for (const rewardItem of rewards.items) {
      if (userProfile.inventory.has(rewardItem.name)) {
        const currentQuantity = userProfile.inventory.get(rewardItem.name);
        userProfile.inventory.set(
          rewardItem.name,
          currentQuantity + rewardItem.quantity
        );
      } else {
        userProfile.inventory.set(rewardItem.name, rewardItem.quantity);
      }
    }

    if (rewards.experience > 0) {
      userProfile.experience =
        (userProfile.experience || 0) + rewards.experience;
    }
  }

  updateStatistics(userProfile, location, result) {
    if (!userProfile.investigateStats) {
      userProfile.investigateStats = {
        totalInvestigations: 0,
        locationsVisited: {},
        findsHistory: {},
        ghostEncounters: {},
        totalExperience: 0,
      };
    }

    const stats = userProfile.investigateStats;
    stats.totalInvestigations += 1;
    stats.totalExperience += result.rewards.experience;

    if (!stats.locationsVisited[location.name]) {
      stats.locationsVisited[location.name] = 0;
    }
    stats.locationsVisited[location.name] += 1;

    if (!stats.findsHistory[result.find.type]) {
      stats.findsHistory[result.find.type] = 0;
    }
    stats.findsHistory[result.find.type] += 1;

    if (result.find.type === "ghost_encounter" && result.rewards.ghostName) {
      if (!stats.ghostEncounters[result.rewards.ghostName]) {
        stats.ghostEncounters[result.rewards.ghostName] = 0;
      }
      stats.ghostEncounters[result.rewards.ghostName] += 1;
    }
  }

  calculateUserLevel(userProfile) {
    const experience = userProfile.experience || 0;
    return Math.floor(experience / 100) + 1;
  }

  createResultEmbed(result, location, selectedArea, userProfile) {
    const userLevel = this.calculateUserLevel(userProfile);

    const embed = new EmbedBuilder()
      .setTitle(`${result.find.emoji} Zakończono zwiad!`)
      .setDescription(result.message)
      .setColor(result.color)
      .addFields([
        {
          name: "📍 Lokacja",
          value: `${location.emoji} ${location.name}`,
          inline: true,
        },
        { name: "🔍 Obszar", value: selectedArea, inline: true },
        {
          name: "🧠 Poczytalność",
          value: `${userProfile.sanity}%`,
          inline: true,
        },
        { name: "⭐ Poziom", value: `${userLevel}`, inline: true },
        {
          name: "🎯 Doświadczenie",
          value: `+${result.rewards.experience} XP`,
          inline: true,
        },
        {
          name: "💰 Zarobki",
          value:
            result.rewards.money > 0 ? `+$${result.rewards.money}` : "Brak",
          inline: true,
        },
      ])
      .setTimestamp();

    if (result.rewards.items.length > 0) {
      const itemsList = result.rewards.items
        .map((item) => `${item.name} x${item.quantity}`)
        .join("\n");
      embed.addFields([
        { name: "🎒 Znalezione przedmioty", value: itemsList, inline: false },
      ]);
    }

    return embed;
  }

  createCancelEmbed() {
    return new EmbedBuilder()
      .setTitle("🏃 Wycofanie")
      .setDescription(
        "Rozsądnie zdecydowałeś/aś się wycofać. Czasami lepiej być ostrożnym."
      )
      .setColor("#95a5a6");
  }

  createEnterEmbed(location) {
    return new EmbedBuilder()
      .setTitle(`${location.emoji} Wchodzisz do lokacji...`)
      .setDescription(
        "Przekraczasz próg i rozglądasz się po ciemnym wnętrzu..."
      )
      .setColor("#34495e");
  }

  getLocationsByDifficulty(difficulty) {
    return this.locationManager.getLocationsByDifficulty(difficulty);
  }

  getLocationsByType(type) {
    return this.locationManager.getLocationsByType(type);
  }

  getUserStatistics(userProfile) {
    const stats = userProfile.investigateStats || {};
    const level = this.calculateUserLevel(userProfile);

    return {
      level,
      totalInvestigations: stats.totalInvestigations || 0,
      totalExperience: stats.totalExperience || 0,
      favoriteLocation: this.getFavoriteLocation(stats.locationsVisited || {}),
      mostCommonFind: this.getMostCommonFind(stats.findsHistory || {}),
      locationsVisited: Object.keys(stats.locationsVisited || {}).length,
    };
  }

  getFavoriteLocation(locationsVisited) {
    let maxVisits = 0;
    let favorite = "Brak";

    for (const [location, visits] of Object.entries(locationsVisited)) {
      if (visits > maxVisits) {
        maxVisits = visits;
        favorite = location;
      }
    }

    return favorite;
  }

  getMostCommonFind(findsHistory) {
    let maxFinds = 0;
    let mostCommon = "Brak";

    for (const [findType, count] of Object.entries(findsHistory)) {
      if (count > maxFinds) {
        maxFinds = count;
        mostCommon = findType;
      }
    }

    return mostCommon;
  }
}

module.exports = InvestigateCore;
