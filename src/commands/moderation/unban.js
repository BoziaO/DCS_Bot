const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("unban")
        .setDescription("Odbanowuje użytkownika na serwerze.")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addStringOption((option) =>
            option
                .setName("user_id")
                .setDescription("ID użytkownika do odbanowania.")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("Powód odbanowania.")
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const userId = interaction.options.getString("user_id");
        const reason =
            interaction.options.getString("reason") || "Nie podano powodu.";

        if (!/^\d{17,19}$/.test(userId)) {
            return interaction.editReply({
                content: "Podano nieprawidłowe ID użytkownika.",
                ephemeral: true,
            });
        }

        try {
            const ban = await interaction.guild.bans.fetch(userId).catch(() => null);

            if (!ban) {
                return interaction.editReply({
                    content: "Ten użytkownik nie jest zbanowany.",
                    ephemeral: true,
                });
            }

            await interaction.guild.bans.remove(
                userId,
                `${reason} (Odbanowany przez: ${interaction.user.tag})`
            );

            const successEmbed = new EmbedBuilder()
                .setColor("#2ed573")
                .setTitle("Użytkownik odbanowany")
                .setDescription(
                    `Pomyślnie odbanowano użytkownika **${ban.user.tag}** (ID: \`${userId}\`).`
                )
                .addFields({name: "Powód", value: reason})
                .setTimestamp();

            await interaction.editReply({embeds: [successEmbed], ephemeral: true});
        } catch (error) {
            console.error("Błąd podczas odbanowywania użytkownika:", error);
            await interaction.editReply({
                content: "Wystąpił błąd podczas próby odbanowania użytkownika.",
                ephemeral: true,
            });
        }
    },
};
