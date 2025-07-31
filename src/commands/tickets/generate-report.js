const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    AttachmentBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const TicketConfig = require("../../models/tickets/TicketConfig");
const Ticket = require("../../models/tickets/Ticket");
const TicketRating = require("../../models/tickets/TicketRating");
const TicketAssignment = require("../../models/tickets/TicketAssignment");
const TicketMessage = require("../../models/tickets/TicketMessage");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("generate-report")
        .setDescription("Generuje szczegółowy raport systemu ticketów.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) =>
            option
                .setName("period")
                .setDescription("Okres raportu")
                .setRequired(false)
                .addChoices(
                    {name: "Ostatnie 7 dni", value: "week"},
                    {name: "Ostatnie 30 dni", value: "month"},
                    {name: "Ostatnie 90 dni", value: "quarter"},
                    {name: "Wszystkie dane", value: "all"}
                )
        )
        .addStringOption((option) =>
            option
                .setName("format")
                .setDescription("Format raportu")
                .setRequired(false)
                .addChoices(
                    {name: "Szczegółowy (PDF-style HTML)", value: "detailed"},
                    {name: "Podsumowanie (Embed)", value: "summary"},
                    {name: "Dane CSV", value: "csv"},
                    {name: "JSON", value: "json"}
                )
        )
        .addBooleanOption((option) =>
            option
                .setName("include-staff-performance")
                .setDescription("Dołącz analizę wydajności personelu")
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const period = interaction.options.getString("period") || "month";
        const format = interaction.options.getString("format") || "summary";
        const includeStaffPerformance = interaction.options.getBoolean("include-staff-performance") ?? true;

        try {
            const config = await TicketConfig.findOne({guildId: interaction.guildId});
            if (!config) {
                return interaction.editReply("❌ System ticketów nie jest skonfigurowany na tym serwerze.");
            }

            const memberRoles = interaction.member.roles.cache.map(role => role.id);
            if (!config.hasPermission(interaction.user.id, memberRoles, 'admin')) {
                return interaction.editReply("❌ Nie masz uprawnień do generowania raportów.");
            }

            const endDate = new Date();
            let startDate = new Date();

            switch (period) {
                case "week":
                    startDate.setDate(startDate.getDate() - 7);
                    break;
                case "month":
                    startDate.setDate(startDate.getDate() - 30);
                    break;
                case "quarter":
                    startDate.setDate(startDate.getDate() - 90);
                    break;
                case "all":
                    startDate = new Date(0);
                    break;
            }

            const reportData = await this.collectReportData(interaction.guildId, startDate, endDate, includeStaffPerformance);

            if (format === "summary") {
                const summaryEmbed = await this.generateSummaryEmbed(reportData, period, interaction.guild.name);

                const buttons = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`report_detailed_${period}`)
                        .setLabel("Szczegółowy Raport")
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji("📊"),
                    new ButtonBuilder()
                        .setCustomId(`report_csv_${period}`)
                        .setLabel("Eksport CSV")
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji("📁")
                );

                await interaction.editReply({
                    embeds: [summaryEmbed],
                    components: [buttons]
                });
            } else {
                const {
                    content,
                    fileName,
                    contentType
                } = await this.generateReportFile(reportData, format, period, interaction.guild.name);

                const buffer = Buffer.from(content, 'utf-8');
                const attachment = new AttachmentBuilder(buffer, {
                    name: fileName,
                    description: `Raport systemu ticketów - ${period}`
                });

                const fileEmbed = new EmbedBuilder()
                    .setTitle("📊 Raport Wygenerowany")
                    .setDescription(
                        `**Okres:** ${this.getPeriodName(period)}\n` +
                        `**Format:** ${format.toUpperCase()}\n` +
                        `**Liczba ticketów:** ${reportData.totalTickets}\n` +
                        `**Wygenerowany przez:** ${interaction.user}\n` +
                        `**Data:** <t:${Math.floor(Date.now() / 1000)}:F>`
                    )
                    .setColor("#3498db")
                    .setTimestamp();

                await interaction.editReply({
                    embeds: [fileEmbed],
                    files: [attachment]
                });
            }

        } catch (error) {
            console.error("Błąd podczas generowania raportu:", error);
            await interaction.editReply("❌ Wystąpił błąd podczas generowania raportu.");
        }
    },

    async collectReportData(guildId, startDate, endDate, includeStaffPerformance) {
        const tickets = await Ticket.find({
            guildId,
            createdAt: {$gte: startDate, $lte: endDate}
        });

        const allTickets = await Ticket.find({guildId});

        const ratings = await TicketRating.find({
            guildId,
            createdAt: {$gte: startDate, $lte: endDate}
        });

        const messages = await TicketMessage.find({
            createdAt: {$gte: startDate, $lte: endDate}
        }).populate('ticketId');

        const totalTickets = tickets.length;
        const openTickets = tickets.filter(t => ['open', 'assigned', 'pending'].includes(t.status)).length;
        const closedTickets = tickets.filter(t => t.status === 'closed').length;
        const resolvedTickets = tickets.filter(t => t.status === 'resolved').length;

        const categoryStats = {};
        tickets.forEach(ticket => {
            if (!categoryStats[ticket.category]) {
                categoryStats[ticket.category] = {
                    total: 0,
                    open: 0,
                    closed: 0,
                    avgResolutionTime: 0,
                    resolutionTimes: []
                };
            }

            categoryStats[ticket.category].total++;

            if (['open', 'assigned', 'pending'].includes(ticket.status)) {
                categoryStats[ticket.category].open++;
            } else if (ticket.status === 'closed') {
                categoryStats[ticket.category].closed++;

                if (ticket.closedBy && ticket.closedBy.closedAt) {
                    const resolutionTime = ticket.closedBy.closedAt - ticket.createdAt;
                    categoryStats[ticket.category].resolutionTimes.push(resolutionTime);
                }
            }
        });

        Object.keys(categoryStats).forEach(category => {
            const times = categoryStats[category].resolutionTimes;
            if (times.length > 0) {
                categoryStats[category].avgResolutionTime = times.reduce((a, b) => a + b, 0) / times.length;
            }
        });

        const priorityStats = {};
        tickets.forEach(ticket => {
            if (!priorityStats[ticket.priority]) {
                priorityStats[ticket.priority] = {total: 0, closed: 0, avgResolutionTime: 0};
            }
            priorityStats[ticket.priority].total++;

            if (ticket.status === 'closed' && ticket.closedBy && ticket.closedBy.closedAt) {
                priorityStats[ticket.priority].closed++;
                const resolutionTime = ticket.closedBy.closedAt - ticket.createdAt;
                priorityStats[ticket.priority].avgResolutionTime += resolutionTime;
            }
        });

        const ratingStats = {
            totalRatings: ratings.length,
            averageRating: ratings.length > 0 ? ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0,
            ratingDistribution: {1: 0, 2: 0, 3: 0, 4: 0, 5: 0},
            recommendationRate: ratings.filter(r => r.wouldRecommend).length / (ratings.length || 1)
        };

        ratings.forEach(rating => {
            ratingStats.ratingDistribution[rating.rating]++;
        });

        const timeStats = {
            avgResponseTime: 0,
            avgResolutionTime: 0,
            ticketsByHour: new Array(24).fill(0),
            ticketsByDay: {}
        };

        tickets.forEach(ticket => {
            const hour = ticket.createdAt.getHours();
            timeStats.ticketsByHour[hour]++;

            const day = ticket.createdAt.toDateString();
            timeStats.ticketsByDay[day] = (timeStats.ticketsByDay[day] || 0) + 1;
        });

        let staffStats = {};
        if (includeStaffPerformance) {
            const assignments = await TicketAssignment.find({
                createdAt: {$gte: startDate, $lte: endDate}
            });

            const staffTickets = tickets.filter(t => t.assignedTo && t.assignedTo.userId);

            staffTickets.forEach(ticket => {
                const staffId = ticket.assignedTo.userId;
                if (!staffStats[staffId]) {
                    staffStats[staffId] = {
                        userId: staffId,
                        username: ticket.assignedTo.username,
                        ticketsAssigned: 0,
                        ticketsClosed: 0,
                        avgRating: 0,
                        totalRatings: 0,
                        avgResolutionTime: 0,
                        resolutionTimes: []
                    };
                }

                staffStats[staffId].ticketsAssigned++;

                if (ticket.status === 'closed') {
                    staffStats[staffId].ticketsClosed++;

                    if (ticket.closedBy && ticket.closedBy.closedAt) {
                        const resolutionTime = ticket.closedBy.closedAt - ticket.createdAt;
                        staffStats[staffId].resolutionTimes.push(resolutionTime);
                    }
                }
            });

            for (const staffId in staffStats) {
                const staffRatings = ratings.filter(r => r.staffId === staffId);
                if (staffRatings.length > 0) {
                    staffStats[staffId].avgRating = staffRatings.reduce((sum, r) => sum + r.rating, 0) / staffRatings.length;
                    staffStats[staffId].totalRatings = staffRatings.length;
                }

                const times = staffStats[staffId].resolutionTimes;
                if (times.length > 0) {
                    staffStats[staffId].avgResolutionTime = times.reduce((a, b) => a + b, 0) / times.length;
                }
            }
        }

        return {
            period: {startDate, endDate},
            totalTickets,
            openTickets,
            closedTickets,
            resolvedTickets,
            categoryStats,
            priorityStats,
            ratingStats,
            timeStats,
            staffStats,
            tickets,
            ratings,
            messages: messages.length
        };
    },

    async generateSummaryEmbed(data, period, guildName) {
        const embed = new EmbedBuilder()
            .setTitle(`📊 Raport Systemu Ticketów - ${this.getPeriodName(period)}`)
            .setColor("#3498db")
            .setTimestamp()
            .setFooter({text: guildName});

        embed.addFields(
            {
                name: "📈 Ogólne Statystyki",
                value:
                    `**Wszystkie tickety:** ${data.totalTickets}\n` +
                    `**Otwarte:** ${data.openTickets}\n` +
                    `**Zamknięte:** ${data.closedTickets}\n` +
                    `**Rozwiązane:** ${data.resolvedTickets}\n` +
                    `**Wskaźnik zamknięcia:** ${data.totalTickets > 0 ? Math.round((data.closedTickets / data.totalTickets) * 100) : 0}%`,
                inline: true
            },
            {
                name: "⭐ Oceny i Zadowolenie",
                value:
                    `**Średnia ocena:** ${Math.round(data.ratingStats.averageRating * 100) / 100}/5\n` +
                    `**Liczba ocen:** ${data.ratingStats.totalRatings}\n` +
                    `**Wskaźnik rekomendacji:** ${Math.round(data.ratingStats.recommendationRate * 100)}%\n` +
                    `**Oceny 5⭐:** ${data.ratingStats.ratingDistribution[5]}\n` +
                    `**Oceny 1⭐:** ${data.ratingStats.ratingDistribution[1]}`,
                inline: true
            },
            {
                name: "📊 Aktywność",
                value:
                    `**Wiadomości:** ${data.messages}\n` +
                    `**Średnio wiadomości/ticket:** ${data.totalTickets > 0 ? Math.round(data.messages / data.totalTickets) : 0}\n` +
                    `**Najaktywniejsza godzina:** ${this.getMostActiveHour(data.timeStats.ticketsByHour)}:00`,
                inline: true
            }
        );

        const topCategories = Object.entries(data.categoryStats)
            .sort(([, a], [, b]) => b.total - a.total)
            .slice(0, 3)
            .map(([category, stats]) => `**${category}:** ${stats.total} (${stats.closed} zamkniętych)`)
            .join("\n");

        if (topCategories) {
            embed.addFields({
                name: "🏆 Najpopularniejsze Kategorie",
                value: topCategories,
                inline: false
            });
        }

        const topStaff = Object.values(data.staffStats)
            .sort((a, b) => b.ticketsAssigned - a.ticketsAssigned)
            .slice(0, 3)
            .map(staff => `**${staff.username}:** ${staff.ticketsAssigned} ticketów (${Math.round(staff.avgRating * 100) / 100}⭐)`)
            .join("\n");

        if (topStaff) {
            embed.addFields({
                name: "👑 Najaktywniejszy Personel",
                value: topStaff,
                inline: false
            });
        }

        return embed;
    },

    async generateReportFile(data, format, period, guildName) {
        switch (format) {
            case "detailed":
                return {
                    content: await this.generateDetailedHTML(data, period, guildName),
                    fileName: `ticket-report-${period}-${Date.now()}.html`,
                    contentType: "text/html"
                };

            case "csv":
                return {
                    content: await this.generateCSV(data),
                    fileName: `ticket-data-${period}-${Date.now()}.csv`,
                    contentType: "text/csv"
                };

            case "json":
                return {
                    content: JSON.stringify(data, null, 2),
                    fileName: `ticket-report-${period}-${Date.now()}.json`,
                    contentType: "application/json"
                };

            default:
                throw new Error("Nieobsługiwany format raportu");
        }
    },

    async generateDetailedHTML(data, period, guildName) {
        return `<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Raport Systemu Ticketów - ${guildName}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #3498db; padding-bottom: 20px; margin-bottom: 30px; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #3498db; }
        .stat-number { font-size: 2em; font-weight: bold; color: #2c3e50; }
        .stat-label { color: #7f8c8d; margin-top: 5px; }
        .chart-container { margin: 20px 0; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #3498db; color: white; }
        .rating-stars { color: #f39c12; }
        .priority-critical { color: #e74c3c; font-weight: bold; }
        .priority-high { color: #e67e22; }
        .priority-medium { color: #f39c12; }
        .priority-low { color: #27ae60; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Szczegółowy Raport Systemu Ticketów</h1>
            <h2>${guildName}</h2>
            <p>Okres: ${this.getPeriodName(period)} | Wygenerowany: ${new Date().toLocaleString('pl-PL')}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number">${data.totalTickets}</div>
                <div class="stat-label">Wszystkie Tickety</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${data.closedTickets}</div>
                <div class="stat-label">Zamknięte Tickety</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Math.round(data.ratingStats.averageRating * 100) / 100}</div>
                <div class="stat-label">Średnia Ocena</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${Math.round(data.ratingStats.recommendationRate * 100)}%</div>
                <div class="stat-label">Wskaźnik Rekomendacji</div>
            </div>
        </div>

        <h3>📋 Statystyki Kategorii</h3>
        <table>
            <thead>
                <tr>
                    <th>Kategoria</th>
                    <th>Wszystkie</th>
                    <th>Otwarte</th>
                    <th>Zamknięte</th>
                    <th>Wskaźnik Zamknięcia</th>
                    <th>Śr. Czas Rozwiązania</th>
                </tr>
            </thead>
            <tbody>
                ${Object.entries(data.categoryStats).map(([category, stats]) => `
                    <tr>
                        <td><strong>${category}</strong></td>
                        <td>${stats.total}</td>
                        <td>${stats.open}</td>
                        <td>${stats.closed}</td>
                        <td>${stats.total > 0 ? Math.round((stats.closed / stats.total) * 100) : 0}%</td>
                        <td>${this.formatDuration(stats.avgResolutionTime)}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h3>👥 Wydajność Personelu</h3>
        <table>
            <thead>
                <tr>
                    <th>Personel</th>
                    <th>Przypisane</th>
                    <th>Zamknięte</th>
                    <th>Wskaźnik Zamknięcia</th>
                    <th>Średnia Ocena</th>
                    <th>Liczba Ocen</th>
                </tr>
            </thead>
            <tbody>
                ${Object.values(data.staffStats).map(staff => `
                    <tr>
                        <td><strong>${staff.username}</strong></td>
                        <td>${staff.ticketsAssigned}</td>
                        <td>${staff.ticketsClosed}</td>
                        <td>${staff.ticketsAssigned > 0 ? Math.round((staff.ticketsClosed / staff.ticketsAssigned) * 100) : 0}%</td>
                        <td class="rating-stars">${Math.round(staff.avgRating * 100) / 100} ⭐</td>
                        <td>${staff.totalRatings}</td>
                    </tr>
                `).join('')}
            </tbody>
        </table>

        <h3>⭐ Rozkład Ocen</h3>
        <table>
            <thead>
                <tr>
                    <th>Ocena</th>
                    <th>Liczba</th>
                    <th>Procent</th>
                </tr>
            </thead>
            <tbody>
                ${[5, 4, 3, 2, 1].map(rating => {
            const count = data.ratingStats.ratingDistribution[rating];
            const percent = data.ratingStats.totalRatings > 0 ? Math.round((count / data.ratingStats.totalRatings) * 100) : 0;
            return `
                        <tr>
                            <td class="rating-stars">${rating} ⭐</td>
                            <td>${count}</td>
                            <td>${percent}%</td>
                        </tr>
                    `;
        }).join('')}
            </tbody>
        </table>

        <div style="text-align: center; margin-top: 40px; color: #7f8c8d;">
            <p>Raport wygenerowany przez System Ticketów</p>
            <p>${guildName} - ${new Date().toLocaleString('pl-PL')}</p>
        </div>
    </div>
</body>
</html>`;
    },

    async generateCSV(data) {
        let csv = "Typ,Kategoria,Priorytet,Status,Data_Utworzenia,Data_Zamkniecia,Czas_Rozwiazania_h,Uzytkownik,Przypisany_Do,Ocena\n";

        data.tickets.forEach(ticket => {
            const resolutionTime = ticket.closedBy && ticket.closedBy.closedAt ?
                Math.round((ticket.closedBy.closedAt - ticket.createdAt) / (1000 * 60 * 60)) : '';

            const rating = ticket.rating ? ticket.rating.score : '';

            csv += `Ticket,${ticket.category},${ticket.priority},${ticket.status},${ticket.createdAt.toISOString()},${ticket.closedBy ? ticket.closedBy.closedAt.toISOString() : ''},${resolutionTime},${ticket.username},${ticket.assignedTo ? ticket.assignedTo.username : ''},${rating}\n`;
        });

        return csv;
    },

    getPeriodName(period) {
        const names = {
            week: "Ostatnie 7 dni",
            month: "Ostatnie 30 dni",
            quarter: "Ostatnie 90 dni",
            all: "Wszystkie dane"
        };
        return names[period] || period;
    },

    getMostActiveHour(hourlyData) {
        let maxHour = 0;
        let maxCount = 0;

        hourlyData.forEach((count, hour) => {
            if (count > maxCount) {
                maxCount = count;
                maxHour = hour;
            }
        });

        return maxHour;
    },

    formatDuration(milliseconds) {
        if (!milliseconds) return "N/A";

        const hours = Math.floor(milliseconds / (1000 * 60 * 60));
        const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
            const days = Math.floor(hours / 24);
            const remainingHours = hours % 24;
            return `${days}d ${remainingHours}h`;
        }

        return `${hours}h ${minutes}m`;
    }
};