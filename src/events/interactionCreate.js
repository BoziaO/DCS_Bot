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
const OldTicketConfig = require("../models/TicketConfig");
const TicketConfig = require("../models/tickets/TicketConfig");
const TicketHandler = require("../handlers/ticketHandler");
const TicketMessage = require("../models/tickets/TicketMessage");
const Ticket = require("../models/tickets/Ticket");
const VerificationConfig = require("../models/VerificationConfig");
const { cache } = require("../utils/cache");
const { dbService } = require("../utils/database");
const {
  VerificationChallenges,
  VerificationRewards,
  VerificationStats,
} = require("../utils/verification");
const { handleTeamInteraction } = require("../handlers/teamInteractionHandler");

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

      if (customId.startsWith("team_")) {
        await handleTeamInteraction(interaction);
        return;
      }

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
        const config = await OldTicketConfig.findOne({
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
        const config = await OldTicketConfig.findOne({
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

      if (customId === "ticket_category_select") {
        await TicketHandler.handleCategorySelect(interaction);
        return;
      }

      if (customId === "priority_select") {
        await this.handlePrioritySelect(interaction);
        return;
      }

      if (customId === "ticket_claim") {
        await TicketHandler.handleTicketClaim(interaction);
        return;
      }

      if (customId === "ticket_close") {
        await TicketHandler.handleTicketClose(interaction);
        return;
      }

      if (customId.startsWith("keep_ticket_open_")) {
        const autoCloseHandler = interaction.client.ticketAutoClose;
        if (autoCloseHandler) {
          await autoCloseHandler.handleKeepOpen(interaction);
        }
        return;
      }

      if (customId.startsWith("rate_ticket_")) {
        await this.handleTicketRating(interaction);
        return;
      }

      if (customId === "ticket_priority") {
        await this.handlePriorityChange(interaction);
        return;
      }

      if (customId === "ticket_info") {
        await this.handleTicketSystemInfo(interaction);
        return;
      }
    }

    if (interaction.isModalSubmit()) {
      const customId = interaction.customId;

      if (customId.startsWith("ticket_modal_")) {
        await TicketHandler.handleTicketModal(interaction);
        return;
      }

      if (customId === "ticket_close_modal") {
        await TicketHandler.handleCloseModal(interaction);
        return;
      }

      if (customId.startsWith("rating_modal_")) {
        await this.handleRatingModal(interaction);
        return;
      }
    }

    if (interaction.isMessageComponent() || interaction.isChatInputCommand()) {
      await this.logTicketMessage(interaction);
    }
  },

  async handleTicketRating(interaction) {
    const ticketId = interaction.customId.split("_").slice(2).join("_");

    try {
      const ticket = await Ticket.findOne({ ticketId });
      if (!ticket) {
        return interaction.reply({
          content: "❌ Nie znaleziono ticketu.",
          ephemeral: true,
        });
      }

      if (ticket.userId !== interaction.user.id) {
        return interaction.reply({
          content: "❌ Możesz ocenić tylko swoje tickety.",
          ephemeral: true,
        });
      }

      const existingRating =
        await require("../models/tickets/TicketRating").findOne({ ticketId });
      if (existingRating) {
        return interaction.reply({
          content: "❌ Ten ticket został już oceniony.",
          ephemeral: true,
        });
      }

      const {
        ModalBuilder,
        TextInputBuilder,
        TextInputStyle,
        ActionRowBuilder,
      } = require("discord.js");

      const modal = new ModalBuilder()
        .setCustomId(`rating_modal_${ticketId}`)
        .setTitle("Oceń Obsługę Ticketu");

      const ratingInput = new TextInputBuilder()
        .setCustomId("rating_score")
        .setLabel("Ocena (1-5)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("5")
        .setRequired(true)
        .setMaxLength(1);

      const feedbackInput = new TextInputBuilder()
        .setCustomId("rating_feedback")
        .setLabel("Komentarz (opcjonalnie)")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Opisz swoją opinię o obsłudze...")
        .setRequired(false)
        .setMaxLength(1000);

      const responseTimeInput = new TextInputBuilder()
        .setCustomId("rating_response_time")
        .setLabel("Czas odpowiedzi (1-5)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("5")
        .setRequired(false)
        .setMaxLength(1);

      const helpfulnessInput = new TextInputBuilder()
        .setCustomId("rating_helpfulness")
        .setLabel("Pomocność (1-5)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("5")
        .setRequired(false)
        .setMaxLength(1);

      const recommendInput = new TextInputBuilder()
        .setCustomId("rating_recommend")
        .setLabel("Polecasz obsługę? (tak/nie)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("tak")
        .setRequired(false)
        .setMaxLength(3);

      modal.addComponents(
        new ActionRowBuilder().addComponents(ratingInput),
        new ActionRowBuilder().addComponents(feedbackInput),
        new ActionRowBuilder().addComponents(responseTimeInput),
        new ActionRowBuilder().addComponents(helpfulnessInput),
        new ActionRowBuilder().addComponents(recommendInput)
      );

      await interaction.showModal(modal);
    } catch (error) {
      console.error("Błąd podczas obsługi oceny ticketu:", error);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas przetwarzania oceny.",
        ephemeral: true,
      });
    }
  },

  async handleRatingModal(interaction) {
    const ticketId = interaction.customId.split("_").slice(2).join("_");
    const score = parseInt(
      interaction.fields.getTextInputValue("rating_score")
    );
    const feedback =
      interaction.fields.getTextInputValue("rating_feedback") || "";
    const responseTime =
      parseInt(interaction.fields.getTextInputValue("rating_response_time")) ||
      null;
    const helpfulness =
      parseInt(interaction.fields.getTextInputValue("rating_helpfulness")) ||
      null;
    const recommendInput =
      interaction.fields.getTextInputValue("rating_recommend") || "";
    const wouldRecommend =
      recommendInput.toLowerCase() === "tak" ||
      recommendInput.toLowerCase() === "yes";

    await interaction.deferReply({ ephemeral: true });

    try {
      if (isNaN(score) || score < 1 || score > 5) {
        return interaction.editReply("❌ Ocena musi być liczbą od 1 do 5.");
      }

      const ticket = await Ticket.findOne({ ticketId });
      if (!ticket) {
        return interaction.editReply("❌ Nie znaleziono ticketu.");
      }

      const staffId = ticket.assignedTo ? ticket.assignedTo.userId : null;
      if (!staffId) {
        return interaction.editReply(
          "❌ Nie można ocenić ticketu, który nie był przypisany do personelu."
        );
      }

      const TicketRating = require("../models/tickets/TicketRating");
      const rating = new TicketRating({
        ticketId,
        guildId: interaction.guildId,
        userId: interaction.user.id,
        staffId,
        rating: score,
        feedback,
        categories: {
          responseTime:
            responseTime && responseTime >= 1 && responseTime <= 5
              ? responseTime
              : undefined,
          helpfulness:
            helpfulness && helpfulness >= 1 && helpfulness <= 5
              ? helpfulness
              : undefined,
        },
        wouldRecommend,
      });

      await rating.save();

      ticket.rating = {
        score,
        feedback,
        ratedAt: new Date(),
      };
      await ticket.save();

      const { EmbedBuilder } = require("discord.js");
      const thankYouEmbed = new EmbedBuilder()
        .setTitle("⭐ Dziękujemy za Ocenę!")
        .setDescription(
          `Twoja ocena została zapisana.\n\n` +
            `**Ocena:** ${score}/5 ⭐\n` +
            `**Komentarz:** ${feedback || "Brak komentarza"}\n\n` +
            `Twoja opinia pomoże nam poprawić jakość obsługi!`
        )
        .setColor("#27ae60")
        .setTimestamp();

      await interaction.editReply({ embeds: [thankYouEmbed] });

      try {
        const guild = interaction.guild;
        const staffMember = await guild.members.fetch(staffId);

        const staffNotificationEmbed = new EmbedBuilder()
          .setTitle("⭐ Otrzymałeś Nową Ocenę!")
          .setDescription(
            `Użytkownik ocenił Twoją obsługę ticketu na serwerze **${guild.name}**.\n\n` +
              `**Ticket:** #${ticketId.split("-")[1]}\n` +
              `**Ocena:** ${score}/5 ⭐\n` +
              `**Komentarz:** ${feedback || "Brak komentarza"}\n` +
              `**Poleca obsługę:** ${wouldRecommend ? "Tak ✅" : "Nie ❌"}`
          )
          .setColor(score >= 4 ? "#27ae60" : score >= 3 ? "#f39c12" : "#e74c3c")
          .setTimestamp();

        await staffMember.send({ embeds: [staffNotificationEmbed] });
      } catch (error) {
        console.log(
          `Nie udało się wysłać powiadomienia o ocenie do personelu:`,
          error.message
        );
      }
    } catch (error) {
      console.error("Błąd podczas zapisywania oceny:", error);
      await interaction.editReply(
        "❌ Wystąpił błąd podczas zapisywania oceny."
      );
    }
  },

  async logTicketMessage(interaction) {
    try {
      const ticket = await Ticket.findOne({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
      });

      if (!ticket) return;

      if (interaction.isChatInputCommand()) return;

      if (!interaction.message || !interaction.message.content) return;

      const config = await require("../models/tickets/TicketConfig").findOne({
        guildId: interaction.guildId,
      });

      if (!config) return;

      const memberRoles = interaction.member.roles.cache.map((role) => role.id);
      const isStaff = config.isStaff(interaction.user.id, memberRoles);

      const ticketMessage = new TicketMessage({
        ticketId: ticket.ticketId,
        messageId: interaction.message.id,
        channelId: interaction.channelId,
        userId: interaction.user.id,
        username: interaction.user.username,
        content: interaction.message.content,
        attachments: interaction.message.attachments.map((att) => ({
          id: att.id,
          name: att.name,
          url: att.url,
          size: att.size,
          contentType: att.contentType,
        })),
        embeds: interaction.message.embeds.map((embed) => ({
          title: embed.title,
          description: embed.description,
          color: embed.color,
          fields: embed.fields,
        })),
        isStaff,
        isSystem: false,
      });

      await ticketMessage.save();

      ticket.lastActivity = new Date();
      ticket.messageCount += 1;
      await ticket.save();
    } catch (error) {
      console.error("Błąd podczas logowania wiadomości ticketu:", error);
    }
  },

  async handlePriorityChange(interaction) {
    try {
      const config = await TicketConfig.findOne({
        guildId: interaction.guildId,
      });
      if (!config) return;

      const ticket = await Ticket.findOne({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
      });

      if (!ticket) {
        return interaction.reply({
          content: "❌ Nie znaleziono ticketu.",
          ephemeral: true,
        });
      }

      const memberRoles = interaction.member.roles.cache.map((role) => role.id);
      if (!config.hasPermission(interaction.user.id, memberRoles, "moderate")) {
        return interaction.reply({
          content: "❌ Nie masz uprawnień do zmiany priorytetu ticketów.",
          ephemeral: true,
        });
      }

      const {
        StringSelectMenuBuilder,
        ActionRowBuilder,
      } = require("discord.js");

      const priorityMenu = new StringSelectMenuBuilder()
        .setCustomId("priority_select")
        .setPlaceholder("Wybierz nowy priorytet...")
        .addOptions([
          {
            label: "Niski",
            description: "Standardowe zapytania, nie wymagają pilnej uwagi",
            value: "low",
            emoji: "🟢",
          },
          {
            label: "Średni",
            description: "Typowe problemy wymagające uwagi",
            value: "medium",
            emoji: "🟡",
          },
          {
            label: "Wysoki",
            description: "Ważne problemy wymagające szybkiej reakcji",
            value: "high",
            emoji: "🟠",
          },
          {
            label: "Krytyczny",
            description: "Pilne problemy wymagające natychmiastowej uwagi",
            value: "critical",
            emoji: "🔴",
          },
        ]);

      const row = new ActionRowBuilder().addComponents(priorityMenu);

      await interaction.reply({
        content: `**Aktualny priorytet:** ${ticket.priority}\n\nWybierz nowy priorytet dla tego ticketu:`,
        components: [row],
        ephemeral: true,
      });
    } catch (error) {
      console.error("Błąd podczas obsługi zmiany priorytetu:", error);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas przetwarzania żądania.",
        ephemeral: true,
      });
    }
  },

  async handleTicketSystemInfo(interaction) {
    try {
      const { EmbedBuilder } = require("discord.js");

      const infoEmbed = new EmbedBuilder()
        .setTitle("ℹ️ Informacje o Systemie Ticketów")
        .setDescription(
          "Zaawansowany system wsparcia i zgłoszeń z wieloma funkcjami:\n\n" +
            "**🎫 Tworzenie Ticketów**\n" +
            "• Wybierz odpowiednią kategorię\n" +
            "• Opisz szczegółowo swój problem\n" +
            "• Ustaw priorytet (opcjonalnie)\n\n" +
            "**⚡ Funkcje Systemu**\n" +
            "• Automatyczne przypisywanie personelu\n" +
            "• Transkrypty wszystkich rozmów\n" +
            "• System ocen obsługi\n" +
            "• Automatyczne zamykanie nieaktywnych ticketów\n" +
            "• Powiadomienia dla personelu\n" +
            "• Szczegółowe statystyki i raporty\n\n" +
            "**👥 Poziomy Personelu**\n" +
            "🎧 **Wsparcie** - Może odpowiadać na tickety\n" +
            "🛡️ **Moderatorzy** - Mogą zamykać i przypisywać tickety\n" +
            "👑 **Administratorzy** - Pełne uprawnienia\n\n" +
            "**📊 Priorytety Ticketów**\n" +
            "🟢 **Niski** - Standardowe zapytania\n" +
            "🟡 **Średni** - Typowe problemy\n" +
            "🟠 **Wysoki** - Ważne problemy\n" +
            "🔴 **Krytyczny** - Pilne problemy\n\n" +
            "**⏰ Automatyczne Zamykanie**\n" +
            "System automatycznie zamyka nieaktywne tickety po określonym czasie. " +
            "Otrzymasz ostrzeżenie przed zamknięciem z możliwością przedłużenia.\n\n" +
            "**⭐ Ocena Obsługi**\n" +
            "Po zamknięciu ticketu możesz ocenić jakość obsługi, " +
            "co pomoże nam poprawić nasze usługi."
        )
        .setColor("#3498db")
        .setTimestamp()
        .setFooter({
          text: `${interaction.guild.name} | Zaawansowany System Ticketów`,
          iconURL: interaction.guild.iconURL(),
        });

      await interaction.reply({
        embeds: [infoEmbed],
        ephemeral: true,
      });
    } catch (error) {
      console.error("Błąd podczas wyświetlania informacji o systemie:", error);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas wyświetlania informacji.",
        ephemeral: true,
      });
    }
  },

  async handlePrioritySelect(interaction) {
    const newPriority = interaction.values[0];

    try {
      const config = await TicketConfig.findOne({
        guildId: interaction.guildId,
      });
      const ticket = await Ticket.findOne({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
      });

      if (!ticket) {
        return interaction.update({
          content: "❌ Nie znaleziono ticketu.",
          components: [],
        });
      }

      const oldPriority = ticket.priority;

      if (oldPriority === newPriority) {
        return interaction.update({
          content: `❌ Ticket już ma priorytet **${newPriority}**.`,
          components: [],
        });
      }

      ticket.priority = newPriority;
      ticket.lastActivity = new Date();
      await ticket.save();

      const systemMessage = new TicketMessage({
        ticketId: ticket.ticketId,
        messageId: `system_${Date.now()}`,
        channelId: interaction.channelId,
        userId: interaction.client.user.id,
        username: "System",
        content: `Priorytet ticketu zmieniony z ${oldPriority} na ${newPriority} przez ${interaction.user.username}`,
        isSystem: true,
      });

      await systemMessage.save();

      const priorityEmojis = {
        low: "🟢",
        medium: "🟡",
        high: "🟠",
        critical: "🔴",
      };

      const priorityNames = {
        low: "Niski",
        medium: "Średni",
        high: "Wysoki",
        critical: "Krytyczny",
      };

      await interaction.update({
        content: `✅ Priorytet ticketu zmieniony z **${priorityEmojis[oldPriority]} ${priorityNames[oldPriority]}** na **${priorityEmojis[newPriority]} ${priorityNames[newPriority]}**`,
        components: [],
      });

      const { EmbedBuilder } = require("discord.js");
      const channelEmbed = new EmbedBuilder()
        .setDescription(
          `⚡ **Priorytet ticketu został zmieniony**\n` +
            `${priorityEmojis[oldPriority]} ${priorityNames[oldPriority]} → ${priorityEmojis[newPriority]} ${priorityNames[newPriority]}\n` +
            `Zmieniony przez: ${interaction.user}`
        )
        .setColor(
          newPriority === "critical"
            ? "#e74c3c"
            : newPriority === "high"
            ? "#e67e22"
            : newPriority === "medium"
            ? "#f39c12"
            : "#27ae60"
        )
        .setTimestamp();

      await interaction.followUp({ embeds: [channelEmbed] });
    } catch (error) {
      console.error("Błąd podczas zmiany priorytetu:", error);
      await interaction.update({
        content: "❌ Wystąpił błąd podczas zmiany priorytetu.",
        components: [],
      });
    }
  },
};
