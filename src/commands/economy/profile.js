const {
  SlashCommandBuilder,
  ComponentType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} = require("discord.js");

const {
  LOADING_MESSAGES,
  GHOST_TYPES,
  calculateRank,
  getNextRank,
  getSanityStatus,
  checkAchievements,
  getOrCreateProfile,
  updateProfileActivity,
  addGhostEncounter,
  initializeGhostData,
  createNavigationRow,
  createMainEmbed,
  createStatsEmbed,
  createAchievementsEmbed,
  createInventoryEmbed,
  createLoadingEmbed,
  createSwitchingEmbed,
  createErrorEmbed,
} = require("../../utils/profile");

const { cooldownManager } = require("../../utils/cooldown");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("profile")
    .setDescription(
      "🎯 Profesjonalny system analizy profilu łowcy duchów z zaawansowanymi statystykami"
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription(
          "👤 Wybierz łowcę duchów do analizy (domyślnie: Twój profil)"
        )
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("view")
        .setDescription("📊 Wybierz tryb wyświetlania profilu")
        .addChoices(
          { name: "👤 Główny Profil - Przegląd ogólny", value: "main" },
          { name: "📊 Analiza Statystyk - Szczegółowe dane", value: "stats" },
          {
            name: "🏆 Kolekcja Osiągnięć - Nagrody i postępy",
            value: "achievements",
          },
          { name: "🎒 Arsenał Łowcy - Ekwipunek i sprzęt", value: "inventory" }
        )
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      if (await cooldownManager.handleCooldown(interaction)) {
        return;
      }

      await interaction.deferReply();

      const targetUser =
        interaction.options.getUser("user") || interaction.user;
      const view = interaction.options.getString("view") || "main";

      const userProfile = await getOrCreateProfile(
        targetUser.id,
        interaction.guild.id,
        true
      );

      const selectedMessage =
        LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
      const loadingEmbed = createLoadingEmbed(selectedMessage, targetUser);

      await interaction.editReply({ embeds: [loadingEmbed] });
      await new Promise((resolve) => setTimeout(resolve, 1800));

      const currentRank = calculateRank(userProfile.totalHunts || 0);
      const nextRank = getNextRank(currentRank);
      const sanityStatus = getSanityStatus(userProfile.sanity);
      const winRate =
        userProfile.totalHunts > 0
          ? (
              ((userProfile.successfulHunts || 0) / userProfile.totalHunts) *
              100
            ).toFixed(1)
          : "0.0";
      const { unlockedAchievements, lockedAchievements } =
        checkAchievements(userProfile);

      if (targetUser.id === interaction.user.id) {
        await updateProfileActivity(
          userProfile,
          targetUser.id,
          interaction.guild.id
        );
      }

      let embed = createEmbedForView(
        view,
        targetUser,
        userProfile,
        currentRank,
        nextRank,
        sanityStatus,
        winRate,
        unlockedAchievements,
        lockedAchievements
      );

      const navigationRow = createNavigationRow(view);

      const response = await interaction.editReply({
        embeds: [embed],
        components: [navigationRow],
      });

      const collector = response.createMessageComponentCollector({
        componentType: ComponentType.Button,
        time: 300000,
        filter: (i) => i.user.id === interaction.user.id,
      });

      collector.on("collect", async (i) => {
        await i.deferUpdate();

        const newView = i.customId;

        const switchingEmbed = createSwitchingEmbed(newView);
        await i.editReply({ embeds: [switchingEmbed], components: [] });
        await new Promise((resolve) => setTimeout(resolve, 600));

        const newEmbed = createEmbedForView(
          newView,
          targetUser,
          userProfile,
          currentRank,
          nextRank,
          sanityStatus,
          winRate,
          unlockedAchievements,
          lockedAchievements
        );
        const newNavigationRow = createNavigationRow(newView);

        await i.editReply({
          embeds: [newEmbed],
          components: [newNavigationRow],
        });
      });

      collector.on("end", (collected, reason) => {
        const disabledRow = new ActionRowBuilder().addComponents(
          navigationRow.components.map((button) =>
            ButtonBuilder.from(button)
              .setDisabled(true)
              .setStyle(ButtonStyle.Secondary)
          )
        );

        const timeoutEmbed = EmbedBuilder.from(embed)
          .setColor("#95a5a6")
          .setFooter({
            text: `${
              embed.data.footer?.text || ""
            } • ⏰ Sesja wygasła po 5 minutach nieaktywności`,
            iconURL: embed.data.footer?.icon_url,
          });

        if (reason === "time") {
          const fields = [...(timeoutEmbed.data.fields || [])];
          fields.push({
            name: "⏰ **Sesja Zakończona**",
            value:
              "🔒 *Interfejs został zablokowany z powodu nieaktywności*\n💡 *Użyj komendy ponownie aby kontynuować*",
            inline: false,
          });
          timeoutEmbed.setFields(fields);
        }

        interaction
          .editReply({
            embeds: [timeoutEmbed],
            components: [disabledRow],
          })
          .catch(console.error);
      });
    } catch (error) {
      console.error("Error in profile command:", error);

      const errorEmbed = createErrorEmbed(
        interaction.options.getUser("user") || interaction.user,
        interaction
      );

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ embeds: [errorEmbed], components: [] });
      } else {
        await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
      }
    }
  },

  addGhostEncounter,
  initializeGhostData,
  GHOST_TYPES,
};

/**
 * Helper function to create the appropriate embed based on view type
 */
function createEmbedForView(
  view,
  targetUser,
  userProfile,
  currentRank,
  nextRank,
  sanityStatus,
  winRate,
  unlockedAchievements,
  lockedAchievements
) {
  switch (view) {
    case "main":
      return createMainEmbed(
        targetUser,
        userProfile,
        currentRank,
        nextRank,
        sanityStatus,
        winRate,
        unlockedAchievements
      );
    case "stats":
      return createStatsEmbed(targetUser, userProfile, currentRank);
    case "achievements":
      return createAchievementsEmbed(
        targetUser,
        unlockedAchievements,
        lockedAchievements
      );
    case "inventory":
      return createInventoryEmbed(targetUser, userProfile);
    default:
      return createMainEmbed(
        targetUser,
        userProfile,
        currentRank,
        nextRank,
        sanityStatus,
        winRate,
        unlockedAchievements
      );
  }
}
