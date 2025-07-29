const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require("discord.js");

const TicketConfig = require("../models/tickets/TicketConfig");
const Ticket = require("../models/tickets/Ticket");
const TicketMessage = require("../models/tickets/TicketMessage");
const TicketAssignment = require("../models/tickets/TicketAssignment");
const TicketRating = require("../models/tickets/TicketRating");

class TicketHandler {
  static async handleCategorySelect(interaction) {
    const category = interaction.values[0];

    try {
      const config = await TicketConfig.findOne({
        guildId: interaction.guildId,
      });
      if (!config) {
        return interaction.reply({
          content: "❌ System ticketów nie jest skonfigurowany.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const userTickets = await Ticket.countDocuments({
        guildId: interaction.guildId,
        userId: interaction.user.id,
        status: { $in: ["open", "assigned", "pending"] },
      });

      if (userTickets >= config.maxTicketsPerUser) {
        return interaction.reply({
          content: `❌ Masz już maksymalną liczbę otwartych ticketów (${config.maxTicketsPerUser}). Zamknij niektóre przed utworzeniem nowego.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId(`ticket_modal_${category}`)
        .setTitle("Utwórz Nowy Ticket");

      const titleInput = new TextInputBuilder()
        .setCustomId("ticket_title")
        .setLabel("Tytuł ticketu")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("Krótki opis problemu...")
        .setRequired(true)
        .setMaxLength(100);

      const descriptionInput = new TextInputBuilder()
        .setCustomId("ticket_description")
        .setLabel("Szczegółowy opis")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder(
          "Opisz szczegółowo swój problem, pytanie lub zgłoszenie..."
        )
        .setRequired(true)
        .setMaxLength(1000);

      const priorityInput = new TextInputBuilder()
        .setCustomId("ticket_priority")
        .setLabel("Priorytet (low/medium/high/critical)")
        .setStyle(TextInputStyle.Short)
        .setPlaceholder("medium")
        .setRequired(false)
        .setMaxLength(10);

      const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
      const secondActionRow = new ActionRowBuilder().addComponents(
        descriptionInput
      );
      const thirdActionRow = new ActionRowBuilder().addComponents(
        priorityInput
      );

      modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

      await interaction.showModal(modal);
    } catch (error) {
      console.error("Błąd podczas obsługi wyboru kategorii:", error);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas przetwarzania żądania.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  static async handleTicketModal(interaction) {
    const category = interaction.customId.split("_")[2];
    const title = interaction.fields.getTextInputValue("ticket_title");
    const description =
      interaction.fields.getTextInputValue("ticket_description");
    const priorityInput =
      interaction.fields.getTextInputValue("ticket_priority") || "medium";

    const validPriorities = ["low", "medium", "high", "critical"];
    const priority = validPriorities.includes(priorityInput.toLowerCase())
      ? priorityInput.toLowerCase()
      : "medium";

    await interaction.deferReply({ ephemeral: true });

    try {
      const config = await TicketConfig.findOne({
        guildId: interaction.guildId,
      });
      if (!config) {
        return interaction.editReply(
          "❌ System ticketów nie jest skonfigurowany."
        );
      }

      config.ticketCount += 1;
      await config.save();

      const ticketNumber = String(config.ticketCount).padStart(4, "0");
      const ticketId = `${interaction.guildId}-${ticketNumber}`;

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

          ...config.staffRoles.admin.map((roleId) => ({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
              PermissionFlagsBits.ManageMessages,
            ],
          })),
          ...config.staffRoles.moderator.map((roleId) => ({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          })),
          ...config.staffRoles.support.map((roleId) => ({
            id: roleId,
            allow: [
              PermissionFlagsBits.ViewChannel,
              PermissionFlagsBits.SendMessages,
              PermissionFlagsBits.ReadMessageHistory,
              PermissionFlagsBits.AttachFiles,
            ],
          })),
        ],
      });

      const ticket = new Ticket({
        ticketId,
        guildId: interaction.guildId,
        channelId: channel.id,
        userId: interaction.user.id,
        username: interaction.user.username,
        title,
        description,
        category,
        priority,
        status: "open",
      });

      await ticket.save();

      const categoryInfo = config.categories.find((cat) => cat.id === category);
      const priorityColors = {
        low: "#95a5a6",
        medium: "#f39c12",
        high: "#e67e22",
        critical: "#e74c3c",
      };

      const ticketEmbed = new EmbedBuilder()
        .setTitle(`🎫 Ticket #${ticketNumber}`)
        .setDescription(
          `**Kategoria:** ${categoryInfo?.emoji || "📝"} ${
            categoryInfo?.name || category
          }\n` +
            `**Priorytet:** ${this.getPriorityEmoji(
              priority
            )} ${priority.toUpperCase()}\n` +
            `**Użytkownik:** ${interaction.user}\n` +
            `**Tytuł:** ${title}\n\n` +
            `**Opis:**\n${description}`
        )
        .setColor(priorityColors[priority] || "#3498db")
        .setTimestamp()
        .setFooter({ text: `Ticket ID: ${ticketId}` });

      const actionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_claim")
          .setLabel("Przejmij")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("👋"),
        new ButtonBuilder()
          .setCustomId("ticket_close")
          .setLabel("Zamknij")
          .setStyle(ButtonStyle.Danger)
          .setEmoji("🔒"),
        new ButtonBuilder()
          .setCustomId("ticket_priority")
          .setLabel("Zmień Priorytet")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("⚡")
      );

      const staffRolesToMention = [
        ...config.staffRoles.admin,
        ...config.staffRoles.moderator,
        ...config.staffRoles.support,
      ];

      const mentionText =
        staffRolesToMention.length > 0
          ? staffRolesToMention.map((roleId) => `<@&${roleId}>`).join(" ")
          : "";

      await channel.send({
        content: `${mentionText}\n\n${config.welcomeMessage}`,
        embeds: [ticketEmbed],
        components: [actionButtons],
      });

      const systemMessage = new TicketMessage({
        ticketId,
        messageId: `system_${Date.now()}`,
        channelId: channel.id,
        userId: interaction.client.user.id,
        username: "System",
        content: `Ticket utworzony przez ${interaction.user.username}`,
        isSystem: true,
      });

      await systemMessage.save();

      await interaction.editReply({
        content: `✅ Twój ticket został pomyślnie utworzony! Przejdź do ${channel} aby kontynuować.`,
      });

      if (config.notifications.newTicket) {
        await this.sendStaffNotifications(
          interaction.guild,
          config,
          ticket,
          "new"
        );
      }
    } catch (error) {
      console.error("Błąd podczas tworzenia ticketu:", error);
      await interaction.editReply(
        "❌ Wystąpił błąd podczas tworzenia ticketu. Sprawdź uprawnienia bota."
      );
    }
  }

  static async handleTicketClaim(interaction) {
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
          flags: MessageFlags.Ephemeral,
        });
      }

      const memberRoles = interaction.member.roles.cache.map((role) => role.id);
      if (!config.isStaff(interaction.user.id, memberRoles)) {
        return interaction.reply({
          content: "❌ Tylko personel może przejmować tickety.",
          flags: MessageFlags.Ephemeral,
        });
      }

      if (ticket.assignedTo && ticket.assignedTo.userId) {
        return interaction.reply({
          content: `❌ Ten ticket jest już przypisany do <@${ticket.assignedTo.userId}>.`,
          flags: MessageFlags.Ephemeral,
        });
      }

      ticket.assignedTo = {
        userId: interaction.user.id,
        username: interaction.user.username,
        assignedAt: new Date(),
        assignedBy: interaction.user.id,
      };
      ticket.status = "assigned";
      ticket.lastActivity = new Date();

      await ticket.save();

      const assignment = new TicketAssignment({
        ticketId: ticket.ticketId,
        assignedTo: interaction.user.id,
        assignedBy: interaction.user.id,
        reason: "Ticket przejęty przez pracownika",
      });

      await assignment.save();

      const claimEmbed = new EmbedBuilder()
        .setDescription(`✅ ${interaction.user} przejął ten ticket.`)
        .setColor("#27ae60")
        .setTimestamp();

      await interaction.reply({ embeds: [claimEmbed] });
    } catch (error) {
      console.error("Błąd podczas przejmowania ticketu:", error);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas przejmowania ticketu.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  static async handleTicketClose(interaction) {
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
          flags: MessageFlags.Ephemeral,
        });
      }

      const memberRoles = interaction.member.roles.cache.map((role) => role.id);
      const isOwner = ticket.userId === interaction.user.id;
      const canClose =
        config.hasPermission(interaction.user.id, memberRoles, "moderate") ||
        isOwner;

      if (!canClose) {
        return interaction.reply({
          content: "❌ Nie masz uprawnień do zamknięcia tego ticketu.",
          flags: MessageFlags.Ephemeral,
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("ticket_close_modal")
        .setTitle("Zamknij Ticket");

      const reasonInput = new TextInputBuilder()
        .setCustomId("close_reason")
        .setLabel("Powód zamknięcia")
        .setStyle(TextInputStyle.Paragraph)
        .setPlaceholder("Opisz powód zamknięcia ticketu...")
        .setRequired(true)
        .setMaxLength(500);

      const actionRow = new ActionRowBuilder().addComponents(reasonInput);
      modal.addComponents(actionRow);

      await interaction.showModal(modal);
    } catch (error) {
      console.error("Błąd podczas zamykania ticketu:", error);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas zamykania ticketu.",
        flags: MessageFlags.Ephemeral,
      });
    }
  }

  static async handleCloseModal(interaction) {
    const reason = interaction.fields.getTextInputValue("close_reason");

    await interaction.deferReply();

    try {
      const config = await TicketConfig.findOne({
        guildId: interaction.guildId,
      });
      const ticket = await Ticket.findOne({
        guildId: interaction.guildId,
        channelId: interaction.channelId,
      });

      if (!ticket) {
        return interaction.editReply("❌ Nie znaleziono ticketu.");
      }

      const transcript = await this.createTranscript(ticket.ticketId);

      ticket.status = "closed";
      ticket.closedBy = {
        userId: interaction.user.id,
        username: interaction.user.username,
        closedAt: new Date(),
        reason: reason,
      };

      await ticket.save();

      if (ticket.assignedTo && ticket.assignedTo.userId) {
        await TicketAssignment.findOneAndUpdate(
          { ticketId: ticket.ticketId, isActive: true },
          {
            isActive: false,
            unassignedAt: new Date(),
            unassignedBy: interaction.user.id,
            reason: "Ticket zamknięty",
          }
        );
      }

      if (config.transcriptChannelId && transcript) {
        await this.sendTranscript(
          interaction.guild,
          config.transcriptChannelId,
          ticket,
          transcript
        );
      }

      await this.sendRatingRequest(interaction.guild, ticket);

      const closeEmbed = new EmbedBuilder()
        .setTitle("🔒 Ticket Zamknięty")
        .setDescription(
          `**Zamknięty przez:** ${interaction.user}\n` +
            `**Powód:** ${reason}\n` +
            `**Data:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
            `Kanał zostanie usunięty za 10 sekund...`
        )
        .setColor("#e74c3c")
        .setTimestamp();

      await interaction.editReply({ embeds: [closeEmbed] });

      setTimeout(async () => {
        try {
          await interaction.channel.delete("Ticket zamknięty");
        } catch (error) {
          console.error("Błąd podczas usuwania kanału:", error);
        }
      }, 10000);
    } catch (error) {
      console.error("Błąd podczas zamykania ticketu:", error);
      await interaction.editReply(
        "❌ Wystąpił błąd podczas zamykania ticketu."
      );
    }
  }

  static async createTranscript(ticketId) {
    try {
      const messages = await TicketMessage.getTranscript(ticketId);

      let transcript = `=== TRANSKRYPT TICKETU ${ticketId} ===\n\n`;

      messages.forEach((msg) => {
        const timestamp = new Date(msg.timestamp).toLocaleString("pl-PL");
        const authorPrefix = msg.isStaff
          ? "[PERSONEL]"
          : msg.isSystem
          ? "[SYSTEM]"
          : "[UŻYTKOWNIK]";

        transcript += `[${timestamp}] ${authorPrefix} ${msg.author}: ${msg.content}\n`;

        if (msg.attachments && msg.attachments.length > 0) {
          msg.attachments.forEach((att) => {
            transcript += `  📎 Załącznik: ${att.name} (${att.url})\n`;
          });
        }

        transcript += "\n";
      });

      return transcript;
    } catch (error) {
      console.error("Błąd podczas tworzenia transkryptu:", error);
      return null;
    }
  }

  static async sendTranscript(guild, channelId, ticket, transcript) {
    try {
      const channel = await guild.channels.fetch(channelId);
      if (!channel) return;

      const transcriptEmbed = new EmbedBuilder()
        .setTitle(`📋 Transkrypt Ticketu #${ticket.ticketId.split("-")[1]}`)
        .setDescription(
          `**Użytkownik:** ${ticket.username}\n` +
            `**Kategoria:** ${ticket.category}\n` +
            `**Priorytet:** ${ticket.priority}\n` +
            `**Status:** ${ticket.status}\n` +
            `**Utworzony:** <t:${Math.floor(
              ticket.createdAt.getTime() / 1000
            )}:F>\n` +
            `**Zamknięty:** <t:${Math.floor(
              ticket.closedBy.closedAt.getTime() / 1000
            )}:F>\n` +
            `**Zamknięty przez:** ${ticket.closedBy.username}\n` +
            `**Powód zamknięcia:** ${ticket.closedBy.reason}`
        )
        .setColor("#34495e")
        .setTimestamp();

      const buffer = Buffer.from(transcript, "utf-8");
      const attachment = {
        attachment: buffer,
        name: `ticket-${ticket.ticketId}-transcript.txt`,
      };

      await channel.send({
        embeds: [transcriptEmbed],
        files: [attachment],
      });
    } catch (error) {
      console.error("Błąd podczas wysyłania transkryptu:", error);
    }
  }

  static async sendRatingRequest(guild, ticket) {
    try {
      const user = await guild.members.fetch(ticket.userId);
      if (!user) return;

      const ratingEmbed = new EmbedBuilder()
        .setTitle("⭐ Oceń Obsługę Ticketu")
        .setDescription(
          `Twój ticket **#${
            ticket.ticketId.split("-")[1]
          }** został zamknięty.\n\n` +
            `Pomóż nam poprawić jakość obsługi - oceń swoją obsługę!`
        )
        .setColor("#f39c12")
        .setTimestamp();

      const ratingButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`rate_ticket_${ticket.ticketId}`)
          .setLabel("Oceń Obsługę")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("⭐")
      );

      await user.send({
        embeds: [ratingEmbed],
        components: [ratingButtons],
      });
    } catch (error) {
      console.log(
        `Nie udało się wysłać prośby o ocenę do użytkownika ${ticket.username}:`,
        error.message
      );
    }
  }

  static async sendStaffNotifications(guild, config, ticket, type) {
    const allStaffRoles = [
      ...config.staffRoles.admin,
      ...config.staffRoles.moderator,
      ...config.staffRoles.support,
    ];

    for (const roleId of allStaffRoles) {
      try {
        const role = await guild.roles.fetch(roleId);
        if (!role) continue;

        for (const [userId, member] of role.members) {
          try {
            let embed;

            switch (type) {
              case "new":
                embed = new EmbedBuilder()
                  .setTitle("🎫 Nowy Ticket")
                  .setDescription(
                    `Nowy ticket został utworzony na serwerze **${guild.name}**.\n\n` +
                      `**Ticket:** #${ticket.ticketId.split("-")[1]}\n` +
                      `**Kategoria:** ${ticket.category}\n` +
                      `**Priorytet:** ${ticket.priority}\n` +
                      `**Użytkownik:** ${ticket.username}\n` +
                      `**Tytuł:** ${ticket.title}\n\n` +
                      `[Przejdź do ticketu](https://discord.com/channels/${guild.id}/${ticket.channelId})`
                  )
                  .setColor("#3498db");
                break;
            }

            if (embed) {
              await member.send({ embeds: [embed] });
            }
          } catch (error) {}
        }
      } catch (error) {
        console.error(
          `Błąd podczas wysyłania powiadomień dla roli ${roleId}:`,
          error
        );
      }
    }
  }

  static getPriorityEmoji(priority) {
    const emojis = {
      low: "🟢",
      medium: "🟡",
      high: "🟠",
      critical: "🔴",
    };
    return emojis[priority] || "⚪";
  }
}

module.exports = TicketHandler;
