const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const { ghosts, maps } = require("../../data/phasmophobiaData");
const { DIFFICULTY_SETTINGS, HUNT_ITEM_EFFECTS } = require("./constants");
const TeamManager = require("../team/teamManager");

class CooperativeHunt {
  constructor() {
    this.teamManager = new TeamManager();
  }

  /**
   * Tworzy stan kooperacyjnego polowania
   */
  createCooperativeHuntState(targetGhost, mapName, difficulty, teamSession) {
    const mapData = maps.find((m) => m.name === mapName);
    const difficultyData = DIFFICULTY_SETTINGS[difficulty];

    return {
      sessionId: teamSession.sessionId,
      targetGhost,
      mapData,
      difficulty,
      difficultyData,
      participants: teamSession.participants,
      sharedEvidence: [],
      teamSanity: 100,
      timeRemaining: difficultyData.time * 1.5,
      totalActionsUsed: 0,
      maxActions: difficultyData.maxActions * teamSession.participants.length,
      teamEarnings: 0,
      bonusReport: [],
      isCompleted: false,
      isCorrect: false,
      startTime: Date.now(),

      teamworkBonus: this.calculateTeamworkBonus(
        teamSession.participants.length
      ),
      communicationBonus: 0.1,
      sharedRiskReduction: 0.15,

      individualContributions: new Map(),

      sharedEquipmentBonuses: {
        sanityLossReduction: 0,
        investigateBonus: 0,
        photoBonus: 0,
        spiritBoxBonus: 0,
        temperatureBonus: 0,
        huntProtection: false,
        ghostActivityReduction: 0,
      },
    };
  }

  /**
   * Oblicza bonus za pracę zespołową
   */
  calculateTeamworkBonus(memberCount) {
    const bonuses = {
      2: 0.15,
      3: 0.25,
      4: 0.35,
      5: 0.4,
    };
    return bonuses[Math.min(memberCount, 5)] || bonuses[5];
  }

  /**
   * Aplikuje wspólne efekty sprzętu zespołu
   */
  applyTeamEquipmentEffects(huntState, teamSession) {
    const allItems = new Set();

    teamSession.huntData.selectedItems.forEach((memberItems) => {
      memberItems.items.forEach((item) => allItems.add(item));
    });

    allItems.forEach((itemName) => {
      const itemEffect = HUNT_ITEM_EFFECTS[itemName];
      if (itemEffect) {
        try {
          if (itemEffect.stackable) {
            const itemCount = this.countItemInTeam(itemName, teamSession);
            for (let i = 0; i < itemCount; i++) {
              itemEffect.apply(huntState.sharedEquipmentBonuses);
            }
          } else {
            itemEffect.apply(huntState.sharedEquipmentBonuses);
          }
        } catch (error) {
          console.error(
            `Error applying team item effect for ${itemName}:`,
            error
          );
        }
      }
    });
  }

  /**
   * Liczy ile razy dany przedmiot występuje w zespole
   */
  countItemInTeam(itemName, teamSession) {
    let count = 0;
    teamSession.huntData.selectedItems.forEach((memberItems) => {
      count += memberItems.items.filter((item) => item === itemName).length;
    });
    return count;
  }

  /**
   * Obsługuje zespołową akcję rozglądania się
   */
  async handleTeamInvestigateAction(huntState, userId, teamSession) {
    huntState.totalActionsUsed++;

    this.updateIndividualContribution(huntState, userId, "investigate");

    const baseChance = 0.6;
    const teamBonus = huntState.teamworkBonus;
    const equipmentBonus = huntState.sharedEquipmentBonuses.investigateBonus;
    const evidenceChance = Math.min(
      0.95,
      baseChance + teamBonus + equipmentBonus
    );

    let sanityLoss = Math.floor(Math.random() * 8 + 5);
    sanityLoss = Math.max(2, sanityLoss * (1 - huntState.sharedRiskReduction));
    sanityLoss = Math.max(
      1,
      sanityLoss - huntState.sharedEquipmentBonuses.sanityLossReduction
    );

    huntState.teamSanity = Math.max(0, huntState.teamSanity - sanityLoss);

    if (Math.random() < evidenceChance && huntState.sharedEvidence.length < 3) {
      const availableEvidence = huntState.targetGhost.evidence.filter(
        (e) => !huntState.sharedEvidence.includes(e)
      );

      if (availableEvidence.length > 0) {
        const foundEvidence =
          availableEvidence[
            Math.floor(Math.random() * availableEvidence.length)
          ];
        huntState.sharedEvidence.push(foundEvidence);

        await teamSession.addEvidence(userId, foundEvidence);

        const contribution = huntState.individualContributions.get(userId) || {
          evidenceFound: [],
          actionsUsed: 0,
          sanityLost: 0,
        };
        contribution.evidenceFound.push(foundEvidence);
        huntState.individualContributions.set(userId, contribution);

        return {
          success: true,
          description:
            `🔦 <@${userId}> rozgląda się po pomieszczeniu...\n\n` +
            `✅ **Zespół znalazł dowód:** ${foundEvidence}!\n` +
            `👥 **Wsparcie zespołu:** Zmniejszona utrata poczytalności (-${Math.floor(
              huntState.sharedRiskReduction * 100
            )}%)\n` +
            `😰 Zespół stracił ${sanityLoss}% poczytalności.\n\n` +
            `*Dzięki współpracy zespół może skuteczniej badać lokację...*`,
          evidenceFound: foundEvidence,
          sanityLoss,
          teamAction: true,
        };
      }
    }

    const teamEvents = [
      "Zespół słyszy dziwne kroki na górze...",
      "Drzwi zatrzaskują się, ale zespół pozostaje spokojny...",
      "Temperatura nagle spada, ale razem czujecie się bezpieczniej...",
      "Widzicie cień, ale wspólnie go obserwujecie...",
      "Światła migają, ale zespół jest gotowy...",
      "Słyszycie szepty, ale razem jesteście silniejsi...",
      "Przedmioty się przesuwają, ale zespół dokumentuje wszystko...",
    ];

    const randomEvent =
      teamEvents[Math.floor(Math.random() * teamEvents.length)];

    return {
      success: false,
      description:
        `🔦 <@${userId}> rozgląda się po pomieszczeniu...\n\n` +
        `❌ **Nie znaleziono dowodów**\n` +
        `👥 **Wsparcie zespołu:** Zmniejszona utrata poczytalności (-${Math.floor(
          huntState.sharedRiskReduction * 100
        )}%)\n` +
        `😰 Zespół stracił ${sanityLoss}% poczytalności.\n\n` +
        `*${randomEvent}*`,
      sanityLoss,
      teamAction: true,
    };
  }

  /**
   * Obsługuje zespołową akcję robienia zdjęcia
   */
  async handleTeamPhotoAction(huntState, userId, teamSession) {
    huntState.totalActionsUsed++;
    this.updateIndividualContribution(huntState, userId, "photo");

    const baseChance = 0.4;
    const teamBonus = huntState.teamworkBonus * 0.5;
    const equipmentBonus = huntState.sharedEquipmentBonuses.photoBonus;
    const photoChance = Math.min(0.85, baseChance + teamBonus + equipmentBonus);

    let sanityLoss = Math.floor(Math.random() * 6 + 3);
    sanityLoss = Math.max(1, sanityLoss * (1 - huntState.sharedRiskReduction));
    sanityLoss = Math.max(
      1,
      sanityLoss - huntState.sharedEquipmentBonuses.sanityLossReduction
    );

    huntState.teamSanity = Math.max(0, huntState.teamSanity - sanityLoss);

    if (Math.random() < photoChance) {
      const baseBonus = Math.floor(Math.random() * 100 + 50);
      const teamPhotoBonus = Math.floor(
        baseBonus * (1 + huntState.teamworkBonus)
      );
      huntState.teamEarnings += teamPhotoBonus;

      return {
        success: true,
        description:
          `📷 <@${userId}> robi zdjęcie dla zespołu...\n\n` +
          `✅ **Udane zespołowe zdjęcie!** Uchwyciłeś aktywność paranormalną!\n` +
          `💰 Bonus zespołowy za zdjęcie: +$${teamPhotoBonus}\n` +
          `👥 **Wsparcie zespołu:** Zmniejszona utrata poczytalności\n` +
          `😰 Zespół stracił ${sanityLoss}% poczytalności.\n\n` +
          `*Flash oświetla postać, ale zespół jest gotowy na wszystko...*`,
        bonus: teamPhotoBonus,
        sanityLoss,
        teamAction: true,
      };
    }

    return {
      success: false,
      description:
        `📷 <@${userId}> robi zdjęcie...\n\n` +
        `❌ **Puste zdjęcie** - Nic nie uchwyciłeś na kamerze.\n` +
        `👥 **Wsparcie zespołu:** Zmniejszona utrata poczytalności\n` +
        `😰 Zespół stracił ${sanityLoss}% poczytalności.\n\n` +
        `*Może duch się ukrywa... Zespół spróbuje ponownie.*`,
      sanityLoss,
      teamAction: true,
    };
  }

  /**
   * Obsługuje zespołową akcję Spirit Box
   */
  async handleTeamSpiritBoxAction(huntState, userId, teamSession) {
    huntState.totalActionsUsed++;
    this.updateIndividualContribution(huntState, userId, "spirit_box");

    const baseChance = 0.5;
    const teamBonus = huntState.teamworkBonus;
    const equipmentBonus = huntState.sharedEquipmentBonuses.spiritBoxBonus;
    const responseChance = Math.min(
      0.95,
      baseChance + teamBonus + equipmentBonus
    );

    let sanityLoss = Math.floor(Math.random() * 10 + 5);
    sanityLoss = Math.max(2, sanityLoss * (1 - huntState.sharedRiskReduction));
    sanityLoss = Math.max(
      1,
      sanityLoss - huntState.sharedEquipmentBonuses.sanityLossReduction
    );

    huntState.teamSanity = Math.max(0, huntState.teamSanity - sanityLoss);

    if (Math.random() < responseChance) {
      const hasSpirituBox =
        huntState.targetGhost.evidence.includes("Spirit Box");

      if (hasSpirituBox && !huntState.sharedEvidence.includes("Spirit Box")) {
        huntState.sharedEvidence.push("Spirit Box");
        await teamSession.addEvidence(userId, "Spirit Box");

        const contribution = huntState.individualContributions.get(userId) || {
          evidenceFound: [],
          actionsUsed: 0,
          sanityLost: 0,
        };
        contribution.evidenceFound.push("Spirit Box");
        huntState.individualContributions.set(userId, contribution);

        const teamGhostResponses = [
          "GET... OUT... ALL...",
          "DEATH... COMES... TOGETHER...",
          "HERE... WITH... FRIENDS...",
          "KILL... THE... GROUP...",
          "MANY... SOULS... HERE...",
          "TOGETHER... IN... DARKNESS...",
          "TEAM... WILL... FALL...",
        ];

        const response =
          teamGhostResponses[
            Math.floor(Math.random() * teamGhostResponses.length)
          ];

        return {
          success: true,
          description:
            `🎤 <@${userId}> włącza Spirit Box dla zespołu...\n\n` +
            `✅ **Odpowiedź ducha dla zespołu:** "${response}"\n` +
            `✅ **Dowód potwierdzony:** Spirit Box!\n` +
            `👥 **Wsparcie zespołu:** Zmniejszona utrata poczytalności\n` +
            `😰 Zespół stracił ${sanityLoss}% poczytalności.\n\n` +
            `*Głos ducha brzmi groźniej, gdy wie, że jest was więcej...*`,
          evidenceFound: "Spirit Box",
          ghostResponse: response,
          sanityLoss,
          teamAction: true,
        };
      }
    }

    return {
      success: false,
      description:
        `🎤 <@${userId}> włącza Spirit Box...\n\n` +
        `❌ **Brak odpowiedzi** - Tylko statyczny szum.\n` +
        `👥 **Wsparcie zespołu:** Zmniejszona utrata poczytalności\n` +
        `😰 Zespół stracił ${sanityLoss}% poczytalności.\n\n` +
        `*Może duch nie chce rozmawiać z całym zespołem...*`,
      sanityLoss,
      teamAction: true,
    };
  }

  /**
   * Aktualizuje indywidualny wkład członka zespołu
   */
  updateIndividualContribution(huntState, userId, actionType) {
    const contribution = huntState.individualContributions.get(userId) || {
      evidenceFound: [],
      actionsUsed: 0,
      sanityLost: 0,
      photosTaken: 0,
      spiritBoxUses: 0,
      investigations: 0,
    };

    contribution.actionsUsed++;

    switch (actionType) {
      case "photo":
        contribution.photosTaken++;
        break;
      case "spirit_box":
        contribution.spiritBoxUses++;
        break;
      case "investigate":
        contribution.investigations++;
        break;
    }

    huntState.individualContributions.set(userId, contribution);
  }

  /**
   * Sprawdza czy zespołowe polowanie się zakończyło
   */
  checkTeamHuntCompletion(huntState) {
    if (huntState.timeRemaining <= 0) {
      huntState.isCompleted = true;
      return { completed: true, reason: "timeout" };
    }

    if (huntState.teamSanity <= 0) {
      huntState.isCompleted = true;
      return { completed: true, reason: "team_sanity_loss" };
    }

    if (huntState.totalActionsUsed >= huntState.maxActions) {
      huntState.isCompleted = true;
      return { completed: true, reason: "max_actions" };
    }

    if (
      huntState.sharedEvidence.length >= huntState.difficultyData.evidenceAmount
    ) {
      return { completed: false, canGuess: true };
    }

    return { completed: false, canGuess: false };
  }

  /**
   * Oblicza końcowe nagrody zespołowe
   */
  calculateTeamFinalRewards(huntState) {
    let totalEarnings = huntState.teamEarnings;

    const baseReward = huntState.mapData.baseReward;
    totalEarnings += baseReward;

    totalEarnings *= 1 + huntState.teamworkBonus;

    totalEarnings *= huntState.difficultyData.earningsMultiplier;

    const timeBonus = Math.floor(huntState.timeRemaining / 1000) * 3;
    totalEarnings += timeBonus;

    const sanityBonus = Math.floor(huntState.teamSanity * 1.5);
    totalEarnings += sanityBonus;

    if (huntState.isCorrect) {
      totalEarnings *= 1.8;
    }

    const cooperationBonus = huntState.sharedEvidence.length * 50;
    totalEarnings += cooperationBonus;

    return Math.floor(totalEarnings);
  }

  /**
   * Dzieli nagrody między członków zespołu
   */
  distributeTeamRewards(huntState, totalRewards, teamSession) {
    const participants = huntState.participants;
    const rewards = new Map();

    if (teamSession.settings.shareRewards) {
      const baseReward = Math.floor(totalRewards / participants.length);

      participants.forEach((participant) => {
        rewards.set(participant.userId, {
          baseReward,
          contributionBonus: 0,
          totalReward: baseReward,
        });
      });
    } else {
      const totalContributions = Array.from(
        huntState.individualContributions.values()
      ).reduce((sum, contrib) => sum + contrib.actionsUsed, 0);

      participants.forEach((participant) => {
        const contribution = huntState.individualContributions.get(
          participant.userId
        ) || { actionsUsed: 0 };
        const contributionRatio =
          totalContributions > 0
            ? contribution.actionsUsed / totalContributions
            : 1 / participants.length;
        const reward = Math.floor(totalRewards * contributionRatio);

        rewards.set(participant.userId, {
          baseReward: reward,
          contributionBonus: 0,
          totalReward: reward,
        });
      });
    }

    return rewards;
  }

  /**
   * Tworzy embed wyników zespołowych
   */
  createTeamResultsEmbed(
    huntState,
    teamSession,
    totalRewards,
    individualRewards
  ) {
    const team = teamSession.team;

    const embed = new EmbedBuilder()
      .setTitle(`🎯 Wyniki zespołowego polowania - ${team?.name || "Zespół"}`)
      .setDescription(
        huntState.isCorrect
          ? `✅ **Sukces!** Zespół poprawnie zidentyfikował ducha: **${huntState.targetGhost.name}**`
          : `❌ **Niepowodzenie** - Zespół nie zdołał poprawnie zidentyfikować ducha.`
      )
      .setColor(huntState.isCorrect ? "#27ae60" : "#e74c3c")
      .addFields([
        {
          name: "📊 Statystyki zespołu",
          value:
            `🔍 Znalezione dowody: ${
              huntState.sharedEvidence.join(", ") || "Brak"
            }\n` +
            `🎯 Akcje wykonane: ${huntState.totalActionsUsed}/${huntState.maxActions}\n` +
            `🧠 Poczytalność zespołu: ${huntState.teamSanity}%\n` +
            `⏱️ Pozostały czas: ${Math.floor(huntState.timeRemaining / 1000)}s`,
          inline: false,
        },
        {
          name: "💰 Nagrody zespołowe",
          value:
            `💵 Całkowite zarobki: $${totalRewards}\n` +
            `👥 Bonus zespołowy: +${Math.floor(
              huntState.teamworkBonus * 100
            )}%\n` +
            `🤝 Bonus współpracy: +$${huntState.sharedEvidence.length * 50}`,
          inline: false,
        },
      ])
      .setTimestamp();

    const contributionsText = Array.from(
      huntState.individualContributions.entries()
    )
      .map(([userId, contrib]) => {
        const reward = individualRewards.get(userId);
        return `<@${userId}>: ${contrib.actionsUsed} akcji, ${
          contrib.evidenceFound.length
        } dowodów → $${reward?.totalReward || 0}`;
      })
      .join("\n");

    if (contributionsText) {
      embed.addFields([
        {
          name: "👥 Indywidualne wkłady",
          value: contributionsText,
          inline: false,
        },
      ]);
    }

    return embed;
  }

  /**
   * Tworzy przyciski akcji zespołowych
   */
  createTeamActionButtons(huntState, sessionId) {
    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`team_hunt_investigate_${sessionId}`)
        .setLabel("Rozglądaj się")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🔍"),
      new ButtonBuilder()
        .setCustomId(`team_hunt_photo_${sessionId}`)
        .setLabel("Zrób zdjęcie")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("📷"),
      new ButtonBuilder()
        .setCustomId(`team_hunt_spirit_box_${sessionId}`)
        .setLabel("Spirit Box")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🎤")
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`team_hunt_temperature_${sessionId}`)
        .setLabel("Sprawdź temperaturę")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🌡️"),
      new ButtonBuilder()
        .setCustomId(`team_hunt_evidence_${sessionId}`)
        .setLabel("Zobacz dowody")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("📋")
    );

    const completion = this.checkTeamHuntCompletion(huntState);
    if (completion.canGuess) {
      row2.addComponents(
        new ButtonBuilder()
          .setCustomId(`team_hunt_guess_${sessionId}`)
          .setLabel("Zgadnij ducha")
          .setStyle(ButtonStyle.Success)
          .setEmoji("🎯")
      );
    }

    row2.addComponents(
      new ButtonBuilder()
        .setCustomId(`team_hunt_escape_${sessionId}`)
        .setLabel("Zespół ucieka")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🏃")
    );

    return [row1, row2];
  }
}

module.exports = CooperativeHunt;
