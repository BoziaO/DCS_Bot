const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const TicketConfig = require("../../models/tickets/TicketConfig");
const Ticket = require("../../models/tickets/Ticket");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-tickets")
    .setDescription("Wyświetla listę ticketów.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((option) =>
      option
        .setName("status")
        .setDescription("Filtruj według statusu.")
        .setRequired(false)
        .addChoices(
          { name: "Wszystkie", value: "all" },
          { name: "Otwarte", value: "open" },
          { name: "Przypisane", value: "assigned" },
          { name: "Oczekujące", value: "pending" },
          { name: "Rozwiązane", value: "resolved" },
          { name: "Zamknięte", value: "closed" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("category")
        .setDescription("Filtruj według kategorii.")
        .setRequired(false)
        .addChoices(
          { name: "Wszystkie", value: "all" },
          { name: "Wsparcie", value: "support" },
          { name: "Zgłoszenie", value: "report" },
          { name: "Pytanie", value: "question" },
          { name: "Inne", value: "other" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("priority")
        .setDescription("Filtruj według priorytetu.")
        .setRequired(false)
        .addChoices(
          { name: "Wszystkie", value: "all" },
          { name: "Krytyczny", value: "critical" },
          { name: "Wysoki", value: "high" },
          { name: "Średni", value: "medium" },
          { name: "Niski", value: "low" }
        )
    )
    .addUserOption((option) =>
      option
        .setName("user")
        .setDescription("Filtruj według użytkownika.")
        .setRequired(false)
    )
    .addUserOption((option) =>
      option
        .setName("assigned-to")
        .setDescription("Filtruj według przypisanego personelu.")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("limit")
        .setDescription("Maksymalna liczba wyników (domyślnie 10).")
        .setMinValue(1)
        .setMaxValue(25)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const status = interaction.options.getString("status") || "all";
    const category = interaction.options.getString("category") || "all";
    const priority = interaction.options.getString("priority") || "all";
    const user = interaction.options.getUser("user");
    const assignedTo = interaction.options.getUser("assigned-to");
    const limit = interaction.options.getInteger("limit") || 10;

    try {
      const config = await TicketConfig.findOne({ guildId: interaction.guildId });
      if (!config) {
        return interaction.editReply("❌ System ticketów nie jest skonfigurowany na tym serwerze.");
      }

      // Sprawdź uprawnienia
      const memberRoles = interaction.member.roles.cache.map(role => role.id);
      if (!config.isStaff(interaction.user.id, memberRoles)) {
        return interaction.editReply("❌ Nie masz uprawnień do przeglądania listy ticketów.");
      }

      // Zbuduj filtr
      const filter = { guildId: interaction.guildId };

      if (status !== "all") {
        filter.status = status;
      }

      if (category !== "all") {
        filter.category = category;
      }

      if (priority !== "all") {
        filter.priority = priority;
      }

      if (user) {
        filter.userId = user.id;
      }

      if (assignedTo) {
        filter['assignedTo.userId'] = assignedTo.id;
      }

      // Pobierz tickety
      const tickets = await Ticket.find(filter)
        .sort({ createdAt: -1 })
        .limit(limit);

      if (tickets.length === 0) {
        const noResultsEmbed = new EmbedBuilder()
          .setTitle("📋 Lista Ticketów")
          .setDescription("Nie znaleziono ticketów spełniających podane kryteria.")
          .setColor("#95a5a6")
          .setTimestamp();

        return interaction.editReply({ embeds: [noResultsEmbed] });
      }

      // Utwórz embed z listą
      const listEmbed = new EmbedBuilder()
        .setTitle("📋 Lista Ticketów")
        .setColor("#3498db")
        .setTimestamp()
        .setFooter({ 
          text: `${interaction.guild.name} | Wyświetlono ${tickets.length} z ${limit} możliwych` 
        });

      // Dodaj informacje o filtrach
      const filterInfo = [];
      if (status !== "all") filterInfo.push(`Status: ${status}`);
      if (category !== "all") filterInfo.push(`Kategoria: ${category}`);
      if (priority !== "all") filterInfo.push(`Priorytet: ${priority}`);
      if (user) filterInfo.push(`Użytkownik: ${user.username}`);
      if (assignedTo) filterInfo.push(`Przypisany do: ${assignedTo.username}`);

      if (filterInfo.length > 0) {
        listEmbed.setDescription(`**Aktywne filtry:** ${filterInfo.join(", ")}`);
      }

      // Emojis dla statusów i priorytetów
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

      // Podziel tickety na grupy po 5 dla lepszej czytelności
      const ticketGroups = [];
      for (let i = 0; i < tickets.length; i += 5) {
        ticketGroups.push(tickets.slice(i, i + 5));
      }

      ticketGroups.forEach((group, groupIndex) => {
        const ticketList = group.map(ticket => {
          const ticketNumber = ticket.ticketId.split('-')[1];
          const statusEmoji = statusEmojis[ticket.status] || "⚪";
          const priorityEmoji = priorityEmojis[ticket.priority] || "⚪";
          
          const assignedText = ticket.assignedTo ? 
            ` → <@${ticket.assignedTo.userId}>` : "";
          
          const timeAgo = Math.floor((Date.now() - ticket.createdAt) / (1000 * 60 * 60));
          const timeText = timeAgo < 1 ? "< 1h" : `${timeAgo}h`;
          
          return `${statusEmoji}${priorityEmoji} **#${ticketNumber}** - ${ticket.title.substring(0, 30)}${ticket.title.length > 30 ? "..." : ""}\n` +
                 `   👤 ${ticket.username} | 📅 ${timeText} temu${assignedText}`;
        }).join("\n\n");

        listEmbed.addFields({
          name: groupIndex === 0 ? "🎫 Tickety" : "\u200b",
          value: ticketList,
          inline: false
        });
      });

      // Dodaj statystyki
      const totalTickets = await Ticket.countDocuments({ guildId: interaction.guildId });
      const openTickets = await Ticket.countDocuments({ 
        guildId: interaction.guildId, 
        status: { $in: ['open', 'assigned', 'pending'] } 
      });

      listEmbed.addFields({
        name: "📊 Statystyki",
        value: `**Wszystkie tickety:** ${totalTickets}\n**Otwarte:** ${openTickets}\n**Zamknięte:** ${totalTickets - openTickets}`,
        inline: true
      });

      // Przyciski akcji
      const actionButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_list_refresh")
          .setLabel("Odśwież")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("🔄"),
        new ButtonBuilder()
          .setCustomId("ticket_list_export")
          .setLabel("Eksportuj")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("📁"),
        new ButtonBuilder()
          .setCustomId("ticket_list_stats")
          .setLabel("Szczegółowe Statystyki")
          .setStyle(ButtonStyle.Primary)
          .setEmoji("📊")
      );

      // Menu filtrów
      const filterMenu = new StringSelectMenuBuilder()
        .setCustomId("ticket_list_filter")
        .setPlaceholder("Zmień filtry...")
        .addOptions([
          {
            label: "Wszystkie tickety",
            description: "Pokaż wszystkie tickety",
            value: "filter_all",
            emoji: "📋"
          },
          {
            label: "Tylko otwarte",
            description: "Pokaż tylko otwarte tickety",
            value: "filter_open",
            emoji: "🟢"
          },
          {
            label: "Tylko przypisane",
            description: "Pokaż tylko przypisane tickety",
            value: "filter_assigned",
            emoji: "🟡"
          },
          {
            label: "Wysokie priorytety",
            description: "Pokaż tickety o wysokim/krytycznym priorytecie",
            value: "filter_high_priority",
            emoji: "🔴"
          },
          {
            label: "Moje tickety",
            description: "Pokaż tickety przypisane do Ciebie",
            value: "filter_my_tickets",
            emoji: "👤"
          }
        ]);

      const filterRow = new ActionRowBuilder().addComponents(filterMenu);

      await interaction.editReply({ 
        embeds: [listEmbed],
        components: [actionButtons, filterRow]
      });

    } catch (error) {
      console.error("Błąd podczas pobierania listy ticketów:", error);
      await interaction.editReply("❌ Wystąpił błąd podczas pobierania listy ticketów.");
    }
  },
};