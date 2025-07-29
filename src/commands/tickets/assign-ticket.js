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
    .setName("assign-ticket")
    .setDescription("Przypisuje ticket do członka personelu.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addUserOption((option) =>
      option
        .setName("staff-member")
        .setDescription("Członek personelu, do którego ma zostać przypisany ticket.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Powód przypisania (opcjonalnie).")
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const staffMember = interaction.options.getUser("staff-member");
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
        return interaction.editReply("❌ Nie masz uprawnień do przypisywania ticketów.");
      }

      // Sprawdź czy przypisywany użytkownik jest członkiem personelu
      const staffMemberGuild = await interaction.guild.members.fetch(staffMember.id);
      const staffMemberRoles = staffMemberGuild.roles.cache.map(role => role.id);
      
      if (!config.isStaff(staffMember.id, staffMemberRoles)) {
        return interaction.editReply("❌ Wybrany użytkownik nie jest członkiem personelu.");
      }

      // Sprawdź czy ticket nie jest już przypisany
      if (ticket.assignedTo && ticket.assignedTo.userId) {
        return interaction.editReply(
          `❌ Ten ticket jest już przypisany do <@${ticket.assignedTo.userId}>. ` +
          `Użyj \`/unassign-ticket\` aby najpierw go odprzypisać.`
        );
      }

      // Sprawdź obciążenie pracownika
      const currentWorkload = await TicketAssignment.getUserWorkload(staffMember.id);
      const maxWorkload = 5; // Można to zrobić konfigurowalne

      if (currentWorkload >= maxWorkload) {
        return interaction.editReply(
          `⚠️ ${staffMember.username} ma już maksymalne obciążenie (${currentWorkload}/${maxWorkload} ticketów). ` +
          `Czy na pewno chcesz przypisać kolejny ticket?`
        );
      }

      // Przypisz ticket
      ticket.assignedTo = {
        userId: staffMember.id,
        username: staffMember.username,
        assignedAt: new Date(),
        assignedBy: interaction.user.id,
      };
      ticket.status = 'assigned';
      ticket.lastActivity = new Date();

      await ticket.save();

      // Utwórz rekord przypisania
      const assignment = new TicketAssignment({
        ticketId: ticket.ticketId,
        assignedTo: staffMember.id,
        assignedBy: interaction.user.id,
        reason: reason,
      });

      await assignment.save();

      // Zapisz wiadomość systemową
      const systemMessage = new TicketMessage({
        ticketId: ticket.ticketId,
        messageId: `system_${Date.now()}`,
        channelId: interaction.channelId,
        userId: interaction.client.user.id,
        username: "System",
        content: `Ticket został przypisany do ${staffMember.username} przez ${interaction.user.username}. Powód: ${reason}`,
        isSystem: true,
      });

      await systemMessage.save();

      // Aktualizuj uprawnienia kanału
      await interaction.channel.permissionOverwrites.edit(staffMember.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
        AttachFiles: true,
      });

      // Utwórz embed z informacją o przypisaniu
      const assignEmbed = new EmbedBuilder()
        .setTitle("✅ Ticket Przypisany")
        .setDescription(
          `**Ticket:** #${ticket.ticketId}\n` +
          `**Przypisany do:** ${staffMember}\n` +
          `**Przypisany przez:** ${interaction.user}\n` +
          `**Powód:** ${reason}\n` +
          `**Data:** <t:${Math.floor(Date.now() / 1000)}:F>`
        )
        .setColor("#27ae60")
        .setTimestamp();

      await interaction.editReply({ embeds: [assignEmbed] });

      // Wyślij powiadomienie do przypisanego pracownika (DM)
      try {
        const dmEmbed = new EmbedBuilder()
          .setTitle("🎫 Nowy Ticket Przypisany")
          .setDescription(
            `Zostałeś przypisany do nowego ticketu na serwerze **${interaction.guild.name}**.\n\n` +
            `**Ticket:** #${ticket.ticketId}\n` +
            `**Kategoria:** ${ticket.category}\n` +
            `**Priorytet:** ${ticket.priority}\n` +
            `**Użytkownik:** ${ticket.username}\n` +
            `**Tytuł:** ${ticket.title}\n` +
            `**Powód przypisania:** ${reason}\n\n` +
            `[Przejdź do ticketu](https://discord.com/channels/${interaction.guildId}/${interaction.channelId})`
          )
          .setColor("#3498db")
          .setTimestamp()
          .setFooter({ text: `${interaction.guild.name} | System Ticketów` });

        await staffMember.send({ embeds: [dmEmbed] });
      } catch (error) {
        console.log(`Nie udało się wysłać DM do ${staffMember.username}:`, error.message);
      }

      // Wyślij wiadomość w kanale ticketu
      const channelEmbed = new EmbedBuilder()
        .setDescription(
          `🎯 **Ticket został przypisany do ${staffMember}**\n` +
          `Powód: ${reason}`
        )
        .setColor("#f39c12")
        .setTimestamp();

      await interaction.followUp({ 
        embeds: [channelEmbed],
        content: `${staffMember}, zostałeś przypisany do tego ticketu!`
      });

    } catch (error) {
      console.error("Błąd podczas przypisywania ticketu:", error);
      await interaction.editReply("❌ Wystąpił błąd podczas przypisywania ticketu.");
    }
  },
};