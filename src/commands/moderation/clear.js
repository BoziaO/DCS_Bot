const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("clear")
        .setDescription("Usuwa określoną liczbę wiadomości z kanału.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
        .addIntegerOption((option) =>
            option
                .setName("amount")
                .setDescription("Liczba wiadomości do usunięcia (1-100).")
                .setMinValue(1)
                .setMaxValue(100)
                .setRequired(true)
        ),

    async execute(interaction) {
        const amount = interaction.options.getInteger("amount");

        try {
            const deletedMessages = await interaction.channel.bulkDelete(
                amount,
                true
            );

            const successEmbed = new EmbedBuilder()
                .setColor("#2ed573")
                .setDescription(
                    `✅ Pomyślnie usunięto **${deletedMessages.size}** wiadomości.`
                );

            await interaction.reply({embeds: [successEmbed], ephemeral: true});
        } catch (error) {
            console.error("Błąd podczas usuwania wiadomości:", error);
            const errorEmbed = new EmbedBuilder()
                .setColor("#ff4757")
                .setDescription(
                    "❌ Wystąpił błąd. Prawdopodobnie próbujesz usunąć wiadomości starsze niż 14 dni."
                );
            await interaction.reply({embeds: [errorEmbed], ephemeral: true});
        }
    },
};
