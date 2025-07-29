const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const LocationManager = require("./locationManager");
const FindManager = require("./findManager");
const EquipmentManager = require("./equipmentManager");
const TeamManager = require("../team/teamManager");
const { parseDuration, formatDuration } = require("../time");

class CooperativeInvestigation {
  constructor() {
    this.locationManager = new LocationManager();
    this.findManager = new FindManager();
    this.equipmentManager = new EquipmentManager();
    this.teamManager = new TeamManager();
    this.cooldownTime = parseDuration("2m"); // Shorter cooldown for team investigations
  }

  /**
   * Sprawdza cooldown dla zespołu
   */
  async checkTeamCooldown(teamSession) {
    const lastInvestigateTime =
      teamSession.investigationData.lastInvestigate?.getTime() || 0;
    const timeLeft = this.cooldownTime - (Date.now() - lastInvestigateTime);

    if (timeLeft > 0) {
      return {
        onCooldown: true,
        timeLeft: formatDuration(timeLeft),
      };
    }

    return { onCooldown: false };
  }

  /**
   * Sprawdza wymagania poczytalności zespołu
   */
  checkTeamSanityRequirement(participants, minSanity = 15) {
    const averageSanity =
      participants.reduce((sum, p) => sum + (p.sanity || 50), 0) /
      participants.length;
    return averageSanity >= minSanity;
  }

  /**
   * Tworzy embed lokacji dla zespołu
   */
  createTeamLocationEmbed(location, teamSession) {
    const dangerStars = "⭐".repeat(location.dangerLevel);
    const sizeInfo = location.size ? `\n📏 Rozmiar: ${location.size}` : "";
    const teamSize = teamSession.participants.length;

    return new EmbedBuilder()
      .setTitle("🌙 Zespołowy nocny zwiad")
      .setDescription(
        `Zespół dotarł do lokacji: **${location.name}**\n` +
          `*${location.description}*\n\n` +
          `${location.emoji} Poziom niebezpieczeństwa: ${dangerStars}` +
          `${sizeInfo}\n` +
          `👥 Wielkość zespołu: ${teamSize} ${
            teamSize > 1 ? "członków" : "członek"
          }\n\n` +
          `**Czy zespół chce kontynuować badanie?**`
      )
      .setColor("#2c3e50")
      .setTimestamp();
  }

  /**
   * Tworzy przyciski potwierdzenia dla zespołu
   */
  createTeamConfirmationButtons(sessionId) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`team_investigate_confirm_${sessionId}`)
        .setLabel("Zespół wchodzi")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🚪"),
      new ButtonBuilder()
        .setCustomId(`team_investigate_cancel_${sessionId}`)
        .setLabel("Zespół się wycofuje")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🏃")
    );
  }

  /**
   * Tworzy embed wyboru obszaru dla zespołu
   */
  createTeamAreaSelectionEmbed(location, teamSession) {
    const searchedAreas = teamSession.investigationData.areasSearched || [];
    const availableAreas = location.searchAreas.filter(
      (area) => !searchedAreas.includes(area)
    );

    return new EmbedBuilder()
      .setTitle("🔍 Zespół wybiera obszar do przeszukania")
      .setDescription(
        `Zespół jest w: **${location.name}**\n\n` +
          `Przeszukane obszary: ${
            searchedAreas.length > 0 ? searchedAreas.join(", ") : "Brak"
          }\n` +
          `Dostępne obszary: ${availableAreas.length}\n\n` +
          `**Gdzie zespół chce szukać?**`
      )
      .setColor("#3498db");
  }

  /**
   * Tworzy przyciski obszarów dla zespołu
   */
  createTeamAreaButtons(location, teamSession, sessionId) {
    const emojis = ["🏠", "🚪", "🪑", "🛏️", "📚", "🔍", "🗃️", "🚽", "🪜"];
    const searchedAreas = teamSession.investigationData.areasSearched || [];
    const availableAreas = location.searchAreas.filter(
      (area) => !searchedAreas.includes(area)
    );

    const areaButtons = availableAreas.slice(0, 9).map((area, index) =>
      new ButtonBuilder()
        .setCustomId(`team_area_${sessionId}_${index}`)
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

  /**
   * Tworzy embed przeszukiwania dla zespołu
   */
  createTeamSearchingEmbed(selectedArea, location, teamSession) {
    const teamSize = teamSession.participants.length;

    return new EmbedBuilder()
      .setTitle("🔍 Zespół przeszukuje lokację...")
      .setDescription(
        `Zespół ${teamSize} osób ostrożnie bada **${selectedArea}** w lokacji **${location.name}**...\n\n` +
          `*Wszyscy nasłuchują każdego dźwięku i obserwują otoczenie...*\n` +
          `*Współpraca zwiększa szanse na znalezienie czegoś wartościowego...*`
      )
      .setColor("#95a5a6")
      .setTimestamp();
  }

  /**
   * Przetwarza zespołowe śledztwo
   */
  async processTeamInvestigation(
    teamSession,
    location,
    selectedArea,
    initiatorId
  ) {
    const teamSize = teamSession.participants.length;
    const teamLevel = this.calculateTeamLevel(teamSession.participants);

    // Bonus zespołowy zwiększa szanse na lepsze znaleziska
    const teamBonus = this.calculateTeamBonus(teamSize);
    const enhancedMultiplier = location.baseMultiplier * (1 + teamBonus);

    // Każdy członek zespołu ma szansę na znalezienie czegoś
    const teamFinds = [];
    let totalRewards = { money: 0, items: [], experience: 0 };
    let totalSanityChange = 0;

    for (let i = 0; i < teamSize; i++) {
      const find = this.findManager.getRandomFind(
        enhancedMultiplier,
        teamLevel
      );
      let result = this.findManager.processFind(find, selectedArea, location, {
        level: teamLevel,
        inventory: new Map(), // Simplified for team processing
      });

      // Aplikuj bonusy sprzętu zespołowego
      const teamEquipmentBonuses = this.calculateTeamEquipmentBonuses(
        teamSession.participants
      );
      result = this.equipmentManager.applyEquipmentBonuses(
        result,
        teamEquipmentBonuses
      );

      teamFinds.push({
        ...result,
        foundBy:
          i === 0
            ? initiatorId
            : teamSession.participants[i]?.userId || initiatorId,
      });

      // Sumuj nagrody
      totalRewards.money += result.rewards.money;
      totalRewards.experience += result.rewards.experience;
      totalRewards.items.push(...result.rewards.items);
      totalSanityChange += result.sanityChange;
    }

    // Dodaj bonus zespołowy do nagród
    totalRewards.money = Math.floor(totalRewards.money * (1 + teamBonus));
    totalRewards.experience = Math.floor(
      totalRewards.experience * (1 + teamBonus)
    );

    // Zmniejsz utratę poczytalności dzięki wsparciu zespołu
    totalSanityChange = Math.floor(totalSanityChange * 0.7); // 30% mniej utraty poczytalności

    // Aktualizuj dane sesji
    teamSession.investigationData.sharedFinds.push(...teamFinds);
    teamSession.investigationData.totalEarnings += totalRewards.money;
    teamSession.investigationData.totalExperience += totalRewards.experience;
    teamSession.investigationData.areasSearched.push(selectedArea);
    teamSession.investigationData.lastInvestigate = new Date();

    await teamSession.save();

    // Zastosuj nagrody do wszystkich uczestników
    await this.distributeTeamRewards(
      teamSession,
      totalRewards,
      totalSanityChange
    );

    return {
      teamFinds,
      totalRewards,
      totalSanityChange,
      teamBonus,
      selectedArea,
      location,
    };
  }

  /**
   * Oblicza poziom zespołu
   */
  calculateTeamLevel(participants) {
    const totalExperience = participants.reduce(
      (sum, p) => sum + (p.experience || 0),
      0
    );
    const averageExperience = totalExperience / participants.length;
    return Math.floor(averageExperience / 100) + 1;
  }

  /**
   * Oblicza bonus zespołowy
   */
  calculateTeamBonus(teamSize) {
    const bonuses = {
      2: 0.25, // 25% bonus for 2 members
      3: 0.4, // 40% bonus for 3 members
      4: 0.55, // 55% bonus for 4 members
      5: 0.65, // 65% bonus for 5+ members
    };
    return bonuses[Math.min(teamSize, 5)] || bonuses[5];
  }

  /**
   * Oblicza bonusy sprzętu zespołowego
   */
  calculateTeamEquipmentBonuses(participants) {
    const allEquipment = new Map();

    // Zbierz wszystkie wyposażenie zespołu
    participants.forEach((participant) => {
      if (participant.inventory && participant.inventory instanceof Map) {
        for (const [item, quantity] of participant.inventory) {
          const currentQuantity = allEquipment.get(item) || 0;
          allEquipment.set(item, currentQuantity + quantity);
        }
      }
    });

    return this.equipmentManager.calculateEquipmentBonuses(
      Array.from(allEquipment.keys())
    );
  }

  /**
   * Dystrybuuje nagrody zespołowe
   */
  async distributeTeamRewards(teamSession, totalRewards, totalSanityChange) {
    const participants = teamSession.participants;
    const rewardsPerMember = {
      money: Math.floor(totalRewards.money / participants.length),
      experience: Math.floor(totalRewards.experience / participants.length),
      sanityChange: Math.floor(totalSanityChange / participants.length),
    };

    // Dystrybuuj przedmioty losowo między członków zespołu
    const itemDistribution = new Map();
    totalRewards.items.forEach((item) => {
      const randomMember =
        participants[Math.floor(Math.random() * participants.length)];
      const memberItems = itemDistribution.get(randomMember.userId) || [];
      memberItems.push(item);
      itemDistribution.set(randomMember.userId, memberItems);
    });

    // Tutaj normalnie aktualizowalibyśmy profile użytkowników
    // Dla uproszczenia, zwracamy informacje o dystrybucji
    return {
      rewardsPerMember,
      itemDistribution,
    };
  }

  /**
   * Tworzy embed wyników zespołowych
   */
  createTeamResultsEmbed(result, teamSession) {
    const {
      teamFinds,
      totalRewards,
      totalSanityChange,
      teamBonus,
      selectedArea,
      location,
    } = result;
    const teamSize = teamSession.participants.length;

    const embed = new EmbedBuilder()
      .setTitle(`🔍 Zakończono zespołowy zwiad!`)
      .setDescription(
        `Zespół ${teamSize} osób przeszukał **${selectedArea}** w lokacji **${location.name}**\n\n` +
          `*Współpraca przyniosła lepsze rezultaty niż samotne działanie!*`
      )
      .setColor("#27ae60")
      .addFields([
        {
          name: "📍 Szczegóły",
          value:
            `${location.emoji} **Lokacja:** ${location.name}\n` +
            `🔍 **Obszar:** ${selectedArea}\n` +
            `👥 **Wielkość zespołu:** ${teamSize} członków\n` +
            `🤝 **Bonus zespołowy:** +${Math.floor(teamBonus * 100)}%`,
          inline: false,
        },
        {
          name: "💰 Nagrody zespołowe",
          value:
            `💵 **Całkowite zarobki:** $${totalRewards.money}\n` +
            `🎯 **Całkowite doświadczenie:** +${totalRewards.experience} XP\n` +
            `🧠 **Zmiana poczytalności:** ${
              totalSanityChange > 0 ? "+" : ""
            }${totalSanityChange}%\n` +
            `🎒 **Znalezione przedmioty:** ${totalRewards.items.length}`,
          inline: false,
        },
      ])
      .setTimestamp();

    // Dodaj szczegóły znalezisk
    if (teamFinds.length > 0) {
      const findsText = teamFinds
        .slice(0, 5)
        .map((find, index) => {
          return `${find.find.emoji} **${find.find.name}** (znalazł: <@${find.foundBy}>)`;
        })
        .join("\n");

      embed.addFields([
        {
          name: "🎒 Znaleziska zespołu",
          value:
            findsText +
            (teamFinds.length > 5
              ? `\n*...i ${teamFinds.length - 5} więcej*`
              : ""),
          inline: false,
        },
      ]);
    }

    // Dodaj statystyki obszarów
    const searchedAreas = teamSession.investigationData.areasSearched || [];
    if (searchedAreas.length > 0) {
      embed.addFields([
        {
          name: "🗺️ Przeszukane obszary",
          value: searchedAreas.join(", "),
          inline: false,
        },
      ]);
    }

    return embed;
  }

  /**
   * Tworzy embed anulowania dla zespołu
   */
  createTeamCancelEmbed() {
    return new EmbedBuilder()
      .setTitle("🏃 Zespół się wycofuje")
      .setDescription(
        "Zespół rozsądnie zdecydował się wycofać. Czasami lepiej być ostrożnym, " +
          "zwłaszcza gdy odpowiadasz za bezpieczeństwo całego zespołu."
      )
      .setColor("#95a5a6");
  }

  /**
   * Tworzy embed wejścia zespołu
   */
  createTeamEnterEmbed(location, teamSession) {
    const teamSize = teamSession.participants.length;

    return new EmbedBuilder()
      .setTitle(`${location.emoji} Zespół wchodzi do lokacji...`)
      .setDescription(
        `Zespół ${teamSize} osób przekracza próg i rozgląda się po ciemnym wnętrzu...\n\n` +
          `*Razem czujecie się bezpieczniej, ale niebezpieczeństwo nadal czai się w ciemności...*`
      )
      .setColor("#34495e");
  }

  /**
   * Tworzy przyciski akcji zespołowych
   */
  createTeamActionButtons(sessionId, location, teamSession) {
    const searchedAreas = teamSession.investigationData.areasSearched || [];
    const hasAvailableAreas = location.searchAreas.some(
      (area) => !searchedAreas.includes(area)
    );

    const buttons = [];

    if (hasAvailableAreas) {
      buttons.push(
        new ButtonBuilder()
          .setCustomId(`team_investigate_search_${sessionId}`)
          .setLabel("Przeszukaj obszar")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("🔍")
      );
    }

    buttons.push(
      new ButtonBuilder()
        .setCustomId(`team_investigate_status_${sessionId}`)
        .setLabel("Status zespołu")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📊"),
      new ButtonBuilder()
        .setCustomId(`team_investigate_findings_${sessionId}`)
        .setLabel("Znaleziska")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("🎒"),
      new ButtonBuilder()
        .setCustomId(`team_investigate_leave_${sessionId}`)
        .setLabel("Opuść lokację")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🚪")
    );

    const rows = [];
    for (let i = 0; i < buttons.length; i += 3) {
      rows.push(new ActionRowBuilder().addComponents(buttons.slice(i, i + 3)));
    }

    return rows;
  }

  /**
   * Tworzy embed statusu zespołu
   */
  createTeamStatusEmbed(teamSession, location) {
    const participants = teamSession.participants;
    const searchedAreas = teamSession.investigationData.areasSearched || [];
    const totalFinds = teamSession.investigationData.sharedFinds.length;

    const participantsText = participants
      .map((p) => {
        const status = p.status === "active" ? "🟢" : "🔴";
        return `${status} <@${p.userId}>`;
      })
      .join("\n");

    return new EmbedBuilder()
      .setTitle("📊 Status zespołu")
      .setDescription(`Zespołowe śledztwo w lokacji: **${location.name}**`)
      .addFields([
        {
          name: "👥 Członkowie zespołu",
          value: participantsText,
          inline: true,
        },
        {
          name: "🔍 Postęp",
          value:
            `Przeszukane obszary: ${searchedAreas.length}/${location.searchAreas.length}\n` +
            `Znaleziska: ${totalFinds}\n` +
            `Zarobki: $${teamSession.investigationData.totalEarnings}\n` +
            `Doświadczenie: ${teamSession.investigationData.totalExperience} XP`,
          inline: true,
        },
      ])
      .setColor("#3498db")
      .setTimestamp();
  }

  /**
   * Tworzy embed znalezisk zespołu
   */
  createTeamFindingsEmbed(teamSession) {
    const finds = teamSession.investigationData.sharedFinds || [];

    if (finds.length === 0) {
      return new EmbedBuilder()
        .setTitle("🎒 Znaleziska zespołu")
        .setDescription("Zespół jeszcze nic nie znalazł.")
        .setColor("#95a5a6");
    }

    const findsList = finds
      .slice(0, 10)
      .map((find, index) => {
        return (
          `${index + 1}. ${find.find?.emoji || "🔍"} **${
            find.find?.name || "Nieznane znalezisko"
          }** ` + `(${find.area}) - znalazł: <@${find.foundBy}>`
        );
      })
      .join("\n");

    return new EmbedBuilder()
      .setTitle("🎒 Znaleziska zespołu")
      .setDescription(
        findsList +
          (finds.length > 10 ? `\n*...i ${finds.length - 10} więcej*` : "")
      )
      .addFields([
        {
          name: "📊 Podsumowanie",
          value:
            `🎒 Całkowite znaleziska: ${finds.length}\n` +
            `💰 Całkowite zarobki: $${teamSession.investigationData.totalEarnings}\n` +
            `🎯 Całkowite doświadczenie: ${teamSession.investigationData.totalExperience} XP`,
          inline: false,
        },
      ])
      .setColor("#27ae60")
      .setTimestamp();
  }
}

module.exports = CooperativeInvestigation;
