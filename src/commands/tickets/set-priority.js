const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const TicketConfig = require("../../models/tickets/TicketConfig");
const Ticket = require("../../models/tickets/Ticket");
const TicketMessage = require("../../models/tickets/TicketMessage");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("set-priority")
    .setDescription("Zmienia priorytet ticketu.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((option) =>
      option
        .setName("priority")
        .setDescription("Nowy priorytet ticketu.")
        .setRequired(true)
        .addChoices(
          { name: "🟢 Niski", value: "low" },
          { name: "🟡 Średni", value: "medium" },
          { name: "🟠 Wysoki", value: "high" },
          { name: "🔴 Krytyczny", value: "critical" }
        )
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Powód zmiany priorytetu (opcjonalnie).")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const newPriority = interaction.options.getString("priority");
    const reason = interaction.options.getString("reason") || "Brak podanego powodu";

    try {
      const config = await TicketConfig.findOne({ guildId: interaction.guildId });
      if (!config) {
        return interaction.editReply("❌ System ticketów nie jest skonfigurowany na tym serwerze.");
      }

      const ticket = await Ticket.findOne({ 
        guildId: interaction.guildId, 
        channelId: interaction.channelId 
      });

      if (!ticket) {
        return interaction.editReply("❌ Ta komenda może być używana tylko w kanale ticketu.");
      }

      // Sprawdź uprawnienia
      const memberRoles = interaction.member.roles.cache.map(role => role.id);
      if (!config.hasPermission(interaction.user.id, memberRoles, 'moderate')) {
        return interaction.editReply("❌ Nie masz uprawnień do zmiany priorytetu ticketów.");
      }

      const oldPriority = ticket.priority;

      if (oldPriority === newPriority) {
        return interaction.editReply(`❌ Ticket już ma priorytet **${newPriority}**.`);
      }

      // Zaktualizuj priorytet
      ticket.priority = newPriority;
      ticket.lastActivity = new Date();
      await ticket.save();

      // Zapisz wiadomość systemową
      const systemMessage = new TicketMessage({
        ticketId: ticket.ticketId,
        messageId: `system_${Date.now()}`,
        channelId: interaction.channelId,
        userId: interaction.client.user.id,
        username: "System",
        content: `Priorytet ticketu zmieniony z ${oldPriority} na ${newPriority} przez ${interaction.user.username}. Powód: ${reason}`,
        isSystem: true,
      });

      await systemMessage.save();

      // Emojis dla priorytetów
      const priorityEmojis = {
        low: "🟢",
        medium: "🟡",
        high: "🟠",
        critical: "🔴"
      };

      const priorityNames = {
        low: "Niski",
        medium: "Średni", 
        high: "Wysoki",
        critical: "Krytyczny"
      };

      const priorityColors = {
        low: "#27ae60",
        medium: "#f39c12",
        high: "#e67e22",
        critical: "#e74c3c"
      };

      // Utwórz embed z informacją o zmianie
      const priorityEmbed = new EmbedBuilder()
        .setTitle("⚡ Priorytet Ticketu Zmieniony")
        .setDescription(
          `**Ticket:** #${ticket.ticketId.split('-')[1]}\n` +
          `**Poprzedni priorytet:** ${priorityEmojis[oldPriority]} ${priorityNames[oldPriority]}\n` +
          `**Nowy priorytet:** ${priorityEmojis[newPriority]} ${priorityNames[newPriority]}\n` +
          `**Zmieniony przez:** ${interaction.user}\n` +
          `**Powód:** ${reason}\n` +
          `**Data:** <t:${Math.floor(Date.now() / 1000)}:F>`
        )
        .setColor(priorityColors[newPriority])
        .setTimestamp();

      await interaction.editReply({ embeds: [priorityEmbed] });

      // Wyślij powiadomienie do przypisanego personelu (jeśli istnieje)
      if (ticket.assignedTo && ticket.assignedTo.userId) {
        try {
          const assignedMember = await interaction.guild.members.fetch(ticket.assignedTo.userId);
          
          const dmEmbed = new EmbedBuilder()
            .setTitle("⚡ Priorytet Ticketu Zmieniony")
            .setDescription(
              `Priorytet ticketu, który masz przypisany został zmieniony na serwerze **${interaction.guild.name}**.\n\n` +
              `**Ticket:** #${ticket.ticketId.split('-')[1]}\n` +
              `**Nowy priorytet:** ${priorityEmojis[newPriority]} ${priorityNames[newPriority]}\n` +
              `**Tytuł:** ${ticket.title}\n` +
              `**Powód zmiany:** ${reason}\n` +
              `**Zmieniony przez:** ${interaction.user.username}\n\n` +
              `[Przejdź do ticketu](https://discord.com/channels/${interaction.guildId}/${interaction.channelId})`
            )
            .setColor(priorityColors[newPriority])
            .setTimestamp()
            .setFooter({ text: `${interaction.guild.name} | System Ticketów` });

          await assignedMember.send({ embeds: [dmEmbed] });
        } catch (error) {
          console.log(`Nie udało się wysłać powiadomienia o zmianie priorytetu:`, error.message);
        }
      }

      // Jeśli priorytet został podniesiony do krytycznego, powiadom wszystkich adminów
      if (newPriority === 'critical' && oldPriority !== 'critical') {
        const adminRoles = config.staffRoles.admin;
        
        for (const roleId of adminRoles) {
          try {
            const role = await interaction.guild.roles.fetch(roleId);
            if (!role) continue;

            for (const [userId, member] of role.members) {
              try {
                const criticalEmbed = new EmbedBuilder()
                  .setTitle("🚨 KRYTYCZNY PRIORYTET TICKETU")
                  .setDescription(
                    `Ticket został oznaczony jako **KRYTYCZNY** na serwerze **${interaction.guild.name}**!\n\n` +
                    `**Ticket:** #${ticket.ticketId.split('-')[1]}\n` +
                    `**Użytkownik:** ${ticket.username}\n` +
                    `**Tytuł:** ${ticket.title}\n` +
                    `**Kategoria:** ${ticket.category}\n` +
                    `**Przypisany do:** ${ticket.assignedTo ? `<@${ticket.assignedTo.userId}>` : "Nikt"}\n` +
                    `**Powód zmiany:** ${reason}\n\n` +
                    `[Przejdź do ticketu](https://discord.com/channels/${interaction.guildId}/${interaction.channelId})`
                  )
                  .setColor("#e74c3c")
                  .setTimestamp()
                  .setFooter({ text: `${interaction.guild.name} | ALERT KRYTYCZNY` });

                await member.send({ embeds: [criticalEmbed] });
              } catch (error) {
                // Ignoruj błędy DM
              }
            }
          } catch (error) {
            console.error(`Błąd podczas wysyłania alertu krytycznego dla roli ${roleId}:`, error);
          }
        }
      }

    } catch (error) {
      console.error("Błąd podczas zmiany priorytetu ticketu:", error);
      await interaction.editReply("❌ Wystąpił błąd podczas zmiany priorytetu ticketu.");
    }
  },
};