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
const TicketRating = require("../../models/tickets/TicketRating");
const TicketStats = require("../../models/tickets/TicketStats");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-stats")
    .setDescription("Wyświetla statystyki systemu ticketów.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((option) =>
      option
        .setName("period")
        .setDescription("Okres statystyk")
        .addChoices(
          { name: "Dziś", value: "today" },
          { name: "Ostatnie 7 dni", value: "week" },
          { name: "Ostatnie 30 dni", value: "month" },
          { name: "Wszystkie", value: "all" }
        )
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName("staff-member")
        .setDescription("Statystyki konkretnego członka personelu")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const period = interaction.options.getString("period") || "week";
    const staffMember = interaction.options.getUser("staff-member");

    try {
      const config = await TicketConfig.findOne({ guildId: interaction.guildId });
      if (!config) {
        return interaction.editReply("❌ System ticketów nie jest skonfigurowany na tym serwerze.");
      }

      // Sprawdź uprawnienia
      const memberRoles = interaction.member.roles.cache.map(role => role.id);
      if (!config.hasPermission(interaction.user.id, memberRoles, 'moderate')) {
        return interaction.editReply("❌ Nie masz uprawnień do przeglądania statystyk ticketów.");
      }

      // Oblicz daty
      let startDate = new Date();
      let endDate = new Date();
      
      switch (period) {
        case "today":
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);
          break;
        case "week":
          startDate.setDate(startDate.getDate() - 7);
          break;
        case "month":
          startDate.setDate(startDate.getDate() - 30);
          break;
        case "all":
          startDate = new Date(0);
          break;
      }

      if (staffMember) {
        // Statystyki konkretnego członka personelu
        const staffStats = await getStaffMemberStats(staffMember.id, interaction.guildId, startDate, endDate);
        const embed = createStaffStatsEmbed(staffMember, staffStats, period);
        return interaction.editReply({ embeds: [embed] });
      }

      // Ogólne statystyki serwera
      const generalStats = await getGeneralStats(interaction.guildId, startDate, endDate);
      const topPerformers = await getTopPerformers(interaction.guildId, startDate, endDate);
      
      const embed = createGeneralStatsEmbed(generalStats, topPerformers, period, interaction.guild.name);
      
      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_stats_detailed_${period}`)
          .setLabel("Szczegółowe statystyki")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("📊"),
        new ButtonBuilder()
          .setCustomId(`ticket_stats_export_${period}`)
          .setLabel("Eksportuj dane")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("📁")
      );

      await interaction.editReply({ 
        embeds: [embed],
        components: [buttons]
      });

    } catch (error) {
      console.error("Błąd podczas pobierania statystyk:", error);
      await interaction.editReply("❌ Wystąpił błąd podczas pobierania statystyk ticketów.");
    }
  },
};

async function getGeneralStats(guildId, startDate, endDate) {
  const tickets = await Ticket.find({
    guildId,
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const closedTickets = tickets.filter(t => t.status === 'closed');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved');
  
  const ratings = await TicketRating.find({
    guildId,
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const averageRating = ratings.length > 0 ? 
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;

  const averageResolutionTime = closedTickets.length > 0 ?
    closedTickets.reduce((sum, t) => {
      if (t.closedBy && t.closedBy.closedAt) {
        return sum + (t.closedBy.closedAt - t.createdAt);
      }
      return sum;
    }, 0) / closedTickets.length : 0;

  const categoryBreakdown = {};
  const priorityBreakdown = {};

  tickets.forEach(ticket => {
    categoryBreakdown[ticket.category] = (categoryBreakdown[ticket.category] || 0) + 1;
    priorityBreakdown[ticket.priority] = (priorityBreakdown[ticket.priority] || 0) + 1;
  });

  return {
    totalTickets: tickets.length,
    openTickets: tickets.filter(t => ['open', 'assigned', 'pending'].includes(t.status)).length,
    closedTickets: closedTickets.length,
    resolvedTickets: resolvedTickets.length,
    averageRating: Math.round(averageRating * 100) / 100,
    averageResolutionTime: Math.round(averageResolutionTime / (1000 * 60 * 60)), // w godzinach
    categoryBreakdown,
    priorityBreakdown,
    totalRatings: ratings.length,
  };
}

async function getStaffMemberStats(staffId, guildId, startDate, endDate) {
  const assignedTickets = await Ticket.find({
    guildId,
    'assignedTo.userId': staffId,
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const ratings = await TicketRating.find({
    guildId,
    staffId,
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const averageRating = ratings.length > 0 ? 
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length : 0;

  return {
    assignedTickets: assignedTickets.length,
    closedTickets: assignedTickets.filter(t => t.status === 'closed').length,
    resolvedTickets: assignedTickets.filter(t => t.status === 'resolved').length,
    averageRating: Math.round(averageRating * 100) / 100,
    totalRatings: ratings.length,
    recentFeedback: ratings
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 3)
      .map(r => ({
        rating: r.rating,
        feedback: r.feedback,
        date: r.createdAt,
      })),
  };
}

async function getTopPerformers(guildId, startDate, endDate) {
  const tickets = await Ticket.find({
    guildId,
    'assignedTo.userId': { $exists: true },
    createdAt: { $gte: startDate, $lte: endDate }
  });

  const staffStats = {};
  
  for (const ticket of tickets) {
    if (ticket.assignedTo && ticket.assignedTo.userId) {
      const staffId = ticket.assignedTo.userId;
      if (!staffStats[staffId]) {
        staffStats[staffId] = {
          userId: staffId,
          username: ticket.assignedTo.username,
          ticketsHandled: 0,
          ticketsClosed: 0,
          averageRating: 0,
          totalRatings: 0,
        };
      }
      
      staffStats[staffId].ticketsHandled++;
      if (ticket.status === 'closed' || ticket.status === 'resolved') {
        staffStats[staffId].ticketsClosed++;
      }
    }
  }

  // Dodaj oceny
  for (const staffId in staffStats) {
    const ratings = await TicketRating.find({
      guildId,
      staffId,
      createdAt: { $gte: startDate, $lte: endDate }
    });
    
    if (ratings.length > 0) {
      staffStats[staffId].averageRating = 
        Math.round((ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length) * 100) / 100;
      staffStats[staffId].totalRatings = ratings.length;
    }
  }

  return Object.values(staffStats)
    .sort((a, b) => b.ticketsHandled - a.ticketsHandled)
    .slice(0, 5);
}

function createGeneralStatsEmbed(stats, topPerformers, period, guildName) {
  const periodNames = {
    today: "Dzisiaj",
    week: "Ostatnie 7 dni",
    month: "Ostatnie 30 dni",
    all: "Wszystkie czasy"
  };

  const embed = new EmbedBuilder()
    .setTitle(`📊 Statystyki Ticketów - ${periodNames[period]}`)
    .setColor("#3498db")
    .setTimestamp()
    .setFooter({ text: guildName });

  // Główne statystyki
  embed.addFields(
    {
      name: "📈 Ogólne Statystyki",
      value: 
        `**Wszystkie tickety:** ${stats.totalTickets}\n` +
        `**Otwarte:** ${stats.openTickets}\n` +
        `**Zamknięte:** ${stats.closedTickets}\n` +
        `**Rozwiązane:** ${stats.resolvedTickets}\n` +
        `**Średni czas rozwiązania:** ${stats.averageResolutionTime}h`,
      inline: true
    },
    {
      name: "⭐ Oceny",
      value: 
        `**Średnia ocena:** ${stats.averageRating}/5\n` +
        `**Liczba ocen:** ${stats.totalRatings}\n` +
        `**Wskaźnik zadowolenia:** ${stats.averageRating >= 4 ? "Wysoki" : stats.averageRating >= 3 ? "Średni" : "Niski"}`,
      inline: true
    }
  );

  // Breakdown kategorii
  if (Object.keys(stats.categoryBreakdown).length > 0) {
    const categoryText = Object.entries(stats.categoryBreakdown)
      .map(([category, count]) => {
        const categoryNames = {
          support: "🔧 Wsparcie",
          report: "⚠️ Zgłoszenia",
          question: "❓ Pytania",
          other: "📝 Inne"
        };
        return `${categoryNames[category] || category}: ${count}`;
      })
      .join("\n");

    embed.addFields({
      name: "📋 Kategorie",
      value: categoryText,
      inline: true
    });
  }

  // Top performerzy
  if (topPerformers.length > 0) {
    const topPerformersText = topPerformers
      .slice(0, 3)
      .map((staff, index) => {
        const medals = ["🥇", "🥈", "🥉"];
        return `${medals[index]} ${staff.username}: ${staff.ticketsHandled} ticketów (${staff.averageRating}/5⭐)`;
      })
      .join("\n");

    embed.addFields({
      name: "🏆 Najlepsi Pracownicy",
      value: topPerformersText,
      inline: false
    });
  }

  return embed;
}

function createStaffStatsEmbed(staffMember, stats, period) {
  const periodNames = {
    today: "Dzisiaj",
    week: "Ostatnie 7 dni", 
    month: "Ostatnie 30 dni",
    all: "Wszystkie czasy"
  };

  const embed = new EmbedBuilder()
    .setTitle(`👤 Statystyki Pracownika - ${staffMember.username}`)
    .setDescription(`Okres: ${periodNames[period]}`)
    .setColor("#9b59b6")
    .setThumbnail(staffMember.displayAvatarURL())
    .setTimestamp();

  embed.addFields(
    {
      name: "📊 Wydajność",
      value: 
        `**Przypisane tickety:** ${stats.assignedTickets}\n` +
        `**Zamknięte tickety:** ${stats.closedTickets}\n` +
        `**Rozwiązane tickety:** ${stats.resolvedTickets}\n` +
        `**Wskaźnik zamknięcia:** ${stats.assignedTickets > 0 ? Math.round((stats.closedTickets / stats.assignedTickets) * 100) : 0}%`,
      inline: true
    },
    {
      name: "⭐ Oceny",
      value: 
        `**Średnia ocena:** ${stats.averageRating}/5\n` +
        `**Liczba ocen:** ${stats.totalRatings}\n` +
        `**Jakość obsługi:** ${stats.averageRating >= 4.5 ? "Doskonała" : stats.averageRating >= 4 ? "Bardzo dobra" : stats.averageRating >= 3 ? "Dobra" : "Do poprawy"}`,
      inline: true
    }
  );

  // Ostatnie opinie
  if (stats.recentFeedback && stats.recentFeedback.length > 0) {
    const feedbackText = stats.recentFeedback
      .map(feedback => {
        const date = new Date(feedback.date).toLocaleDateString('pl-PL');
        return `**${feedback.rating}/5** - ${feedback.feedback || "Brak komentarza"} *(${date})*`;
      })
      .join("\n\n");

    embed.addFields({
      name: "💬 Ostatnie Opinie",
      value: feedbackText.length > 1024 ? feedbackText.substring(0, 1021) + "..." : feedbackText,
      inline: false
    });
  }

  return embed;
}