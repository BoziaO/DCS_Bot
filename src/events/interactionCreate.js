const {
  Events,
  ChannelType,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  MessageFlags,
} = require("discord.js");
const TicketConfig = require("../models/TicketConfig");
const VerificationConfig = require("../models/VerificationConfig");
const { cache } = require("../utils/cache");
const { dbService } = require("../utils/database");
const {
  VerificationChallenges,
  VerificationRewards,
  VerificationStats,
} = require("../utils/verification");

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isAutocomplete()) {
      const command = interaction.client.commands.get(interaction.commandName);
      if (!command || !command.autocomplete) {
        console.error(
          `Nie znaleziono handlera autouzupełniania dla komendy ${interaction.commandName}.`
        );
        return;
      }
      try {
        await command.autocomplete(interaction);
      } catch (error) {
        console.error(error);
      }
      return;
    }

    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(interaction.commandName);

      if (!command) {
        console.error(
          `Nie znaleziono komendy pasującej do ${interaction.commandName}.`
        );
        return;
      }

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(error);
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp({
            content: "Wystąpił błąd podczas wykonywania tej komendy!",
            flags: MessageFlags.Ephemeral,
          });
        } else {
          await interaction.reply({
            content: "Wystąpił błąd podczas wykonywania tej komendy!",
            flags: MessageFlags.Ephemeral,
          });
        }
      }
      return;
    }

    if (interaction.isButton()) {
      const customId = interaction.customId;

      if (
        customId === "verify_button" ||
        customId === "verify_challenge_button"
      ) {
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const startTime = Date.now();

        const config = await VerificationConfig.findOne({
          guildId: interaction.guildId,
        });

        if (!config) {
          return interaction.editReply(
            "❌ System weryfikacji nie jest skonfigurowany na tym serwerze."
          );
        }

        const role = await interaction.guild.roles
          .fetch(config.roleId)
          .catch(() => null);
        if (!role) {
          return interaction.editReply(
            "❌ Skonfigurowana rola weryfikacyjna już nie istnieje. Skontaktuj się z administratorem."
          );
        }

        if (interaction.member.roles.cache.has(role.id)) {
          return interaction.editReply("✅ Jesteś już zweryfikowany/a!");
        }

        if (customId === "verify_challenge_button" || config.challengeEnabled) {
          const challengeType =
            config.challengeType === "random"
              ? VerificationChallenges.getRandomChallenge()
              : config.challengeType;

          try {
            await VerificationChallenges.startChallenge(
              interaction,
              challengeType
            );
            return;
          } catch (error) {
            console.error("Błąd podczas uruchamiania wyzwania:", error);
            return interaction.editReply(
              "❌ Wystąpił błąd podczas uruchamiania wyzwania."
            );
          }
        }

        try {
          await interaction.member.roles.add(role);

          const timeTaken = Math.round((Date.now() - startTime) / 1000);
          const rewardType = timeTaken <= 10 ? "speed_verification" : "basic";

          const statsManager = VerificationStats.getInstance();
          await statsManager.recordVerification(
            interaction.guild.id,
            interaction.user.id,
            {
              method: "basic",
              timeTaken: timeTaken,
              theme: config.theme,
            }
          );

          const rewardEmbed = VerificationRewards.createRewardEmbed(
            rewardType,
            interaction.member,
            { timeTaken }
          );

          if (config.welcomeChannelId) {
            try {
              const welcomeChannel = await interaction.guild.channels.fetch(
                config.welcomeChannelId
              );
              if (welcomeChannel) {
                const welcomeMessage = VerificationRewards.getWelcomeMessage(
                  rewardType,
                  interaction.member,
                  interaction.guild
                );
                await welcomeChannel.send(`🎉 ${welcomeMessage}`);
              }
            } catch (error) {
              console.warn(
                "Nie udało się wysłać wiadomości powitalnej:",
                error
              );
            }
          }

          return interaction.editReply({ embeds: [rewardEmbed] });
        } catch (error) {
          console.error("Błąd nadawania roli weryfikacyjnej:", error);
          return interaction.editReply(
            "❌ Wystąpił błąd podczas nadawania roli. Upewnij się, że moja rola jest wyżej niż rola weryfikacyjna."
          );
        }
      }

      if (customId.startsWith("challenge_answer_")) {
        const answerIndex = parseInt(customId.split("_")[2]);

        try {
          const isCorrect = await VerificationChallenges.handleAnswer(
            interaction,
            answerIndex
          );

          if (isCorrect) {
            const config = await VerificationConfig.findOne({
              guildId: interaction.guildId,
            });

            if (config) {
              const role = await interaction.guild.roles
                .fetch(config.roleId)
                .catch(() => null);
              if (role && !interaction.member.roles.cache.has(role.id)) {
                await interaction.member.roles.add(role);

                const statsManager = VerificationStats.getInstance();
                const challengeData = global.challengeCache?.get(
                  interaction.user.id
                );

                await statsManager.recordVerification(
                  interaction.guild.id,
                  interaction.user.id,
                  {
                    method: "challenge",
                    challengeType: challengeData?.challengeType || "unknown",
                    theme: config.theme,
                  }
                );

                if (config.welcomeChannelId) {
                  try {
                    const welcomeChannel =
                      await interaction.guild.channels.fetch(
                        config.welcomeChannelId
                      );
                    if (welcomeChannel) {
                      const welcomeMessage =
                        VerificationRewards.getWelcomeMessage(
                          "challenge_completed",
                          interaction.member,
                          interaction.guild
                        );
                      await welcomeChannel.send(`🏆 ${welcomeMessage}`);
                    }
                  } catch (error) {
                    console.warn(
                      "Nie udało się wysłać wiadomości powitalnej:",
                      error
                    );
                  }
                }
              }
            }
          }
        } catch (error) {
          console.error("Błąd podczas obsługi odpowiedzi na wyzwanie:", error);
        }
      }

      if (customId.startsWith("verification_reset_confirm_")) {
        const resetType = customId.split("verification_reset_confirm_")[1];
        const resetCommand =
          interaction.client.commands.get("verification-reset");
        if (resetCommand) {
          await resetCommand.handleConfirmation(interaction, resetType);
        }
      }

      if (customId === "verification_reset_cancel") {
        const resetCommand =
          interaction.client.commands.get("verification-reset");
        if (resetCommand) {
          await resetCommand.handleCancel(interaction);
        }
      }

      if (customId === "create_ticket_button") {
        const config = await TicketConfig.findOne({
          guildId: interaction.guildId,
        });
        if (!config) {
          return interaction.reply({
            content: "System ticketów nie jest skonfigurowany.",
            flags: MessageFlags.Ephemeral,
          });
        }

        config.ticketCount += 1;
        await config.save();
        const ticketNumber = String(config.ticketCount).padStart(4, "0");

        try {
          const channel = await interaction.guild.channels.create({
            name: `ticket-${ticketNumber}-${interaction.user.username}`,
            type: ChannelType.GuildText,
            parent: config.ticketsCategoryId,
            permissionOverwrites: [
              {
                id: interaction.guild.id,
                deny: [PermissionFlagsBits.ViewChannel],
              },
              {
                id: interaction.user.id,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.AttachFiles,
                ],
              },
              {
                id: config.staffRoleId,
                allow: [
                  PermissionFlagsBits.ViewChannel,
                  PermissionFlagsBits.SendMessages,
                  PermissionFlagsBits.ReadMessageHistory,
                  PermissionFlagsBits.AttachFiles,
                ],
              },
            ],
          });

          const ticketEmbed = new EmbedBuilder()
            .setTitle(`Ticket #${ticketNumber}`)
            .setDescription(
              `Witaj ${interaction.user}! Opisz swój problem, a członek personelu wkrótce się z Tobą skontaktuje.`
            )
            .setColor("#f1c40f");

          const closeButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId("close_ticket_button")
              .setLabel("Zamknij Ticket")
              .setStyle(ButtonStyle.Danger)
              .setEmoji("🔒")
          );

          await channel.send({
            content: `<@&${config.staffRoleId}>, nowy ticket!`,
            embeds: [ticketEmbed],
            components: [closeButton],
          });

          await interaction.reply({
            content: `Twój ticket został pomyślnie utworzony na kanale ${channel}!`,
            flags: MessageFlags.Ephemeral,
          });
        } catch (error) {
          console.error("Błąd tworzenia kanału ticketu:", error);
          await interaction.reply({
            content:
              "Nie udało się utworzyć ticketu. Sprawdź uprawnienia bota.",
            flags: MessageFlags.Ephemeral,
          });
        }
      }

      if (customId === "close_ticket_button") {
        const config = await TicketConfig.findOne({
          guildId: interaction.guildId,
        });
        if (!config) return;

        if (!interaction.member.roles.cache.has(config.staffRoleId)) {
          return interaction.reply({
            content: "Tylko personel może zamknąć ten ticket.",
            flags: MessageFlags.Ephemeral,
          });
        }

        const confirmationEmbed = new EmbedBuilder()
          .setTitle("Potwierdzenie zamknięcia")
          .setDescription(
            "Czy na pewno chcesz zamknąć ten ticket? Tej akcji nie można cofnąć."
          )
          .setColor("#e67e22");

        const confirmationButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("confirm_close_ticket")
            .setLabel("Tak, zamknij")
            .setStyle(ButtonStyle.Danger),
          new ButtonBuilder()
            .setCustomId("cancel_close_ticket")
            .setLabel("Anuluj")
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          embeds: [confirmationEmbed],
          components: [confirmationButtons],
        });
      }

      if (customId === "confirm_close_ticket") {
        await interaction.channel.delete("Ticket zamknięty przez personel.");
      }

      if (customId === "cancel_close_ticket") {
        await interaction.message.delete();
      }
    }
  },
};
