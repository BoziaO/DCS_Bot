const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const TicketConfig = require("../../models/tickets/TicketConfig");
const Ticket = require("../../models/tickets/Ticket");
const TicketMessage = require("../../models/tickets/TicketMessage");
const TicketRating = require("../../models/tickets/TicketRating");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ticket-info")
        .setDescription("Wyświetla szczegółowe informacje o tickecie.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption((option) =>
            option
                .setName("ticket-id")
                .setDescription("ID ticketu (opcjonalnie, domyślnie aktualny kanał).")
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const ticketIdInput = interaction.options.getString("ticket-id");

        try {
            const config = await TicketConfig.findOne({guildId: interaction.guildId});
            if (!config) {
                return interaction.editReply("❌ System ticketów nie jest skonfigurowany na tym serwerze.");
            }

            let ticket;

            if (ticketIdInput) {
                ticket = await Ticket.findOne({
                    guildId: interaction.guildId,
                    ticketId: ticketIdInput
                });

                if (!ticket) {
                    const fullTicketId = `${interaction.guildId}-${ticketIdInput.padStart(4, "0")}`;
                    ticket = await Ticket.findOne({
                        guildId: interaction.guildId,
                        ticketId: fullTicketId
                    });
                }
            } else {
                ticket = await Ticket.findOne({
                    guildId: interaction.guildId,
                    channelId: interaction.channelId
                });
            }

            if (!ticket) {
                return interaction.editReply("❌ Nie znaleziono ticketu. Sprawdź ID lub użyj komendy w kanale ticketu.");
            }

            const memberRoles = interaction.member.roles.cache.map(role => role.id);
            const isOwner = ticket.userId === interaction.user.id;
            const canView = config.isStaff(interaction.user.id, memberRoles) || isOwner;

            if (!canView) {
                return interaction.editReply("❌ Nie masz uprawnień do przeglądania informacji o tym tickecie.");
            }

            const messageCount = await TicketMessage.countDocuments({ticketId: ticket.ticketId});
            const rating = await TicketRating.findOne({ticketId: ticket.ticketId});

            const duration = ticket.closedBy && ticket.closedBy.closedAt ?
                ticket.closedBy.closedAt - ticket.createdAt :
                Date.now() - ticket.createdAt;

            const durationHours = Math.floor(duration / (1000 * 60 * 60));
            const durationMinutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));

            const inactiveTime = Date.now() - ticket.lastActivity;
            const inactiveHours = Math.floor(inactiveTime / (1000 * 60 * 60));
            const inactiveMinutes = Math.floor((inactiveTime % (1000 * 60 * 60)) / (1000 * 60));

            const ticketNumber = ticket.ticketId.split('-')[1];
            const statusEmojis = {
                open: "🟢",
                assigned: "🟡",
                pending: "🟠",
                resolved: "✅",
                closed: "🔴"
            };

            const priorityEmojis = {
                low: "🟢",
                medium: "🟡",
                high: "🟠",
                critical: "🔴"
            };

            const infoEmbed = new EmbedBuilder()
                .setTitle(`🎫 Informacje o Tickecie #${ticketNumber}`)
                .setColor(this.getStatusColor(ticket.status))
                .setTimestamp()
                .setFooter({text: `Ticket ID: ${ticket.ticketId}`});

            infoEmbed.addFields(
                {
                    name: "📋 Podstawowe Informacje",
                    value:
                        `**Status:** ${statusEmojis[ticket.status]} ${ticket.status.toUpperCase()}\n` +
                        `**Kategoria:** ${ticket.category}\n` +
                        `**Priorytet:** ${priorityEmojis[ticket.priority]} ${ticket.priority.toUpperCase()}\n` +
                        `**Użytkownik:** <@${ticket.userId}> (${ticket.username})\n` +
                        `**Tytuł:** ${ticket.title}`,
                    inline: false
                },
                {
                    name: "⏰ Informacje Czasowe",
                    value:
                        `**Utworzony:** <t:${Math.floor(ticket.createdAt.getTime() / 1000)}:F>\n` +
                        `**Ostatnia aktywność:** <t:${Math.floor(ticket.lastActivity.getTime() / 1000)}:R>\n` +
                        `**Czas trwania:** ${durationHours}h ${durationMinutes}m\n` +
                        `**Nieaktywny od:** ${inactiveHours}h ${inactiveMinutes}m`,
                    inline: true
                },
                {
                    name: "📊 Statystyki",
                    value:
                        `**Liczba wiadomości:** ${messageCount}\n` +
                        `**Wiadomości w tickecie:** ${ticket.messageCount}\n` +
                        `**Tagi:** ${ticket.tags && ticket.tags.length > 0 ? ticket.tags.join(", ") : "Brak"}`,
                    inline: true
                }
            );

            if (ticket.assignedTo && ticket.assignedTo.userId) {
                const assignedDate = ticket.assignedTo.assignedAt ?
                    `<t:${Math.floor(ticket.assignedTo.assignedAt.getTime() / 1000)}:F>` :
                    "Nieznana data";

                infoEmbed.addFields({
                    name: "👤 Przypisanie",
                    value:
                        `**Przypisany do:** <@${ticket.assignedTo.userId}>\n` +
                        `**Data przypisania:** ${assignedDate}\n` +
                        `**Przypisany przez:** <@${ticket.assignedTo.assignedBy}>`,
                    inline: false
                });
            }

            if (ticket.closedBy && ticket.closedBy.userId) {
                const closedDate = ticket.closedBy.closedAt ?
                    `<t:${Math.floor(ticket.closedBy.closedAt.getTime() / 1000)}:F>` :
                    "Nieznana data";

                infoEmbed.addFields({
                    name: "🔒 Zamknięcie",
                    value:
                        `**Zamknięty przez:** <@${ticket.closedBy.userId}>\n` +
                        `**Data zamknięcia:** ${closedDate}\n` +
                        `**Powód:** ${ticket.closedBy.reason || "Brak podanego powodu"}`,
                    inline: false
                });
            }

            if (rating) {
                const categoryRatings = rating.categories ?
                    Object.entries(rating.categories)
                        .filter(([key, value]) => value !== undefined)
                        .map(([key, value]) => `${key}: ${value}/5`)
                        .join(", ") :
                    "Brak szczegółowych ocen";

                infoEmbed.addFields({
                    name: "⭐ Ocena",
                    value:
                        `**Ogólna ocena:** ${rating.rating}/5 ⭐\n` +
                        `**Szczegółowe oceny:** ${categoryRatings}\n` +
                        `**Poleca obsługę:** ${rating.wouldRecommend ? "Tak ✅" : "Nie ❌"}\n` +
                        `**Komentarz:** ${rating.feedback || "Brak komentarza"}`,
                    inline: false
                });
            }

            if (ticket.description) {
                const description = ticket.description.length > 1024 ?
                    ticket.description.substring(0, 1021) + "..." :
                    ticket.description;

                infoEmbed.addFields({
                    name: "📝 Opis",
                    value: description,
                    inline: false
                });
            }

            let components = [];
            if (config.isStaff(interaction.user.id, memberRoles)) {
                const actionButtons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`ticket_info_transcript_${ticket.ticketId}`)
                        .setLabel("Pobierz Transkrypt")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("📋"),
                    new ButtonBuilder()
                        .setCustomId(`ticket_info_history_${ticket.ticketId}`)
                        .setLabel("Historia Przypisań")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("📜")
                );

                if (ticket.status !== 'closed') {
                    actionButtons.addComponents(
                        new ButtonBuilder()
                            .setCustomId(`ticket_info_manage_${ticket.ticketId}`)
                            .setLabel("Zarządzaj")
                            .setStyle(ButtonStyle.Primary)
                            .setEmoji("⚙️")
                    );
                }

                components.push(actionButtons);
            }

            await interaction.editReply({
                embeds: [infoEmbed],
                components
            });

        } catch (error) {
            console.error("Błąd podczas pobierania informacji o tickecie:", error);
            await interaction.editReply("❌ Wystąpił błąd podczas pobierania informacji o tickecie.");
        }
    },

    getStatusColor(status) {
        const colors = {
            open: "#2ecc71",
            assigned: "#f39c12",
            pending: "#e67e22",
            resolved: "#27ae60",
            closed: "#95a5a6"
        };
        return colors[status] || "#3498db";
    }
};