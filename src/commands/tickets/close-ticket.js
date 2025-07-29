const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} = require("discord.js");
const TicketConfig = require("../../models/tickets/TicketConfig");
const Ticket = require("../../models/tickets/Ticket");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("close-ticket")
    .setDescription("Zamyka aktualny ticket.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addStringOption((option) =>
      option
        .setName("reason")
        .setDescription("Powód zamknięcia ticketu.")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const config = await TicketConfig.findOne({ guildId: interaction.guildId });
      if (!config) {
        return interaction.reply({
          content: "❌ System ticketów nie jest skonfigurowany na tym serwerze.",
          ephemeral: true,
        });
      }

      const ticket = await Ticket.findOne({ 
        guildId: interaction.guildId, 
        channelId: interaction.channelId 
      });

      if (!ticket) {
        return interaction.reply({
          content: "❌ Ta komenda może być używana tylko w kanale ticketu.",
          ephemeral: true,
        });
      }

      // Sprawdź uprawnienia
      const memberRoles = interaction.member.roles.cache.map(role => role.id);
      const isOwner = ticket.userId === interaction.user.id;
      const canClose = config.hasPermission(interaction.user.id, memberRoles, 'moderate') || isOwner;

      if (!canClose) {
        return interaction.reply({
          content: "❌ Nie masz uprawnień do zamknięcia tego ticketu.",
          ephemeral: true,
        });
      }

      const reason = interaction.options.getString("reason");

      if (reason) {
        // Jeśli podano powód, zamknij od razu
        const TicketHandler = require("../../handlers/ticketHandler");
        
        // Symuluj modal submission
        const mockInteraction = {
          ...interaction,
          fields: {
            getTextInputValue: (id) => {
              if (id === "close_reason") return reason;
              return "";
            }
          },
          deferReply: () => interaction.deferReply(),
          editReply: (options) => interaction.editReply(options),
          followUp: (options) => interaction.followUp(options),
          customId: "ticket_close_modal",
          isModalSubmit: () => true,
        };

        await TicketHandler.handleCloseModal(mockInteraction);
      } else {
        // Pokaż modal z powodem
        const modal = new ModalBuilder()
          .setCustomId("ticket_close_modal")
          .setTitle("Zamknij Ticket");

        const reasonInput = new TextInputBuilder()
          .setCustomId("close_reason")
          .setLabel("Powód zamknięcia")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Opisz powód zamknięcia ticketu...")
          .setRequired(true)
          .setMaxLength(500);

        const actionRow = new ActionRowBuilder().addComponents(reasonInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
      }

    } catch (error) {
      console.error("Błąd podczas zamykania ticketu:", error);
      await interaction.reply({
        content: "❌ Wystąpił błąd podczas zamykania ticketu.",
        ephemeral: true,
      });
    }
  },
};