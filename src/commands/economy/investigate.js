const { SlashCommandBuilder } = require("discord.js");
const Profile = require("../../models/Profile");
const InvestigateCore = require("../../utils/investigate/investigateCore");

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
    ),

  async execute(interaction) {
    await interaction.deferReply();

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
};
