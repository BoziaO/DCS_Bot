const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    AttachmentBuilder,
} = require("discord.js");
const TicketConfig = require("../../models/tickets/TicketConfig");
const Ticket = require("../../models/tickets/Ticket");
const TicketMessage = require("../../models/tickets/TicketMessage");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("export-transcript")
        .setDescription("Eksportuje transkrypt ticketu.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addStringOption((option) =>
            option
                .setName("ticket-id")
                .setDescription("ID ticketu (opcjonalnie, domyślnie aktualny kanał).")
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName("format")
                .setDescription("Format eksportu.")
                .setRequired(false)
                .addChoices(
                    {name: "Tekst (.txt)", value: "txt"},
                    {name: "HTML (.html)", value: "html"},
                    {name: "JSON (.json)", value: "json"}
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const ticketIdInput = interaction.options.getString("ticket-id");
        const format = interaction.options.getString("format") || "txt";

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
            const canExport = config.isStaff(interaction.user.id, memberRoles) || isOwner;

            if (!canExport) {
                return interaction.editReply("❌ Nie masz uprawnień do eksportu transkryptu tego ticketu.");
            }

            const messages = await TicketMessage.find({ticketId: ticket.ticketId})
                .sort({createdAt: 1});

            if (messages.length === 0) {
                return interaction.editReply("❌ Nie znaleziono wiadomości dla tego ticketu.");
            }

            let transcriptContent;
            let fileName;
            let contentType;

            switch (format) {
                case "html":
                    transcriptContent = await this.generateHTMLTranscript(ticket, messages, interaction.guild);
                    fileName = `ticket-${ticket.ticketId}-transcript.html`;
                    contentType = "text/html";
                    break;

                case "json":
                    transcriptContent = await this.generateJSONTranscript(ticket, messages);
                    fileName = `ticket-${ticket.ticketId}-transcript.json`;
                    contentType = "application/json";
                    break;

                default:
                    transcriptContent = await this.generateTextTranscript(ticket, messages);
                    fileName = `ticket-${ticket.ticketId}-transcript.txt`;
                    contentType = "text/plain";
                    break;
            }

            const buffer = Buffer.from(transcriptContent, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, {
                name: fileName,
                description: `Transkrypt ticketu #${ticket.ticketId.split('-')[1]}`
            });

            const exportEmbed = new EmbedBuilder()
                .setTitle("📋 Transkrypt Wyeksportowany")
                .setDescription(
                    `**Ticket:** #${ticket.ticketId.split('-')[1]}\n` +
                    `**Użytkownik:** ${ticket.username}\n` +
                    `**Kategoria:** ${ticket.category}\n` +
                    `**Status:** ${ticket.status}\n` +
                    `**Liczba wiadomości:** ${messages.length}\n` +
                    `**Format:** ${format.toUpperCase()}\n` +
                    `**Wyeksportowany przez:** ${interaction.user}`
                )
                .setColor("#3498db")
                .setTimestamp()
                .setFooter({text: `Ticket ID: ${ticket.ticketId}`});

            await interaction.editReply({
                embeds: [exportEmbed],
                files: [attachment]
            });

        } catch (error) {
            console.error("Błąd podczas eksportu transkryptu:", error);
            await interaction.editReply("❌ Wystąpił błąd podczas eksportu transkryptu.");
        }
    },

    async generateTextTranscript(ticket, messages) {
        let transcript = `=== TRANSKRYPT TICKETU ${ticket.ticketId} ===\n\n`;
        transcript += `Ticket #${ticket.ticketId.split('-')[1]}\n`;
        transcript += `Użytkownik: ${ticket.username}\n`;
        transcript += `Kategoria: ${ticket.category}\n`;
        transcript += `Priorytet: ${ticket.priority}\n`;
        transcript += `Status: ${ticket.status}\n`;
        transcript += `Utworzony: ${ticket.createdAt.toLocaleString('pl-PL')}\n`;

        if (ticket.assignedTo) {
            transcript += `Przypisany do: ${ticket.assignedTo.username}\n`;
        }

        if (ticket.closedBy) {
            transcript += `Zamknięty przez: ${ticket.closedBy.username}\n`;
            transcript += `Data zamknięcia: ${ticket.closedBy.closedAt.toLocaleString('pl-PL')}\n`;
            transcript += `Powód zamknięcia: ${ticket.closedBy.reason}\n`;
        }

        transcript += `\n${"=".repeat(60)}\n\n`;

        messages.forEach(msg => {
            const timestamp = new Date(msg.createdAt).toLocaleString('pl-PL');
            const authorPrefix = msg.isStaff ? "[PERSONEL]" : msg.isSystem ? "[SYSTEM]" : "[UŻYTKOWNIK]";

            transcript += `[${timestamp}] ${authorPrefix} ${msg.username}: ${msg.content}\n`;

            if (msg.attachments && msg.attachments.length > 0) {
                msg.attachments.forEach(att => {
                    transcript += `  📎 Załącznik: ${att.name} (${att.url})\n`;
                });
            }

            transcript += "\n";
        });

        return transcript;
    },

    async generateHTMLTranscript(ticket, messages, guild) {
        const guildIcon = guild.iconURL() || "";
        const ticketNumber = ticket.ticketId.split('-')[1];

        let html = `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Transkrypt Ticketu #${ticketNumber}</title>
    <style>
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #36393f;
            color: #dcddde;
            margin: 0;
            padding: 20px;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background-color: #2f3136;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.3);
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #4f545c;
            padding-bottom: 20px;
            margin-bottom: 20px;
        }
        .guild-icon {
            width: 64px;
            height: 64px;
            border-radius: 50%;
            margin-bottom: 10px;
        }
        .ticket-info {
            background-color: #40444b;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-left: 3px solid #7289da;
            background-color: #40444b;
            border-radius: 0 5px 5px 0;
        }
        .message.staff {
            border-left-color: #43b581;
        }
        .message.system {
            border-left-color: #faa61a;
            background-color: #4a4a4a;
        }
        .message-header {
            display: flex;
            align-items: center;
            margin-bottom: 5px;
        }
        .username {
            font-weight: bold;
            margin-right: 10px;
        }
        .timestamp {
            color: #72767d;
            font-size: 0.8em;
        }
        .badge {
            background-color: #7289da;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 0.7em;
            margin-left: 5px;
        }
        .badge.staff { background-color: #43b581; }
        .badge.system { background-color: #faa61a; }
        .attachment {
            background-color: #2f3136;
            padding: 8px;
            border-radius: 3px;
            margin-top: 5px;
            border: 1px solid #4f545c;
        }
        .priority-high { color: #e67e22; }
        .priority-critical { color: #e74c3c; }
        .priority-medium { color: #f39c12; }
        .priority-low { color: #27ae60; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            ${guildIcon ? `<img src="${guildIcon}" alt="Guild Icon" class="guild-icon">` : ''}
            <h1>🎫 Transkrypt Ticketu #${ticketNumber}</h1>
            <p>Serwer: ${guild.name}</p>
        </div>
        
        <div class="ticket-info">
            <h3>Informacje o Tickecie</h3>
            <p><strong>ID:</strong> ${ticket.ticketId}</p>
            <p><strong>Użytkownik:</strong> ${ticket.username}</p>
            <p><strong>Tytuł:</strong> ${ticket.title}</p>
            <p><strong>Kategoria:</strong> ${ticket.category}</p>
            <p><strong>Priorytet:</strong> <span class="priority-${ticket.priority}">${ticket.priority.toUpperCase()}</span></p>
            <p><strong>Status:</strong> ${ticket.status}</p>
            <p><strong>Utworzony:</strong> ${ticket.createdAt.toLocaleString('pl-PL')}</p>
            ${ticket.assignedTo ? `<p><strong>Przypisany do:</strong> ${ticket.assignedTo.username}</p>` : ''}
            ${ticket.closedBy ? `
                <p><strong>Zamknięty przez:</strong> ${ticket.closedBy.username}</p>
                <p><strong>Data zamknięcia:</strong> ${ticket.closedBy.closedAt.toLocaleString('pl-PL')}</p>
                <p><strong>Powód zamknięcia:</strong> ${ticket.closedBy.reason}</p>
            ` : ''}
        </div>
        
        <div class="messages">
            <h3>Wiadomości (${messages.length})</h3>`;

        messages.forEach(msg => {
            const messageClass = msg.isStaff ? 'staff' : msg.isSystem ? 'system' : '';
            const badge = msg.isStaff ? '<span class="badge staff">PERSONEL</span>' :
                msg.isSystem ? '<span class="badge system">SYSTEM</span>' :
                    '<span class="badge">UŻYTKOWNIK</span>';

            html += `
            <div class="message ${messageClass}">
                <div class="message-header">
                    <span class="username">${msg.username}</span>
                    ${badge}
                    <span class="timestamp">${new Date(msg.createdAt).toLocaleString('pl-PL')}</span>
                </div>
                <div class="content">${msg.content.replace(/\n/g, '<br>')}</div>`;

            if (msg.attachments && msg.attachments.length > 0) {
                msg.attachments.forEach(att => {
                    html += `
                <div class="attachment">
                    📎 <a href="${att.url}" target="_blank">${att.name}</a> (${Math.round(att.size / 1024)}KB)
                </div>`;
                });
            }

            html += `</div>`;
        });

        html += `
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #72767d; font-size: 0.9em;">
            <p>Transkrypt wygenerowany: ${new Date().toLocaleString('pl-PL')}</p>
            <p>System Ticketów - ${guild.name}</p>
        </div>
    </div>
</body>
</html>`;

        return html;
    },

    async generateJSONTranscript(ticket, messages) {
        const transcript = {
            ticket: {
                id: ticket.ticketId,
                number: ticket.ticketId.split('-')[1],
                title: ticket.title,
                description: ticket.description,
                category: ticket.category,
                priority: ticket.priority,
                status: ticket.status,
                user: {
                    id: ticket.userId,
                    username: ticket.username
                },
                assignedTo: ticket.assignedTo || null,
                closedBy: ticket.closedBy || null,
                rating: ticket.rating || null,
                createdAt: ticket.createdAt,
                lastActivity: ticket.lastActivity,
                messageCount: ticket.messageCount,
                tags: ticket.tags || []
            },
            messages: messages.map(msg => ({
                id: msg.messageId,
                content: msg.content,
                author: {
                    id: msg.userId,
                    username: msg.username
                },
                timestamp: msg.createdAt,
                attachments: msg.attachments || [],
                embeds: msg.embeds || [],
                isStaff: msg.isStaff,
                isSystem: msg.isSystem,
                editedAt: msg.editedAt || null,
                reactions: msg.reactions || []
            })),
            metadata: {
                exportedAt: new Date(),
                messageCount: messages.length,
                format: "json",
                version: "1.0"
            }
        };

        return JSON.stringify(transcript, null, 2);
    }
};