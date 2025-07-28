const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const Profile = require("../../models/Profile");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reset-investigate")
    .setDescription("[ADMIN] Resetuj dane investigate (UWAGA: Nieodwracalne!)")
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Użytkownik do zresetowania (puste = wszyscy)")
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const targetUser = interaction.options.getUser("user");
    const isGlobalReset = !targetUser;

    const confirmEmbed = new EmbedBuilder()
      .setTitle("⚠️ OSTRZEŻENIE - Reset danych investigate")
      .setDescription(
        isGlobalReset
          ? "**Zamierzasz zresetować WSZYSTKIE dane investigate na tym serwerze!**\n\nTo działanie jest **NIEODWRACALNE** i usunie:\n• Wszystkie statystyki investigate\n• Historię badań\n• Doświadczenie z investigate\n• Osiągnięcia\n\n**Czy na pewno chcesz kontynuować?**"
          : `**Zamierzasz zresetować dane investigate użytkownika ${targetUser.displayName}!**\n\nTo działanie jest **NIEODWRACALNE** i usunie:\n• Statystyki investigate\n• Historię badań\n• Doświadczenie z investigate\n• Osiągnięcia\n\n**Czy na pewno chcesz kontynuować?**`
      )
      .setColor("#e74c3c")
      .setTimestamp();

    const confirmRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("reset_confirm")
        .setLabel("TAK - RESETUJ DANE")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("💥"),
      new ButtonBuilder()
        .setCustomId("reset_cancel")
        .setLabel("Anuluj")
        .setStyle(ButtonStyle.Secondary)
        .setEmoji("❌")
    );

    const response = await interaction.editReply({
      embeds: [confirmEmbed],
      components: [confirmRow],
    });

    const collector = response.createMessageComponentCollector({
      filter: (i) => i.user.id === interaction.user.id,
      time: 30000,
    });

    collector.on("collect", async (i) => {
      await i.deferUpdate();

      if (i.customId === "reset_cancel") {
        const cancelEmbed = new EmbedBuilder()
          .setTitle("❌ Reset anulowany")
          .setDescription("Dane investigate pozostają nietknięte.")
          .setColor("#95a5a6");

        await interaction.editReply({
          embeds: [cancelEmbed],
          components: [],
        });
        return collector.stop();
      }

      if (i.customId === "reset_confirm") {
        try {
          let resetCount = 0;
          let errorCount = 0;

          if (isGlobalReset) {
            const profiles = await Profile.find({
              guildId: interaction.guild.id,
            });

            for (const profile of profiles) {
              try {
                profile.experience = 0;
                profile.investigateStats = {
                  totalInvestigations: 0,
                  locationsVisited: {},
                  findsHistory: {},
                  totalExperience: 0,
                };
                profile.lastInvestigate = null;

                await profile.save();
                resetCount++;
              } catch (error) {
                console.error(
                  `Błąd podczas resetowania profilu ${profile.userId}:`,
                  error
                );
                errorCount++;
              }
            }
          } else {
            const profile = await Profile.findOne({
              userId: targetUser.id,
              guildId: interaction.guild.id,
            });

            if (profile) {
              profile.experience = 0;
              profile.investigateStats = {
                totalInvestigations: 0,
                locationsVisited: {},
                findsHistory: {},
                totalExperience: 0,
              };
              profile.lastInvestigate = null;

              await profile.save();
              resetCount = 1;
            }
          }

          const successEmbed = new EmbedBuilder()
            .setTitle("✅ Reset zakończony")
            .setDescription(
              isGlobalReset
                ? `**Zresetowano dane investigate dla całego serwera**\n\n**Zresetowane profile:** ${resetCount}\n**Błędy:** ${errorCount}`
                : `**Zresetowano dane investigate dla użytkownika ${targetUser.displayName}**`
            )
            .addFields([
              {
                name: "🔄 Co zostało zresetowane?",
                value:
                  "• Doświadczenie (0 XP)\n• Statystyki investigate\n• Historia badań\n• Ostatnie badanie\n• Wszystkie osiągnięcia",
                inline: false,
              },
              {
                name: "💡 Co dalej?",
                value:
                  "Użytkownicy mogą teraz rozpocząć od nowa używając `/investigate`",
                inline: false,
              },
            ])
            .setColor("#2ecc71")
            .setTimestamp();

          await interaction.editReply({
            embeds: [successEmbed],
            components: [],
          });
        } catch (error) {
          console.error("Błąd podczas resetowania investigate:", error);

          const errorEmbed = new EmbedBuilder()
            .setTitle("❌ Błąd podczas resetowania")
            .setDescription(
              "Wystąpił błąd podczas resetowania danych. Sprawdź logi serwera."
            )
            .setColor("#e74c3c");

          await interaction.editReply({
            embeds: [errorEmbed],
            components: [],
          });
        }

        collector.stop();
      }
    });

    collector.on("end", (collected) => {
      if (collected.size === 0) {
        const timeoutEmbed = new EmbedBuilder()
          .setTitle("⏰ Czas minął")
          .setDescription("Reset został anulowany z powodu braku odpowiedzi.")
          .setColor("#95a5a6");

        interaction
          .editReply({
            embeds: [timeoutEmbed],
            components: [],
          })
          .catch(() => {});
      }
    });
  },
};
