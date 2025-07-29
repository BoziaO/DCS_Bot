const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const TicketConfig = require("../../models/tickets/TicketConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-tickets")
    .setDescription("Konfiguruje zaawansowany system ticketów na serwerze.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) =>
      option
        .setName("category")
        .setDescription("Kategoria, w której będą tworzone kanały ticketów.")
        .addChannelTypes(ChannelType.GuildCategory)
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("panel-channel")
        .setDescription("Kanał, na którym zostanie wysłany panel do tworzenia ticketów.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("transcript-channel")
        .setDescription("Kanał, na którym będą zapisywane transkrypty zamkniętych ticketów.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    )
    .addRoleOption((option) =>
      option
        .setName("admin-role")
        .setDescription("Rola administratorów (pełne uprawnienia).")
        .setRequired(true)
    )
    .addRoleOption((option) =>
      option
        .setName("moderator-role")
        .setDescription("Rola moderatorów (mogą zamykać i przypisywać tickety).")
        .setRequired(false)
    )
    .addRoleOption((option) =>
      option
        .setName("support-role")
        .setDescription("Rola podstawowego personelu (może odpowiadać na tickety).")
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("max-tickets")
        .setDescription("Maksymalna liczba otwartych ticketów na użytkownika (domyślnie 3).")
        .setMinValue(1)
        .setMaxValue(10)
        .setRequired(false)
    )
    .addIntegerOption((option) =>
      option
        .setName("auto-close-hours")
        .setDescription("Po ilu godzinach nieaktywności zamknąć ticket (domyślnie 48).")
        .setMinValue(1)
        .setMaxValue(168)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const category = interaction.options.getChannel("category");
    const panelChannel = interaction.options.getChannel("panel-channel");
    const transcriptChannel = interaction.options.getChannel("transcript-channel");
    const adminRole = interaction.options.getRole("admin-role");
    const moderatorRole = interaction.options.getRole("moderator-role");
    const supportRole = interaction.options.getRole("support-role");
    const maxTickets = interaction.options.getInteger("max-tickets") || 3;
    const autoCloseHours = interaction.options.getInteger("auto-close-hours") || 48;

    try {
      // Przygotuj role personelu
      const staffRoles = {
        admin: [adminRole.id],
        moderator: moderatorRole ? [moderatorRole.id] : [],
        support: supportRole ? [supportRole.id] : [],
      };

      // Domyślne kategorie ticketów
      const defaultCategories = [
        {
          id: "support",
          name: "Wsparcie Techniczne",
          description: "Problemy techniczne, błędy, pomoc z funkcjami",
          emoji: "🔧",
          color: "#3498db",
          assignedRoles: [...staffRoles.admin, ...staffRoles.moderator, ...staffRoles.support],
        },
        {
          id: "report",
          name: "Zgłoszenie",
          description: "Zgłaszanie naruszeń regulaminu, spam, inne problemy",
          emoji: "⚠️",
          color: "#e74c3c",
          assignedRoles: [...staffRoles.admin, ...staffRoles.moderator],
        },
        {
          id: "question",
          name: "Pytanie",
          description: "Ogólne pytania, informacje, wyjaśnienia",
          emoji: "❓",
          color: "#f39c12",
          assignedRoles: [...staffRoles.admin, ...staffRoles.moderator, ...staffRoles.support],
        },
        {
          id: "other",
          name: "Inne",
          description: "Inne sprawy nieujęte w powyższych kategoriach",
          emoji: "📝",
          color: "#9b59b6",
          assignedRoles: [...staffRoles.admin, ...staffRoles.moderator],
        },
      ];

      // Zapisz konfigurację
      await TicketConfig.findOneAndUpdate(
        { guildId: interaction.guildId },
        {
          ticketsCategoryId: category.id,
          panelChannelId: panelChannel.id,
          transcriptChannelId: transcriptChannel?.id,
          staffRoles,
          maxTicketsPerUser: maxTickets,
          autoClose: {
            enabled: true,
            inactiveHours: autoCloseHours,
            warningHours: Math.floor(autoCloseHours / 2),
          },
          categories: defaultCategories,
        },
        { upsert: true, new: true }
      );

      // Utwórz panel ticketów
      const ticketPanelEmbed = new EmbedBuilder()
        .setTitle("🎫 System Wsparcia i Zgłoszeń")
        .setDescription(
          "Potrzebujesz pomocy lub chcesz się z nami skontaktować?\n\n" +
          "**Wybierz odpowiednią kategorię poniżej:**\n" +
          "🔧 **Wsparcie Techniczne** - Problemy techniczne, błędy\n" +
          "⚠️ **Zgłoszenie** - Naruszenia regulaminu, spam\n" +
          "❓ **Pytanie** - Ogólne pytania i informacje\n" +
          "📝 **Inne** - Pozostałe sprawy\n\n" +
          `*Maksymalnie ${maxTickets} otwartych ticketów na użytkownika*`
        )
        .setColor("#2c3e50")
        .setFooter({ 
          text: `${interaction.guild.name} | Zaawansowany System Ticketów`,
          iconURL: interaction.guild.iconURL()
        })
        .setTimestamp();

      const categorySelect = new StringSelectMenuBuilder()
        .setCustomId("ticket_category_select")
        .setPlaceholder("Wybierz kategorię ticketu...")
        .addOptions(
          defaultCategories.map(cat => ({
            label: cat.name,
            description: cat.description,
            value: cat.id,
            emoji: cat.emoji,
          }))
        );

      const selectRow = new ActionRowBuilder().addComponents(categorySelect);

      const infoButton = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("ticket_info")
          .setLabel("Informacje o systemie")
          .setStyle(ButtonStyle.Secondary)
          .setEmoji("ℹ️")
      );

      await panelChannel.send({
        embeds: [ticketPanelEmbed],
        components: [selectRow, infoButton],
      });

      // Potwierdzenie konfiguracji
      const confirmEmbed = new EmbedBuilder()
        .setTitle("✅ System ticketów skonfigurowany!")
        .setDescription(
          `**Konfiguracja:**\n` +
          `📁 Kategoria: ${category}\n` +
          `📢 Panel: ${panelChannel}\n` +
          `📋 Transkrypty: ${transcriptChannel || "Nie ustawiono"}\n` +
          `👑 Administratorzy: ${adminRole}\n` +
          `🛡️ Moderatorzy: ${moderatorRole || "Nie ustawiono"}\n` +
          `🎧 Wsparcie: ${supportRole || "Nie ustawiono"}\n` +
          `📊 Max ticketów/użytkownik: ${maxTickets}\n` +
          `⏰ Auto-zamykanie: ${autoCloseHours}h nieaktywności`
        )
        .setColor("#27ae60")
        .setTimestamp();

      await interaction.editReply({
        embeds: [confirmEmbed],
      });

    } catch (error) {
      console.error("Błąd podczas konfiguracji ticketów:", error);
      await interaction.editReply({
        content: "❌ Wystąpił błąd podczas konfiguracji systemu ticketów. Sprawdź uprawnienia bota i spróbuj ponownie.",
      });
    }
  },
};