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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket-config")
    .setDescription("Zarządza konfiguracją systemu ticketów.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("view")
        .setDescription("Wyświetla aktualną konfigurację systemu ticketów.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("auto-close")
        .setDescription("Konfiguruje automatyczne zamykanie ticketów.")
        .addBooleanOption((option) =>
          option
            .setName("enabled")
            .setDescription("Włącz/wyłącz automatyczne zamykanie.")
            .setRequired(true)
        )
        .addIntegerOption((option) =>
          option
            .setName("inactive-hours")
            .setDescription("Po ilu godzinach nieaktywności zamknąć ticket.")
            .setMinValue(1)
            .setMaxValue(168)
            .setRequired(false)
        )
        .addIntegerOption((option) =>
          option
            .setName("warning-hours")
            .setDescription("Po ilu godzinach wysłać ostrzeżenie.")
            .setMinValue(1)
            .setMaxValue(168)
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("notifications")
        .setDescription("Konfiguruje powiadomienia dla personelu.")
        .addBooleanOption((option) =>
          option
            .setName("new-ticket")
            .setDescription("Powiadomienia o nowych ticketach.")
            .setRequired(false)
        )
        .addBooleanOption((option) =>
          option
            .setName("ticket-assigned")
            .setDescription("Powiadomienia o przypisanych ticketach.")
            .setRequired(false)
        )
        .addBooleanOption((option) =>
          option
            .setName("ticket-closed")
            .setDescription("Powiadomienia o zamkniętych ticketach.")
            .setRequired(false)
        )
        .addBooleanOption((option) =>
          option
            .setName("inactive-warning")
            .setDescription("Powiadomienia o nieaktywnych ticketach.")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("limits")
        .setDescription("Konfiguruje limity systemu ticketów.")
        .addIntegerOption((option) =>
          option
            .setName("max-tickets-per-user")
            .setDescription("Maksymalna liczba otwartych ticketów na użytkownika.")
            .setMinValue(1)
            .setMaxValue(10)
            .setRequired(false)
        )
        .addBooleanOption((option) =>
          option
            .setName("require-reason")
            .setDescription("Wymagaj podania powodu przy zamykaniu ticketów.")
            .setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("roles")
        .setDescription("Zarządza rolami personelu.")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Typ roli personelu.")
            .setRequired(true)
            .addChoices(
              { name: "Administrator", value: "admin" },
              { name: "Moderator", value: "moderator" },
              { name: "Wsparcie", value: "support" }
            )
        )
        .addStringOption((option) =>
          option
            .setName("action")
            .setDescription("Akcja do wykonania.")
            .setRequired(true)
            .addChoices(
              { name: "Dodaj rolę", value: "add" },
              { name: "Usuń rolę", value: "remove" },
              { name: "Wyczyść wszystkie", value: "clear" }
            )
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Rola do dodania/usunięcia (wymagana dla add/remove).")
            .setRequired(false)
        )
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    try {
      let config = await TicketConfig.findOne({ guildId: interaction.guildId });
      if (!config) {
        return interaction.editReply("❌ System ticketów nie jest skonfigurowany na tym serwerze. Użyj `/setup-tickets` aby go skonfigurować.");
      }

      switch (subcommand) {
        case "view":
          await this.handleViewConfig(interaction, config);
          break;
        case "auto-close":
          await this.handleAutoCloseConfig(interaction, config);
          break;
        case "notifications":
          await this.handleNotificationsConfig(interaction, config);
          break;
        case "limits":
          await this.handleLimitsConfig(interaction, config);
          break;
        case "roles":
          await this.handleRolesConfig(interaction, config);
          break;
      }

    } catch (error) {
      console.error("Błąd podczas zarządzania konfiguracją ticketów:", error);
      await interaction.editReply("❌ Wystąpił błąd podczas zarządzania konfiguracją.");
    }
  },

  async handleViewConfig(interaction, config) {
    const embed = new EmbedBuilder()
      .setTitle("⚙️ Konfiguracja Systemu Ticketów")
      .setColor("#3498db")
      .setTimestamp()
      .setFooter({ text: interaction.guild.name });

    // Podstawowe ustawienia
    embed.addFields(
      {
        name: "📁 Kanały",
        value: 
          `**Kategoria:** <#${config.ticketsCategoryId}>\n` +
          `**Panel:** <#${config.panelChannelId}>\n` +
          `**Transkrypty:** ${config.transcriptChannelId ? `<#${config.transcriptChannelId}>` : "Nie ustawiono"}`,
        inline: true
      },
      {
        name: "👥 Role Personelu",
        value: 
          `**Administratorzy:** ${config.staffRoles.admin.length > 0 ? config.staffRoles.admin.map(id => `<@&${id}>`).join(", ") : "Brak"}\n` +
          `**Moderatorzy:** ${config.staffRoles.moderator.length > 0 ? config.staffRoles.moderator.map(id => `<@&${id}>`).join(", ") : "Brak"}\n` +
          `**Wsparcie:** ${config.staffRoles.support.length > 0 ? config.staffRoles.support.map(id => `<@&${id}>`).join(", ") : "Brak"}`,
        inline: true
      },
      {
        name: "📊 Limity",
        value: 
          `**Max ticketów/użytkownik:** ${config.maxTicketsPerUser}\n` +
          `**Wymagaj powodu:** ${config.requireReason ? "Tak" : "Nie"}\n` +
          `**Licznik ticketów:** ${config.ticketCount}`,
        inline: true
      }
    );

    // Auto-close
    embed.addFields({
      name: "🤖 Automatyczne Zamykanie",
      value: 
        `**Włączone:** ${config.autoClose.enabled ? "Tak" : "Nie"}\n` +
        `**Nieaktywność:** ${config.autoClose.inactiveHours}h\n` +
        `**Ostrzeżenie:** ${config.autoClose.warningHours}h`,
      inline: true
    });

    // Powiadomienia
    embed.addFields({
      name: "🔔 Powiadomienia",
      value: 
        `**Nowe tickety:** ${config.notifications.newTicket ? "Tak" : "Nie"}\n` +
        `**Przypisania:** ${config.notifications.ticketAssigned ? "Tak" : "Nie"}\n` +
        `**Zamknięcia:** ${config.notifications.ticketClosed ? "Tak" : "Nie"}\n` +
        `**Ostrzeżenia:** ${config.notifications.inactiveWarning ? "Tak" : "Nie"}`,
      inline: true
    });

    // Kategorie
    if (config.categories && config.categories.length > 0) {
      const categoriesText = config.categories
        .map(cat => `${cat.emoji} **${cat.name}** - ${cat.description}`)
        .join("\n");

      embed.addFields({
        name: "📋 Kategorie Ticketów",
        value: categoriesText.length > 1024 ? categoriesText.substring(0, 1021) + "..." : categoriesText,
        inline: false
      });
    }

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("ticket_config_edit")
        .setLabel("Edytuj Konfigurację")
        .setStyle(ButtonStyle.Primary)
        .setEmoji("✏️"),
      new ButtonBuilder()
        .setCustomId("ticket_config_reset")
        .setLabel("Resetuj Ustawienia")
        .setStyle(ButtonStyle.Danger)
        .setEmoji("🔄")
    );

    await interaction.editReply({ 
      embeds: [embed],
      components: [buttons]
    });
  },

  async handleAutoCloseConfig(interaction, config) {
    const enabled = interaction.options.getBoolean("enabled");
    const inactiveHours = interaction.options.getInteger("inactive-hours");
    const warningHours = interaction.options.getInteger("warning-hours");

    config.autoClose.enabled = enabled;
    
    if (inactiveHours !== null) {
      config.autoClose.inactiveHours = inactiveHours;
    }
    
    if (warningHours !== null) {
      config.autoClose.warningHours = warningHours;
    }

    // Walidacja: ostrzeżenie musi być wcześniej niż zamknięcie
    if (config.autoClose.warningHours >= config.autoClose.inactiveHours) {
      config.autoClose.warningHours = Math.floor(config.autoClose.inactiveHours / 2);
    }

    await config.save();

    const embed = new EmbedBuilder()
      .setTitle("✅ Automatyczne Zamykanie Skonfigurowane")
      .setDescription(
        `**Status:** ${enabled ? "Włączone" : "Wyłączone"}\n` +
        `**Zamknięcie po:** ${config.autoClose.inactiveHours} godzinach nieaktywności\n` +
        `**Ostrzeżenie po:** ${config.autoClose.warningHours} godzinach nieaktywności\n\n` +
        `${enabled ? "🤖 System będzie automatycznie zamykał nieaktywne tickety." : "⏸️ Automatyczne zamykanie zostało wyłączone."}`
      )
      .setColor(enabled ? "#27ae60" : "#95a5a6")
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },

  async handleNotificationsConfig(interaction, config) {
    const newTicket = interaction.options.getBoolean("new-ticket");
    const ticketAssigned = interaction.options.getBoolean("ticket-assigned");
    const ticketClosed = interaction.options.getBoolean("ticket-closed");
    const inactiveWarning = interaction.options.getBoolean("inactive-warning");

    let changes = [];

    if (newTicket !== null) {
      config.notifications.newTicket = newTicket;
      changes.push(`Nowe tickety: ${newTicket ? "Włączone" : "Wyłączone"}`);
    }

    if (ticketAssigned !== null) {
      config.notifications.ticketAssigned = ticketAssigned;
      changes.push(`Przypisania: ${ticketAssigned ? "Włączone" : "Wyłączone"}`);
    }

    if (ticketClosed !== null) {
      config.notifications.ticketClosed = ticketClosed;
      changes.push(`Zamknięcia: ${ticketClosed ? "Włączone" : "Wyłączone"}`);
    }

    if (inactiveWarning !== null) {
      config.notifications.inactiveWarning = inactiveWarning;
      changes.push(`Ostrzeżenia: ${inactiveWarning ? "Włączone" : "Wyłączone"}`);
    }

    if (changes.length === 0) {
      return interaction.editReply("❌ Nie podano żadnych zmian do wykonania.");
    }

    await config.save();

    const embed = new EmbedBuilder()
      .setTitle("✅ Powiadomienia Skonfigurowane")
      .setDescription(
        `Zaktualizowano następujące ustawienia powiadomień:\n\n` +
        changes.map(change => `• ${change}`).join("\n") +
        `\n\n📱 Powiadomienia będą wysyłane na prywatne wiadomości członków personelu.`
      )
      .setColor("#27ae60")
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },

  async handleLimitsConfig(interaction, config) {
    const maxTicketsPerUser = interaction.options.getInteger("max-tickets-per-user");
    const requireReason = interaction.options.getBoolean("require-reason");

    let changes = [];

    if (maxTicketsPerUser !== null) {
      config.maxTicketsPerUser = maxTicketsPerUser;
      changes.push(`Maksymalne tickety na użytkownika: ${maxTicketsPerUser}`);
    }

    if (requireReason !== null) {
      config.requireReason = requireReason;
      changes.push(`Wymagaj powodu przy zamykaniu: ${requireReason ? "Tak" : "Nie"}`);
    }

    if (changes.length === 0) {
      return interaction.editReply("❌ Nie podano żadnych zmian do wykonania.");
    }

    await config.save();

    const embed = new EmbedBuilder()
      .setTitle("✅ Limity Skonfigurowane")
      .setDescription(
        `Zaktualizowano następujące ustawienia limitów:\n\n` +
        changes.map(change => `• ${change}`).join("\n")
      )
      .setColor("#27ae60")
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },

  async handleRolesConfig(interaction, config) {
    const type = interaction.options.getString("type");
    const action = interaction.options.getString("action");
    const role = interaction.options.getRole("role");

    if ((action === "add" || action === "remove") && !role) {
      return interaction.editReply("❌ Musisz podać rolę dla tej akcji.");
    }

    let changes = [];

    switch (action) {
      case "add":
        if (!config.staffRoles[type].includes(role.id)) {
          config.staffRoles[type].push(role.id);
          changes.push(`Dodano rolę ${role} do ${this.getRoleTypeName(type)}`);
        } else {
          return interaction.editReply(`❌ Rola ${role} już jest przypisana do ${this.getRoleTypeName(type)}.`);
        }
        break;

      case "remove":
        const index = config.staffRoles[type].indexOf(role.id);
        if (index > -1) {
          config.staffRoles[type].splice(index, 1);
          changes.push(`Usunięto rolę ${role} z ${this.getRoleTypeName(type)}`);
        } else {
          return interaction.editReply(`❌ Rola ${role} nie jest przypisana do ${this.getRoleTypeName(type)}.`);
        }
        break;

      case "clear":
        const removedCount = config.staffRoles[type].length;
        config.staffRoles[type] = [];
        changes.push(`Usunięto wszystkie role (${removedCount}) z ${this.getRoleTypeName(type)}`);
        break;
    }

    await config.save();

    const embed = new EmbedBuilder()
      .setTitle("✅ Role Personelu Zaktualizowane")
      .setDescription(
        changes.join("\n") + 
        `\n\n**Aktualne role ${this.getRoleTypeName(type)}:**\n` +
        (config.staffRoles[type].length > 0 ? 
          config.staffRoles[type].map(id => `<@&${id}>`).join(", ") : 
          "Brak przypisanych ról")
      )
      .setColor("#27ae60")
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },

  getRoleTypeName(type) {
    const names = {
      admin: "Administratorów",
      moderator: "Moderatorów", 
      support: "Wsparcia"
    };
    return names[type] || type;
  }
};