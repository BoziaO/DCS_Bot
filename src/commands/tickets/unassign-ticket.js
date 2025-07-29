const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const TicketConfig = require("../../models/tickets/TicketConfig");
const Ticket = require("../../models/tickets/Ticket");
const TicketAssignment = require("../../models/tickets/TicketAssignment");
const TicketMessage = require("../../models/tickets/TicketMessage");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("unassign-ticket")
    .setDescription("Odprzypisuje ticket od członka personelu.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Powód odprzypisania (opcjonalnie).")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const reason = interaction.options.getString("reason") || "Brak podanego powodu";

    try {
      const config = await TicketConfig.findOne({ guildId: interaction.guildId });
      if (!config) {
        return interaction.editReply("❌ System ticketów nie jest skonfigurowany na tym serwerze.");
      }

      // Sprawdź czy komenda jest używana w kanale ticketu
      const ticket = await Ticket.findOne({ 
        guildId: interaction.guildId, 
        channelId: interaction.channelId 
      });

      if (!ticket) {
        return interaction.editReply("❌ Ta komenda może być używana tylko w kanale ticketu.");
      }

      // Sprawdź uprawnienia użytkownika
      const memberRoles = interaction.member.roles.cache.map(role => role.id);
      if (!config.hasPermission(interaction.user.id, memberRoles, 'moderate')) {
        return interaction.editReply("❌ Nie masz uprawnień do odprzypisywania ticketów.");
      }

      // Sprawdź czy ticket jest przypisany
      if (!ticket.assignedTo || !ticket.assignedTo.userId) {
        return interaction.editReply("❌ Ten ticket nie jest przypisany do żadnego członka personelu.");
      }

      const previousAssignee = ticket.assignedTo;

      // Odprzypisz ticket
      ticket.assignedTo = undefined;
      ticket.status = 'open';
      ticket.lastActivity = new Date();

      await ticket.save();

      // Zakończ aktywne przypisanie
      await TicketAssignment.findOneAndUpdate(
        { ticketId: ticket.ticketId, isActive: true },
        { 
          isActive: false,
          unassignedAt: new Date(),
          unassignedBy: interaction.user.id,
          reason: reason
        }
      );

      // Zapisz wiadomość systemową
      const systemMessage = new TicketMessage({
        ticketId: ticket.ticketId,
        messageId: `system_${Date.now()}`,
        channelId: interaction.channelId,
        userId: interaction.client.user.id,
        username: "System",
        content: `Ticket został odprzypisany od ${previousAssignee.username} przez ${interaction.user.username}. Powód: ${reason}`,
        isSystem: true,
      });

      await systemMessage.save();

      // Usuń specjalne uprawnienia dla poprzednio przypisanego użytkownika
      try {
        await interaction.channel.permissionOverwrites.delete(previousAssignee.userId);
      } catch (error) {
        console.log("Nie udało się usunąć uprawnień dla odprzypisanego użytkownika:", error.message);
      }

      // Utwórz embed z informacją o odprzypisaniu
      const unassignEmbed = new EmbedBuilder()
        .setTitle("✅ Ticket Odprzypisany")
        .setDescription(
          `**Ticket:** #${ticket.ticketId}\n` +
          `**Odprzypisany od:** <@${previousAssignee.userId}>\n` +
          `**Odprzypisany przez:** ${interaction.user}\n` +
          `**Powód:** ${reason}\n` +
          `**Data:** <t:${Math.floor(Date.now() / 1000)}:F>`
        )
        .setColor("#e67e22")
        .setTimestamp();

      await interaction.editReply({ embeds: [unassignEmbed] });

      // Wyślij powiadomienie do odprzypisanego pracownika (DM)
      try {
        const previousAssigneeMember = await interaction.guild.members.fetch(previousAssignee.userId);
        
        const dmEmbed = new EmbedBuilder()
          .setTitle("🎫 Ticket Odprzypisany")
          .setDescription(
            `Zostałeś odprzypisany od ticketu na serwerze **${interaction.guild.name}**.\n\n` +
            `**Ticket:** #${ticket.ticketId}\n` +
            `**Kategoria:** ${ticket.category}\n` +
            `**Priorytet:** ${ticket.priority}\n` +
            `**Użytkownik:** ${ticket.username}\n` +
            `**Tytuł:** ${ticket.title}\n` +
            `**Powód odprzypisania:** ${reason}\n` +
            `**Odprzypisany przez:** ${interaction.user.username}`
          )
          .setColor("#e67e22")
          .setTimestamp()
          .setFooter({ text: `${interaction.guild.name} | System Ticketów` });

        await previousAssigneeMember.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.log(`Nie udało się wysłać DM do ${previousAssignee.username}:`, error.message);
      }

      // Wyślij wiadomość w kanale ticketu
      const channelEmbed = new EmbedBuilder()
        .setDescription(
          `🔄 **Ticket został odprzypisany od <@${previousAssignee.userId}>**\n` +
          `Powód: ${reason}\n\n` +
          `Ticket jest teraz dostępny dla wszystkich członków personelu.`
        )
        .setColor("#f39c12")
        .setTimestamp();

      await interaction.followUp({ embeds: [channelEmbed] });

    } catch (error) {
      console.error("Błąd podczas odprzypisywania ticketu:", error);
      await interaction.editReply("❌ Wystąpił błąd podczas odprzypisywania ticketu.");
    }
  },
};