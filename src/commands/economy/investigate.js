const { SlashCommandBuilder } = require("discord.js");
const Profile = require("../../models/Profile");
const InvestigateCore = require("../../utils/investigate/investigateCore");
const TeamManager = require("../../utils/team/teamManager");
const CooperativeInvestigation = require("../../utils/investigate/cooperativeInvestigation");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("investigate")
    .setDescription(
      "Przeszukaj nawiedzoną lokację w poszukiwaniu gotówki lub przedmiotów."
    )

    .addStringOption((option) =>
      option
        .setName("type")
        .setDescription("Wybierz typ lokacji")
        .addChoices(
          { name: "🏠 Dom", value: "house" },
          { name: "🏥 Szpital/Klinika", value: "medical" },
          { name: "🔒 Więzienie", value: "prison" },
          { name: "⚰️ Cmentarz", value: "cemetery" },
          { name: "🏫 Szkoła", value: "school" },
          { name: "🏕️ Kemping", value: "campsite" },
          { name: "🚜 Gospodarstwo", value: "farmhouse" }
        )
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("team")
        .setDescription("Rozpocznij śledztwo zespołowe (wymaga zespołu)")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const isTeamInvestigation = interaction.options.getBoolean("team") || false;

    if (isTeamInvestigation) {
      return await this.handleTeamInvestigation(interaction);
    }

    const investigateCore = new InvestigateCore();

    const userProfile = await Profile.findOneAndUpdate(
      { userId: interaction.user.id, guildId: interaction.guild.id },
      {},
      { upsert: true, new: true }
    );

    const cooldownCheck = await investigateCore.checkCooldown(userProfile);
    if (cooldownCheck.onCooldown) {
      return interaction.editReply({
        content: `🚫 Dopiero co wróciłeś/aś z ostatniego zwiadu. Odpocznij i spróbuj ponownie za **${cooldownCheck.timeLeft}**.`,
        ephemeral: true,
      });
    }

    if (!investigateCore.checkSanityRequirement(userProfile)) {
      return interaction.editReply({
        content:
          "🧠 Twoja poczytalność jest zbyt niska aby bezpiecznie badać nawiedzone miejsca! Użyj `/rest` aby się zregenerować.",
        ephemeral: true,
      });
    }

    let location;
    const type = interaction.options.getString("type");

    if (type) {
      const availableLocations = investigateCore.getLocationsByType(type);
      if (availableLocations.length > 0) {
        location =
          availableLocations[
            Math.floor(Math.random() * availableLocations.length)
          ];
      }
    }

    if (!location) {
      location = investigateCore.locationManager.getRandomLocation();
    }

    const locationEmbed = investigateCore.createLocationEmbed(location);
    const confirmRow = investigateCore.createConfirmationButtons();

    await interaction.editReply({
      embeds: [locationEmbed],
      components: [confirmRow],
    });

    try {
      const confirmCollector =
        interaction.channel.createMessageComponentCollector({
          filter: (i) => i.user.id === interaction.user.id,
          time: 30000,
        });

      confirmCollector.on("collect", async (i) => {
        await i.deferUpdate();

        if (i.customId === "investigate_cancel") {
          const cancelEmbed = investigateCore.createCancelEmbed();
          await interaction.editReply({
            embeds: [cancelEmbed],
            components: [],
          });
          return confirmCollector.stop();
        }

        if (i.customId === "investigate_confirm") {
          const enterEmbed = investigateCore.createEnterEmbed(location);
          await interaction.editReply({
            embeds: [enterEmbed],
            components: [],
          });

          await sleep(1500);

          const areaEmbed = investigateCore.createAreaSelectionEmbed(location);
          const areaRows = investigateCore.createAreaButtons(location);

          await interaction.editReply({
            embeds: [areaEmbed],
            components: areaRows,
          });

          const areaCollector =
            interaction.channel.createMessageComponentCollector({
              filter: (i) => i.user.id === interaction.user.id,
              time: 30000,
            });

          areaCollector.on("collect", async (areaInteraction) => {
            const areaIndex = parseInt(areaInteraction.customId.split("_")[1]);
            const selectedArea = location.searchAreas[areaIndex];

            await areaInteraction.deferUpdate();

            const searchingEmbed = investigateCore.createSearchingEmbed(
              selectedArea,
              location
            );
            await interaction.editReply({
              embeds: [searchingEmbed],
              components: [],
            });
            await sleep(3000);

            const result = await investigateCore.processInvestigation(
              userProfile,
              location,
              selectedArea
            );
            const resultEmbed = investigateCore.createResultEmbed(
              result,
              location,
              selectedArea,
              userProfile
            );

            await interaction.editReply({ embeds: [resultEmbed] });
            areaCollector.stop();
          });

          areaCollector.on("end", (collected) => {
            if (collected.size === 0) {
              interaction.editReply({
                content:
                  "⏰ Czas na podjęcie decyzji minął. Wycofujesz się z lokacji.",
                embeds: [],
                components: [],
              });
            }
          });
          confirmCollector.stop();
        }
      });

      confirmCollector.on("end", (collected) => {
        if (collected.size === 0) {
          interaction.editReply({
            content:
              "⏰ Czas na podjęcie decyzji minął. Może następnym razem...",
            embeds: [],
            components: [],
          });
        }
      });
    } catch (error) {
      console.error("Błąd w komendzie investigate:", error);
      await interaction.editReply({
        content: "❌ Wystąpił błąd podczas zwiadu. Spróbuj ponownie później.",
        embeds: [],
        components: [],
      });
    }
  },

  async handleTeamInvestigation(interaction) {
    try {
      const userId = interaction.user.id;
      const guildId = interaction.guild.id;
      const teamManager = new TeamManager();
      const cooperativeInvestigation = new CooperativeInvestigation();

      const team = await teamManager.getUserTeam(guildId, userId);
      if (!team) {
        return interaction.editReply({
          content:
            "❌ **Brak zespołu**\n\n" +
            "Nie należysz do żadnego zespołu!\n\n" +
            "Aby rozpocząć śledztwo zespołowe:\n" +
            "• Użyj `/team create` aby utworzyć zespół\n" +
            "• Lub `/team join` aby dołączyć do istniejącego zespołu",
          ephemeral: true,
        });
      }

      if (!team.isLeader(userId)) {
        return interaction.editReply({
          content:
            "❌ **Brak uprawnień**\n\nTylko lider zespołu może rozpocząć śledztwo zespołowe.",
          ephemeral: true,
        });
      }

      if (team.getMemberCount() < 2) {
        return interaction.editReply({
          content:
            "❌ **Za mało członków**\n\nZespół musi mieć co najmniej 2 członków aby rozpocząć śledztwo zespołowe.",
          ephemeral: true,
        });
      }

      const existingSession = await teamManager.getActiveSession(
        `team_investigation_${team.teamId}`
      );
      if (existingSession) {
        return interaction.editReply({
          content:
            "❌ **Aktywna sesja**\n\nZespół ma już aktywną sesję śledztwa. Zakończ ją przed rozpoczęciem nowej.",
          ephemeral: true,
        });
      }

      const locationType = interaction.options.getString("type");

      let locations;
      if (locationType) {
        locations = cooperativeInvestigation.getLocationsByType(locationType);
      } else {
        locations = cooperativeInvestigation.getLocationsByDifficulty("medium");
      }

      if (!locations || locations.length === 0) {
        return interaction.editReply({
          content:
            "❌ **Błąd**\n\nNie znaleziono dostępnych lokacji dla tego typu.",
          ephemeral: true,
        });
      }

      const selectedLocation =
        locations[Math.floor(Math.random() * locations.length)];

      const teamSession = await teamManager.createTeamSession(
        team.teamId,
        interaction.channel.id,
        "investigation",
        {
          location: selectedLocation,
          shareRewards: team.settings.shareRewards,
          shareEvidence: team.settings.shareEvidence,
        }
      );

      await teamSession.addParticipant(userId);

      const locationEmbed = cooperativeInvestigation.createTeamLocationEmbed(
        selectedLocation,
        teamSession
      );
      const confirmationButtons =
        cooperativeInvestigation.createTeamConfirmationButtons(
          teamSession.sessionId
        );

      await interaction.editReply({
        content: team.members.map((m) => `<@${m.userId}>`).join(" "),
        embeds: [locationEmbed],
        components: [confirmationButtons],
      });
    } catch (error) {
      console.error("Team investigation error:", error);

      await interaction.editReply({
        content:
          "❌ **Błąd**\n\nWystąpił błąd podczas przygotowywania śledztwa zespołowego.",
        ephemeral: true,
      });
    }
  },
};
