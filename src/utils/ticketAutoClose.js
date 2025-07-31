const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const TicketConfig = require("../models/tickets/TicketConfig");
const Ticket = require("../models/tickets/Ticket");
const TicketMessage = require("../models/tickets/TicketMessage");
const TicketAssignment = require("../models/tickets/TicketAssignment");

class TicketAutoClose {
    constructor(client) {
        this.client = client;
        this.checkInterval = 30 * 60 * 1000;
        this.warningsSent = new Set();
    }

    start() {
        console.log("🤖 Uruchomiono system automatycznego zamykania ticketów");

        setInterval(() => {
            this.checkInactiveTickets();
        }, this.checkInterval);

        setTimeout(() => {
            this.checkInactiveTickets();
        }, 5 * 60 * 1000);
    }

    async checkInactiveTickets() {
        try {
            console.log("🔍 Sprawdzanie nieaktywnych ticketów...");

            const configs = await TicketConfig.find({
                "autoClose.enabled": true,
            });

            for (const config of configs) {
                await this.processGuildTickets(config);
            }
        } catch (error) {
            console.error("Błąd podczas sprawdzania nieaktywnych ticketów:", error);
        }
    }

    async processGuildTickets(config) {
        try {
            const guild = await this.client.guilds.fetch(config.guildId);
            if (!guild) return;

            const openTickets = await Ticket.find({
                guildId: config.guildId,
                status: {$in: ["open", "assigned", "pending"]},
            });

            const now = new Date();
            const warningTime = config.autoClose.warningHours * 60 * 60 * 1000;
            const closeTime = config.autoClose.inactiveHours * 60 * 60 * 1000;

            for (const ticket of openTickets) {
                const inactiveTime = now - ticket.lastActivity;

                if (inactiveTime >= closeTime) {
                    await this.autoCloseTicket(guild, ticket, config);
                } else if (
                    inactiveTime >= warningTime &&
                    !this.warningsSent.has(ticket.ticketId)
                ) {
                    await this.sendInactivityWarning(guild, ticket, config);
                    this.warningsSent.add(ticket.ticketId);
                }
            }
        } catch (error) {
            console.error(
                `Błąd podczas przetwarzania ticketów dla serwera ${config.guildId}:`,
                error
            );
        }
    }

    async sendInactivityWarning(guild, ticket, config) {
        try {
            const channel = await guild.channels.fetch(ticket.channelId);
            if (!channel) return;

            const hoursUntilClose = Math.ceil(
                (config.autoClose.inactiveHours * 60 * 60 * 1000 -
                    (Date.now() - ticket.lastActivity)) /
                (60 * 60 * 1000)
            );

            const warningEmbed = new EmbedBuilder()
                .setTitle("⚠️ Ostrzeżenie o Nieaktywności")
                .setDescription(
                    `Ten ticket jest nieaktywny od dłuższego czasu.\n\n` +
                    `**Zostanie automatycznie zamknięty za:** ${hoursUntilClose} godzin(y)\n\n` +
                    `Aby zapobiec automatycznemu zamknięciu, wyślij wiadomość w tym kanale lub kliknij przycisk poniżej.`
                )
                .setColor("#f39c12")
                .setTimestamp()
                .setFooter({text: "System Automatycznego Zamykania"});

            const keepOpenButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`keep_ticket_open_${ticket.ticketId}`)
                    .setLabel("Zachowaj Otwarty")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("✋")
            );

            await channel.send({
                content: `<@${ticket.userId}>`,
                embeds: [warningEmbed],
                components: [keepOpenButton],
            });

            const systemMessage = new TicketMessage({
                ticketId: ticket.ticketId,
                messageId: `system_warning_${Date.now()}`,
                channelId: channel.id,
                userId: this.client.user.id,
                username: "System",
                content: `Wysłano ostrzeżenie o nieaktywności. Ticket zostanie zamknięty za ${hoursUntilClose} godzin(y).`,
                isSystem: true,
            });

            await systemMessage.save();

            if (config.notifications.inactiveWarning) {
                await this.notifyStaffAboutInactivity(guild, ticket, config, "warning");
            }

            console.log(
                `⚠️ Wysłano ostrzeżenie o nieaktywności dla ticketu ${ticket.ticketId}`
            );
        } catch (error) {
            console.error(
                `Błąd podczas wysyłania ostrzeżenia dla ticketu ${ticket.ticketId}:`,
                error
            );
        }
    }

    async autoCloseTicket(guild, ticket, config) {
        try {
            const channel = await guild.channels.fetch(ticket.channelId);
            if (!channel) {
                await this.markTicketAsClosed(ticket, "Kanał usunięty");
                return;
            }

            const transcript = await this.createTranscript(ticket.ticketId);

            ticket.status = "closed";
            ticket.closedBy = {
                userId: this.client.user.id,
                username: "System",
                closedAt: new Date(),
                reason: `Automatycznie zamknięty z powodu nieaktywności (${config.autoClose.inactiveHours}h)`,
            };

            await ticket.save();

            if (ticket.assignedTo && ticket.assignedTo.userId) {
                await TicketAssignment.findOneAndUpdate(
                    {ticketId: ticket.ticketId, isActive: true},
                    {
                        isActive: false,
                        unassignedAt: new Date(),
                        unassignedBy: this.client.user.id,
                        reason: "Ticket automatycznie zamknięty",
                    }
                );
            }

            const closeEmbed = new EmbedBuilder()
                .setTitle("🤖 Ticket Automatycznie Zamknięty")
                .setDescription(
                    `Ten ticket został automatycznie zamknięty z powodu nieaktywności.\n\n` +
                    `**Czas nieaktywności:** ${config.autoClose.inactiveHours} godzin(y)\n` +
                    `**Data zamknięcia:** <t:${Math.floor(Date.now() / 1000)}:F>\n\n` +
                    `Jeśli nadal potrzebujesz pomocy, utwórz nowy ticket.`
                )
                .setColor("#95a5a6")
                .setTimestamp()
                .setFooter({text: "System Automatycznego Zamykania"});

            await channel.send({
                content: `<@${ticket.userId}>`,
                embeds: [closeEmbed],
            });

            if (config.transcriptChannelId && transcript) {
                await this.sendTranscript(
                    guild,
                    config.transcriptChannelId,
                    ticket,
                    transcript
                );
            }

            if (config.notifications.ticketClosed) {
                await this.notifyStaffAboutInactivity(guild, ticket, config, "closed");
            }

            this.warningsSent.delete(ticket.ticketId);

            setTimeout(async () => {
                try {
                    await channel.delete(
                        "Ticket automatycznie zamknięty z powodu nieaktywności"
                    );
                } catch (error) {
                    console.error("Błąd podczas usuwania kanału:", error);
                }
            }, 30000);

            console.log(
                `🤖 Automatycznie zamknięto ticket ${ticket.ticketId} z powodu nieaktywności`
            );
        } catch (error) {
            console.error(
                `Błąd podczas automatycznego zamykania ticketu ${ticket.ticketId}:`,
                error
            );
        }
    }

    async markTicketAsClosed(ticket, reason) {
        try {
            ticket.status = "closed";
            ticket.closedBy = {
                userId: this.client.user.id,
                username: "System",
                closedAt: new Date(),
                reason: reason,
            };

            await ticket.save();

            if (ticket.assignedTo && ticket.assignedTo.userId) {
                await TicketAssignment.findOneAndUpdate(
                    {ticketId: ticket.ticketId, isActive: true},
                    {
                        isActive: false,
                        unassignedAt: new Date(),
                        unassignedBy: this.client.user.id,
                        reason: reason,
                    }
                );
            }

            this.warningsSent.delete(ticket.ticketId);
        } catch (error) {
            console.error(
                `Błąd podczas oznaczania ticketu ${ticket.ticketId} jako zamkniętego:`,
                error
            );
        }
    }

    async handleKeepOpen(interaction) {
        const ticketId = interaction.customId.split("_").pop();

        try {
            const ticket = await Ticket.findOne({ticketId});
            if (!ticket) {
                return interaction.reply({
                    content: "❌ Nie znaleziono ticketu.",
                    ephemeral: true,
                });
            }

            if (ticket.userId !== interaction.user.id) {
                const config = await TicketConfig.findOne({
                    guildId: interaction.guildId,
                });
                const memberRoles = interaction.member.roles.cache.map(
                    (role) => role.id
                );

                if (!config || !config.isStaff(interaction.user.id, memberRoles)) {
                    return interaction.reply({
                        content:
                            "❌ Tylko właściciel ticketu lub personel może wykonać tę akcję.",
                        ephemeral: true,
                    });
                }
            }

            ticket.lastActivity = new Date();
            await ticket.save();

            this.warningsSent.delete(ticketId);

            const keepOpenEmbed = new EmbedBuilder()
                .setDescription(
                    `✅ ${interaction.user} zachował ticket otwarty. Automatyczne zamykanie zostało zresetowane.`
                )
                .setColor("#27ae60")
                .setTimestamp();

            await interaction.reply({embeds: [keepOpenEmbed]});

            await interaction.message.edit({
                embeds: interaction.message.embeds,
                components: [],
            });
        } catch (error) {
            console.error("Błąd podczas zachowywania ticketu otwartego:", error);
            await interaction.reply({
                content: "❌ Wystąpił błąd podczas przetwarzania żądania.",
                ephemeral: true,
            });
        }
    }

    async createTranscript(ticketId) {
        try {
            const messages = await TicketMessage.getTranscript(ticketId);

            let transcript = `=== TRANSKRYPT TICKETU ${ticketId} (AUTOMATYCZNIE ZAMKNIĘTY) ===\n\n`;

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

    async sendTranscript(guild, channelId, ticket, transcript) {
        try {
            const channel = await guild.channels.fetch(channelId);
            if (!channel) return;

            const transcriptEmbed = new EmbedBuilder()
                .setTitle(
                    `📋 Transkrypt Ticketu #${
                        ticket.ticketId.split("-")[1]
                    } (Auto-zamknięty)`
                )
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
                    `**Powód zamknięcia:** ${ticket.closedBy.reason}`
                )
                .setColor("#95a5a6")
                .setTimestamp();

            const buffer = Buffer.from(transcript, "utf-8");
            const attachment = {
                attachment: buffer,
                name: `ticket-${ticket.ticketId}-auto-closed-transcript.txt`,
            };

            await channel.send({
                embeds: [transcriptEmbed],
                files: [attachment],
            });
        } catch (error) {
            console.error("Błąd podczas wysyłania transkryptu:", error);
        }
    }

    async notifyStaffAboutInactivity(guild, ticket, config, type) {
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
                            case "warning":
                                embed = new EmbedBuilder()
                                    .setTitle("⚠️ Ticket Nieaktywny")
                                    .setDescription(
                                        `Ticket na serwerze **${guild.name}** jest nieaktywny i zostanie wkrótce zamknięty.\n\n` +
                                        `**Ticket:** #${ticket.ticketId.split("-")[1]}\n` +
                                        `**Użytkownik:** ${ticket.username}\n` +
                                        `**Kategoria:** ${ticket.category}\n` +
                                        `**Ostatnia aktywność:** <t:${Math.floor(
                                            ticket.lastActivity.getTime() / 1000
                                        )}:R>\n\n` +
                                        `[Przejdź do ticketu](https://discord.com/channels/${guild.id}/${ticket.channelId})`
                                    )
                                    .setColor("#f39c12");
                                break;

                            case "closed":
                                embed = new EmbedBuilder()
                                    .setTitle("🤖 Ticket Automatycznie Zamknięty")
                                    .setDescription(
                                        `Ticket na serwerze **${guild.name}** został automatycznie zamknięty z powodu nieaktywności.\n\n` +
                                        `**Ticket:** #${ticket.ticketId.split("-")[1]}\n` +
                                        `**Użytkownik:** ${ticket.username}\n` +
                                        `**Kategoria:** ${ticket.category}\n` +
                                        `**Czas nieaktywności:** ${config.autoClose.inactiveHours} godzin(y)`
                                    )
                                    .setColor("#95a5a6");
                                break;
                        }

                        if (embed) {
                            await member.send({embeds: [embed]});
                        }
                    } catch (error) {
                    }
                }
            } catch (error) {
                console.error(
                    `Błąd podczas wysyłania powiadomień dla roli ${roleId}:`,
                    error
                );
            }
        }
    }
}

module.exports = TicketAutoClose;
