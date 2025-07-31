const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const TicketConfig = require("../../models/TicketConfig");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup-tickets")
        .setDescription("Konfiguruje system ticketów na serwerze.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption((option) =>
            option
                .setName("category")
                .setDescription("Kategoria, w której będą tworzone kanały ticketów.")
                .addChannelTypes(ChannelType.GuildCategory)
                .setRequired(true)
        )
        .addRoleOption((option) =>
            option
                .setName("staff-role")
                .setDescription("Rola personelu, która będzie zarządzać ticketami.")
                .setRequired(true)
        )
        .addChannelOption((option) =>
            option
                .setName("panel-channel")
                .setDescription(
                    "Kanał, na którym zostanie wysłany panel do tworzenia ticketów."
                )
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const category = interaction.options.getChannel("category");
        const staffRole = interaction.options.getRole("staff-role");
        const panelChannel = interaction.options.getChannel("panel-channel");

        try {
            await TicketConfig.findOneAndUpdate(
                {guildId: interaction.guildId},
                {
                    ticketsCategoryId: category.id,
                    staffRoleId: staffRole.id,
                    panelChannelId: panelChannel.id,
                },
                {upsert: true, new: true}
            );

            const ticketPanelEmbed = new EmbedBuilder()
                .setTitle("Wsparcie Techniczne & Zgłoszenia")
                .setDescription(
                    "Potrzebujesz pomocy lub chcesz skontaktować się z administracją? Kliknij przycisk poniżej, aby utworzyć prywatny ticket."
                )
                .setColor("#3498db")
                .setFooter({text: `${interaction.guild.name} | System Ticketów`});

            const createTicketButton = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId("create_ticket_button")
                    .setLabel("Stwórz Ticket")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("📩")
            );

            await panelChannel.send({
                embeds: [ticketPanelEmbed],
                components: [createTicketButton],
            });

            await interaction.editReply({
                content: `Pomyślnie skonfigurowano system ticketów! Panel został wysłany na kanał ${panelChannel}.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error("Błąd podczas konfiguracji ticketów:", error);
            await interaction.editReply(
                "Wystąpił błąd podczas zapisywania konfiguracji. Upewnij się, że mam odpowiednie uprawnienia."
            );
        }
    },
};
