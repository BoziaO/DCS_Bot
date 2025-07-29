const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  EmbedBuilder,
} = require("discord.js");
const Profile = require("../../models/Profile");
const { ghosts, maps } = require("../../data/phasmophobiaData");
const { DIFFICULTY_SETTINGS } = require("../../utils/hunt/constants");
const TeamManager = require("../../utils/team/teamManager");
const CooperativeHunt = require("../../utils/hunt/cooperativeHunt");

const {
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
} = require("../../utils/hunt/interactiveHunt");

const {
  createEvidenceEmbed,
  createEvidenceReturnButton,
} = require("../../utils/hunt/embedCreators");

const {
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
} = require("../../utils/hunt/huntLogic");

const activeHunts = new Map();
const teamManager = new TeamManager();
const cooperativeHunt = new CooperativeHunt();

/**
 * Tworzy domyślny profil użytkownika
 */
const createDefaultProfile = (userId, guildId) => {
  return {
    userId,
    guildId,
    balance: 1000,
    sanity: 100,
    totalHunts: 0,
    successfulHunts: 0,
    inventory: [],
    lastHunt: null,
  };
};

/**
 * Sprawdza cooldown polowania
 */
const checkHuntCooldown = (userProfile, difficulty) => {
  if (!userProfile.lastHunt) return { canHunt: true };

  const difficultyData = DIFFICULTY_SETTINGS[difficulty];
  const cooldownTime = difficultyData.cooldown || 300000;
  const timeSinceLastHunt =
    Date.now() - new Date(userProfile.lastHunt).getTime();

  if (timeSinceLastHunt < cooldownTime) {
    const remainingTime = Math.ceil(
      (cooldownTime - timeSinceLastHunt) / 1000 / 60
    );
    return {
      canHunt: false,
      error: `⏰ Musisz poczekać jeszcze **${remainingTime} minut** przed następnym polowaniem na tym poziomie trudności!`,
    };
  }

  return { canHunt: true };
};

/**
 * Sprawdza czy gracz ma wystarczającą poczytalność
 */
const checkSanityRequirement = (userProfile, difficulty) => {
  const difficultyData = DIFFICULTY_SETTINGS[difficulty];
  const minSanity = difficultyData.minSanity || 10;

  if (userProfile.sanity < minSanity) {
    return {
      canHunt: false,
      error: `🧠 Potrzebujesz co najmniej **${minSanity}%** poczytalności dla tego poziomu trudności! Obecna: **${userProfile.sanity}%**`,
    };
  }

  return { canHunt: true };
};

/**
 * Tworzy embed końca polowania
 */
const createHuntEndEmbed = (user, huntState, isSuccess, chosenGhost = null) => {
  const totalRewards = calculateFinalRewards(huntState);

  const embed = new EmbedBuilder()
    .setTitle(`${huntState.mapData.emoji} **POLOWANIE ZAKOŃCZONE!**`)
    .setThumbnail(user.displayAvatarURL({ dynamic: true }));

  if (isSuccess && chosenGhost) {
    const isCorrect = chosenGhost === huntState.targetGhost.name;
    const itemsUsedText =
      huntState.selectedItems && huntState.selectedItems.length > 0
        ? `**Użyte itemy:** ${huntState.selectedItems.join(", ")}\n\n`
        : "";

    embed
      .setColor(isCorrect ? "#00FF00" : "#FF6B6B")
      .setDescription(
        `**Wynik:** ${isCorrect ? "✅ SUKCES!" : "❌ PORAŻKA"}\n\n` +
          `**Twój wybór:** ${chosenGhost}\n` +
          `**Prawdziwy duch:** ${huntState.targetGhost.name}\n\n` +
          itemsUsedText +
          `**Zebrane dowody:**\n${
            huntState.collectedEvidence.length > 0
              ? huntState.collectedEvidence.map((e) => `✅ ${e}`).join("\n")
              : "*Brak dowodów*"
          }\n\n` +
          `**Nagrody:**\n` +
          `💰 **Zarobione:** $${totalRewards.toLocaleString()}\n` +
          `💚 **Pozostała poczytalność:** ${huntState.currentSanity}%\n` +
          `⏱️ **Czas polowania:** ${Math.floor(
            (Date.now() - huntState.startTime) / 1000
          )}s`
      );
  } else {
    const itemsUsedText =
      huntState.selectedItems && huntState.selectedItems.length > 0
        ? `**Użyte itemy:** ${huntState.selectedItems.join(", ")}\n\n`
        : "";

    embed
      .setColor("#FF6B6B")
      .setDescription(
        `**Wynik:** ❌ POLOWANIE PRZERWANE\n\n` +
          `**Powód:** ${
            huntState.currentSanity <= 0
              ? "Utrata poczytalności"
              : huntState.timeRemaining <= 0
              ? "Koniec czasu"
              : "Ucieczka"
          }\n\n` +
          itemsUsedText +
          `**Zebrane dowody:**\n${
            huntState.collectedEvidence.length > 0
              ? huntState.collectedEvidence.map((e) => `✅ ${e}`).join("\n")
              : "*Brak dowodów*"
          }\n\n` +
          `**Nagrody:**\n` +
          `💰 **Zarobione:** $${totalRewards.toLocaleString()}\n` +
          `💚 **Pozostała poczytalność:** ${huntState.currentSanity}%`
      );
  }

  return embed;
};

/**
 * Tworzy menu wyboru ducha
 */
const createGhostSelectMenu = () => {
  const options = ghosts.slice(0, 25).map((ghost) => {
    const ghostName = ghost.name || "Unknown Ghost";
    const evidence = ghost.evidence || [];
    const evidenceText =
      evidence.length > 0
        ? `${evidence.slice(0, 2).join(", ")}...`
        : "No evidence";

    return {
      label: ghostName.slice(0, 100),
      description: evidenceText.slice(0, 100),
      value: ghostName,
    };
  });

  return new StringSelectMenuBuilder()
    .setCustomId("hunt_ghost_choice")
    .setPlaceholder("🎯 Wybierz ducha...")
    .addOptions(options);
};

/**
 * Aktualizuje timer polowania
 */
const updateHuntTimer = (huntState) => {
  const elapsed = Date.now() - huntState.startTime;
  huntState.timeRemaining = Math.max(
    0,
    huntState.difficultyData.time - elapsed
  );
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName("hunt")
    .setDescription("🎯 Rozpocznij interaktywne polowanie na duchy!")
    .addStringOption((option) =>
      option
        .setName("difficulty")
        .setDescription("Wybierz poziom trudności")
        .setRequired(false)
        .addChoices(
          { name: "🟢 Amator (Łatwy)", value: "amateur" },
          { name: "🟡 Średniozaawansowany", value: "intermediate" },
          { name: "🔴 Profesjonalny (Trudny)", value: "professional" },
          { name: "⚫ Koszmar (Ekstremalny)", value: "nightmare" }
        )
    )
    .addBooleanOption((option) =>
      option
        .setName("team")
        .setDescription("Rozpocznij polowanie zespołowe (wymaga zespołu)")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const isTeamHunt = interaction.options.getBoolean("team") || false;

      if (isTeamHunt) {
        return await this.handleTeamHunt(interaction);
      }

      if (activeHunts.has(interaction.user.id)) {
        return interaction.reply({
          content:
            "❌ Masz już aktywne polowanie! Zakończ je przed rozpoczęciem nowego.",
          ephemeral: true,
        });
      }

      let userProfile = await Profile.findOne({
        userId: interaction.user.id,
        guildId: interaction.guild.id,
      });

      if (!userProfile) {
        userProfile = new Profile(
          createDefaultProfile(interaction.user.id, interaction.guild.id)
        );
        await userProfile.save();
      }

      const preselectedDifficulty = interaction.options.getString("difficulty");

      const mapEmbed = createMapSelectionEmbed(interaction.user);
      if (!mapEmbed) {
        return interaction.reply({
          content:
            "❌ Wystąpił błąd podczas tworzenia interfejsu polowania. Spróbuj ponownie.",
          ephemeral: true,
        });
      }

      const mapSelectMenu = createMapSelectMenu();
      if (!mapSelectMenu) {
        return interaction.reply({
          content:
            "❌ Wystąpił błąd podczas ładowania danych map. Spróbuj ponownie.",
          ephemeral: true,
        });
      }

      const mapButtons = createMapActionButtons();

      const response = await interaction.reply({
        embeds: [mapEmbed],
        components: [
          new ActionRowBuilder().addComponents(mapSelectMenu),
          mapButtons,
        ],
        fetchReply: true,
      });

      const mapCollector = response.createMessageComponentCollector({
        time: 60000,
      });

      mapCollector.on("collect", async (mapInteraction) => {
        if (mapInteraction.user.id !== interaction.user.id) {
          return mapInteraction.reply({
            content: "❌ Tylko osoba, która użyła komendy może wybierać!",
            ephemeral: true,
          });
        }

        let selectedMap;

        if (mapInteraction.isStringSelectMenu()) {
          if (mapInteraction.customId === "hunt_map_select") {
            const mapIndex = parseInt(mapInteraction.values[0]);
            selectedMap = maps[mapIndex]?.name;
          } else if (mapInteraction.customId === "hunt_difficulty_select") {
            console.log(
              "Difficulty selection detected, ignoring in mapCollector"
            );
            return;
          } else {
            const mapIndex = parseInt(mapInteraction.values[0]);
            selectedMap = maps[mapIndex]?.name;
          }
        } else if (mapInteraction.isButton()) {
          if (mapInteraction.customId === "hunt_random_map") {
            selectedMap = maps[Math.floor(Math.random() * maps.length)].name;
          } else if (mapInteraction.customId === "hunt_cancel") {
            mapCollector.stop("cancelled");
            return mapInteraction.update({
              content: "❌ Polowanie zostało anulowane.",
              embeds: [],
              components: [],
            });
          }
        }

        if (!selectedMap) {
          console.error("Invalid map selection:", mapInteraction.values[0]);
          return mapInteraction.reply({
            content: "❌ Nieprawidłowy wybór mapy. Spróbuj ponownie.",
            ephemeral: true,
          });
        }

        const availableItems = getAvailableItems(userProfile);
        const hasItems = availableItems.length > 0;

        const safeUserProfile = {
          sanity: userProfile?.sanity ?? 100,
          balance: userProfile?.balance ?? 0,
          totalHunts: userProfile?.totalHunts ?? 0,
          inventory: userProfile?.inventory ?? new Map(),
        };

        const prepEmbed = createHuntPreparationEmbed(
          interaction.user,
          selectedMap,
          safeUserProfile
        );

        if (!prepEmbed) {
          console.error("Embed creation failed for map:", selectedMap);
          mapCollector.stop("error");
          return mapInteraction.update({
            content:
              "❌ Wystąpił błąd podczas przygotowywania polowania. Spróbuj ponownie.",
            embeds: [],
            components: [],
          });
        }

        const difficultyMenu = createDifficultySelectMenu();
        const prepButtons = createPreparationButtons(hasItems);

        if (preselectedDifficulty) {
          await startInteractiveHunt(
            mapInteraction,
            userProfile,
            selectedMap,
            preselectedDifficulty,
            mapCollector
          );
        } else {
          try {
            const components = [
              new ActionRowBuilder().addComponents(difficultyMenu),
              prepButtons,
            ];

            if (mapInteraction.replied || mapInteraction.deferred) {
              console.warn("Interaction already replied or deferred");
              return;
            }

            components.forEach((component, index) => {
              try {
                component.toJSON();
              } catch (compError) {
                console.error(
                  `Component ${index} validation failed:`,
                  compError
                );
                throw new Error(
                  `Invalid component ${index}: ${compError.message}`
                );
              }
            });

            try {
              prepEmbed.toJSON();
            } catch (embedError) {
              console.error("Embed validation failed:", embedError);
              throw new Error(`Invalid embed: ${embedError.message}`);
            }

            const updateData = {
              embeds: [prepEmbed],
              components: components,
            };

            await mapInteraction.update(updateData);
          } catch (error) {
            console.error("Error updating interaction with prep embed:", error);
            console.error("Error details:", {
              name: error.name,
              message: error.message,
              code: error.code,
              status: error.status,
            });

            try {
              mapCollector.stop("error");

              if (!mapInteraction.replied && !mapInteraction.deferred) {
                await mapInteraction.update({
                  content:
                    "❌ Wystąpił błąd podczas przygotowywania polowania. Spróbuj ponownie.",
                  embeds: [],
                  components: [],
                });
              }
            } catch (fallbackError) {
              console.error("Fallback error handling failed:", fallbackError);
            }

            return;
          }

          const prepCollector = response.createMessageComponentCollector({
            time: 60000,
          });

          prepCollector.on("collect", async (prepInteraction) => {
            if (prepInteraction.user.id !== interaction.user.id) {
              return prepInteraction.reply({
                content: "❌ Tylko osoba, która użyła komendy może wybierać!",
                ephemeral: true,
              });
            }

            if (prepInteraction.isStringSelectMenu()) {
              const difficulty = prepInteraction.values[0];
              await startInteractiveHunt(
                prepInteraction,
                userProfile,
                selectedMap,
                difficulty,
                [],
                mapCollector,
                prepCollector
              );
            } else if (prepInteraction.isButton()) {
              if (prepInteraction.customId === "hunt_start") {
                await startInteractiveHunt(
                  prepInteraction,
                  userProfile,
                  selectedMap,
                  "intermediate",
                  [],
                  mapCollector,
                  prepCollector
                );
              } else if (prepInteraction.customId === "hunt_select_items") {
                await handleItemSelection(
                  prepInteraction,
                  userProfile,
                  selectedMap,
                  "intermediate",
                  mapCollector,
                  prepCollector
                );
              } else if (prepInteraction.customId === "hunt_back_to_maps") {
                await prepInteraction.update({
                  embeds: [mapEmbed],
                  components: [
                    new ActionRowBuilder().addComponents(mapSelectMenu),
                    mapButtons,
                  ],
                });
              } else if (prepInteraction.customId === "hunt_cancel") {
                mapCollector.stop("cancelled");
                prepCollector.stop("cancelled");
                return prepInteraction.update({
                  content: "❌ Polowanie zostało anulowane.",
                  embeds: [],
                  components: [],
                });
              }
            }
          });

          prepCollector.on("end", (collected, reason) => {
            if (reason === "time") {
              response.edit({
                content: "⏰ Czas na przygotowanie się skończył!",
                embeds: [],
                components: [],
              });
            }
          });
        }
      });

      mapCollector.on("end", (collected, reason) => {
        if (reason === "time") {
          response.edit({
            content: "⏰ Czas na wybór mapy się skończył!",
            embeds: [],
            components: [],
          });
        }
      });
    } catch (error) {
      console.error("Hunt command error:", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ **BŁĄD**")
        .setDescription("Wystąpił błąd podczas rozpoczynania polowania.")
        .setColor("#FF0000");

      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ embeds: [errorEmbed], components: [] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },
};

/**
 * Rozpoczyna interaktywne polowanie
 */
/**
 * Obsługuje wybór itemów
 */
async function handleItemSelection(
  interaction,
  userProfile,
  mapName,
  difficulty,
  ...collectorsToStop
) {
  try {
    const selectedItems = [];

    const itemEmbed = createItemSelectionEmbed(
      interaction.user,
      mapName,
      userProfile,
      selectedItems
    );
    const itemMenu = createItemSelectMenu(userProfile, selectedItems);
    const itemButtons = createItemActionButtons(selectedItems);

    const components = [];
    if (itemMenu) {
      components.push(new ActionRowBuilder().addComponents(itemMenu));
    }
    components.push(itemButtons);

    await interaction.update({
      embeds: [itemEmbed],
      components,
    });

    const itemCollector = interaction.message.createMessageComponentCollector({
      time: 120000,
    });

    itemCollector.on("collect", async (itemInteraction) => {
      if (itemInteraction.user.id !== interaction.user.id) {
        return itemInteraction.reply({
          content: "❌ Tylko osoba, która użyła komendy może wybierać!",
          ephemeral: true,
        });
      }

      if (itemInteraction.isStringSelectMenu()) {
        const selectedItem = itemInteraction.values[0];

        if (selectedItems.length < 3 && !selectedItems.includes(selectedItem)) {
          selectedItems.push(selectedItem);

          const updatedEmbed = createItemSelectionEmbed(
            interaction.user,
            mapName,
            userProfile,
            selectedItems
          );
          const updatedMenu = createItemSelectMenu(userProfile, selectedItems);
          const updatedButtons = createItemActionButtons(selectedItems);

          const updatedComponents = [];
          if (updatedMenu) {
            updatedComponents.push(
              new ActionRowBuilder().addComponents(updatedMenu)
            );
          }
          updatedComponents.push(updatedButtons);

          await itemInteraction.update({
            embeds: [updatedEmbed],
            components: updatedComponents,
          });
        } else {
          await itemInteraction.reply({
            content:
              selectedItems.length >= 3
                ? "❌ Możesz wybrać maksymalnie 3 itemy!"
                : "❌ Ten item jest już wybrany!",
            ephemeral: true,
          });
        }
      } else if (itemInteraction.isButton()) {
        if (itemInteraction.customId === "hunt_continue_with_items") {
          itemCollector.stop("items_selected");
          await startInteractiveHunt(
            itemInteraction,
            userProfile,
            mapName,
            difficulty,
            selectedItems,
            ...collectorsToStop
          );
        } else if (itemInteraction.customId === "hunt_continue_without_items") {
          itemCollector.stop("no_items");
          await startInteractiveHunt(
            itemInteraction,
            userProfile,
            mapName,
            difficulty,
            [],
            ...collectorsToStop
          );
        } else if (itemInteraction.customId === "hunt_clear_items") {
          selectedItems.length = 0;

          const clearedEmbed = createItemSelectionEmbed(
            interaction.user,
            mapName,
            userProfile,
            selectedItems
          );
          const clearedMenu = createItemSelectMenu(userProfile, selectedItems);
          const clearedButtons = createItemActionButtons(selectedItems);

          const clearedComponents = [];
          if (clearedMenu) {
            clearedComponents.push(
              new ActionRowBuilder().addComponents(clearedMenu)
            );
          }
          clearedComponents.push(clearedButtons);

          await itemInteraction.update({
            embeds: [clearedEmbed],
            components: clearedComponents,
          });
        }
      }
    });

    itemCollector.on("end", (collected, reason) => {
      if (reason === "time") {
        interaction.editReply({
          content: "⏰ Czas na wybór itemów się skończył!",
          embeds: [],
          components: [],
        });
      }
    });
  } catch (error) {
    console.error("Item selection error:", error);
    await interaction.update({
      content: "❌ Wystąpił błąd podczas wyboru itemów!",
      embeds: [],
      components: [],
    });
  }
}

async function startInteractiveHunt(
  interaction,
  userProfile,
  mapName,
  difficulty,
  selectedItems = [],
  ...collectorsToStop
) {
  try {
    collectorsToStop.forEach((collector) => collector.stop("started"));

    const cooldownCheck = checkHuntCooldown(userProfile, difficulty);
    if (!cooldownCheck.canHunt) {
      return interaction.update({
        content: cooldownCheck.error,
        embeds: [],
        components: [],
      });
    }

    const sanityCheck = checkSanityRequirement(userProfile, difficulty);
    if (!sanityCheck.canHunt) {
      return interaction.update({
        content: sanityCheck.error,
        embeds: [],
        components: [],
      });
    }

    const targetGhost = ghosts[Math.floor(Math.random() * ghosts.length)];

    const huntState = createInteractiveHuntState(
      targetGhost,
      mapName,
      difficulty,
      userProfile,
      selectedItems
    );

    applyItemEffects(huntState);

    activeHunts.set(interaction.user.id, huntState);

    const startEmbed = createHuntStartEmbed(
      interaction.user,
      mapName,
      difficulty,
      targetGhost
    );
    const actionButtons = createHuntActionButtons();

    await interaction.update({
      embeds: [startEmbed],
      components: actionButtons,
    });

    const huntCollector = interaction.message.createMessageComponentCollector({
      time: huntState.difficultyData.time + 10000,
    });

    const timer = setInterval(() => {
      updateHuntTimer(huntState);

      if (huntState.timeRemaining <= 0) {
        clearInterval(timer);
        huntCollector.stop("timeout");
      }
    }, 1000);

    huntCollector.on("collect", async (actionInteraction) => {
      if (actionInteraction.user.id !== interaction.user.id) {
        return actionInteraction.reply({
          content:
            "❌ Tylko osoba, która rozpoczęła polowanie może wykonywać akcje!",
          ephemeral: true,
        });
      }

      updateHuntTimer(huntState);

      const completion = checkHuntCompletion(huntState);
      if (completion.completed) {
        clearInterval(timer);
        huntCollector.stop("completed");
        return;
      }

      if (actionInteraction.customId === "hunt_view_evidence") {
        const evidenceEmbed = createEvidenceEmbed(interaction.user, huntState);
        const returnButton = createEvidenceReturnButton();
        await actionInteraction.update({
          embeds: [evidenceEmbed],
          components: [returnButton],
        });
        return;
      }

      if (actionInteraction.customId === "hunt_return_from_evidence") {
        updateHuntTimer(huntState);
        const huntEmbed = createHuntStartEmbed(interaction.user, huntState);
        const huntButtons = createHuntActionButtons();
        await actionInteraction.update({
          embeds: [huntEmbed],
          components: huntButtons,
        });
        return;
      }

      if (actionInteraction.customId === "hunt_ghost_choice") {
        const chosenGhost = actionInteraction.values[0];
        huntState.isCorrect = chosenGhost === huntState.targetGhost.name;

        clearInterval(timer);
        huntCollector.stop("guessed");

        const totalRewards = calculateFinalRewards(huntState);
        userProfile.balance = (userProfile.balance || 0) + totalRewards;
        userProfile.sanity = huntState.currentSanity;
        userProfile.lastHunt = new Date();
        userProfile.totalHunts = (userProfile.totalHunts || 0) + 1;

        if (huntState.isCorrect) {
          userProfile.successfulHunts = (userProfile.successfulHunts || 0) + 1;
        }

        consumeUsedItems(huntState, userProfile);

        await userProfile.save();
        activeHunts.delete(interaction.user.id);

        const endEmbed = createHuntEndEmbed(
          interaction.user,
          huntState,
          true,
          chosenGhost
        );

        await actionInteraction.update({
          embeds: [endEmbed],
          components: [],
        });
        return;
      } else if (actionInteraction.customId === "hunt_back_to_actions") {
        const actionButtons = createHuntActionButtons();
        const currentEmbed = createActionResultEmbed(
          interaction.user,
          "investigate",
          { description: "Wracasz do wyboru akcji...", success: true },
          huntState
        );

        await actionInteraction.update({
          embeds: [currentEmbed],
          components: actionButtons,
        });
        return;
      }

      let result;
      const action = actionInteraction.customId.replace("hunt_", "");

      switch (action) {
        case "investigate":
          result = handleInvestigateAction(huntState);
          break;
        case "photo":
          result = handlePhotoAction(huntState);
          break;
        case "spirit_box":
          result = handleSpiritBoxAction(huntState);
          break;
        case "temperature":
          result = handleTemperatureAction(huntState);
          break;
        case "escape":
          result = handleEscapeAction(huntState);
          clearInterval(timer);
          huntCollector.stop("escaped");
          break;
        case "guess":
          const ghostMenu = createGhostSelectMenu();
          await actionInteraction.update({
            components: [
              new ActionRowBuilder().addComponents(ghostMenu),
              new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                  .setCustomId("hunt_back_to_actions")
                  .setLabel("🔙 Powrót do akcji")
                  .setStyle(ButtonStyle.Secondary)
              ),
            ],
          });
          return;
        default:
          return;
      }

      const resultEmbed = createActionResultEmbed(
        interaction.user,
        action,
        result,
        huntState
      );

      const newCompletion = checkHuntCompletion(huntState);

      if (newCompletion.completed || action === "escape") {
        clearInterval(timer);
        huntCollector.stop(action === "escape" ? "escaped" : "completed");

        const totalRewards = calculateFinalRewards(huntState);
        userProfile.balance = (userProfile.balance || 0) + totalRewards;
        userProfile.sanity = huntState.currentSanity;
        userProfile.lastHunt = new Date();
        userProfile.totalHunts = (userProfile.totalHunts || 0) + 1;

        if (huntState.isCorrect) {
          userProfile.successfulHunts = (userProfile.successfulHunts || 0) + 1;
        }

        consumeUsedItems(huntState, userProfile);

        await userProfile.save();
        activeHunts.delete(interaction.user.id);

        const endEmbed = createHuntEndEmbed(
          interaction.user,
          huntState,
          action === "escape"
        );

        await actionInteraction.update({
          embeds: [endEmbed],
          components: [],
        });
      } else {
        const canGuess = newCompletion.canGuess;
        const updatedButtons = createHuntActionButtons();

        if (canGuess) {
          updatedButtons[1].components[1].setDisabled(false);
        }

        await actionInteraction.update({
          embeds: [resultEmbed],
          components: updatedButtons,
        });
      }
    });

    huntCollector.on("end", async (collected, reason) => {
      clearInterval(timer);
      activeHunts.delete(interaction.user.id);

      if (reason === "timeout") {
        userProfile.sanity = Math.max(0, huntState.currentSanity - 10);
        userProfile.lastHunt = new Date();
        userProfile.totalHunts = (userProfile.totalHunts || 0) + 1;
        await userProfile.save();

        const timeoutEmbed = new EmbedBuilder()
          .setTitle("⏰ **CZAS SIĘ SKOŃCZYŁ!**")
          .setDescription(
            `${interaction.user}, nie zdążyłeś zakończyć polowania na czas!\n\n` +
              `👻 **Prawdziwy duch:** ${huntState.targetGhost.name}\n` +
              `💚 **Utrata poczytalności:** -10% (kara za timeout)\n` +
              `💰 **Nagroda:** $0`
          )
          .setColor("#FF0000");

        try {
          await interaction.editReply({
            embeds: [timeoutEmbed],
            components: [],
          });
        } catch (error) {
          console.error("Error updating timeout message:", error);
        }
      }
    });
  } catch (error) {
    console.error("Interactive hunt error:", error);
    activeHunts.delete(interaction.user.id);

    await interaction.update({
      content: "❌ Wystąpił błąd podczas polowania!",
      embeds: [],
      components: [],
    });
  }
}

async function handleTeamHunt(interaction) {
  try {
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    const team = await teamManager.getUserTeam(guildId, userId);
    if (!team) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Brak zespołu")
        .setDescription(
          "Nie należysz do żadnego zespołu!\n\n" +
            "Aby rozpocząć polowanie zespołowe:\n" +
            "• Użyj `/team create` aby utworzyć zespół\n" +
            "• Lub `/team join` aby dołączyć do istniejącego zespołu"
        )
        .setColor("#e74c3c");

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (!team.isLeader(userId)) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Brak uprawnień")
        .setDescription(
          "Tylko lider zespołu może rozpocząć polowanie zespołowe."
        )
        .setColor("#e74c3c");

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (team.getMemberCount() < 2) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Za mało członków")
        .setDescription(
          "Zespół musi mieć co najmniej 2 członków aby rozpocząć polowanie zespołowe."
        )
        .setColor("#e74c3c");

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const existingSession = await teamManager.getActiveSession(
      `team_${team.teamId}`
    );
    if (existingSession) {
      const embed = new EmbedBuilder()
        .setTitle("❌ Aktywna sesja")
        .setDescription(
          "Zespół ma już aktywną sesję polowania. Zakończ ją przed rozpoczęciem nowej."
        )
        .setColor("#e74c3c");

      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    const preselectedDifficulty = interaction.options.getString("difficulty");

    const embed = new EmbedBuilder()
      .setTitle("🎯 Polowanie zespołowe")
      .setDescription(
        `**Zespół:** ${team.name}\n` +
          `**Członkowie:** ${team.getMemberCount()}/${team.maxMembers}\n\n` +
          `Rozpoczynasz przygotowania do zespołowego polowania na duchy!\n` +
          `Wszyscy członkowie zespołu będą mogli uczestniczyć w polowaniu.`
      )
      .addFields([
        {
          name: "👥 Członkowie zespołu",
          value: team.members.map((m) => `<@${m.userId}>`).join("\n"),
          inline: true,
        },
        {
          name: "⚙️ Ustawienia zespołu",
          value:
            `💰 Dzielenie nagród: ${
              team.settings.shareRewards ? "✅" : "❌"
            }\n` +
            `🔍 Dzielenie dowodów: ${
              team.settings.shareEvidence ? "✅" : "❌"
            }`,
          inline: true,
        },
      ])
      .setColor("#3498db")
      .setTimestamp();

    const actionRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`team_hunt_start_${team.teamId}`)
        .setLabel("Rozpocznij przygotowania")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("🚀"),
      new ButtonBuilder()
        .setCustomId(`team_hunt_cancel_${team.teamId}`)
        .setLabel("Anuluj")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("❌")
    );

    await interaction.reply({
      content: team.members.map((m) => `<@${m.userId}>`).join(" "),
      embeds: [embed],
      components: [actionRow],
    });
  } catch (error) {
    console.error("Team hunt error:", error);

    const errorEmbed = new EmbedBuilder()
      .setTitle("❌ Błąd")
      .setDescription(
        "Wystąpił błąd podczas przygotowywania polowania zespołowego."
      )
      .setColor("#e74c3c");

    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ embeds: [errorEmbed] });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
}
