const {SlashCommandBuilder, PermissionFlagsBits} = require("discord.js");
const {VerificationStats} = require("../../utils/verification");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("verification-stats")
        .setDescription("Wyświetla statystyki systemu weryfikacji")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption((option) =>
            option
                .setName("type")
                .setDescription("Typ statystyk do wyświetlenia")
                .setRequired(false)
                .addChoices(
                    {name: "📊 Ogólne statystyki", value: "general"},
                    {name: "🏆 Ranking investigatorów", value: "leaderboard"},
                    {name: "📈 Trend tygodniowy", value: "weekly"}
                )
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const type = interaction.options.getString("type") || "general";
        const statsManager = VerificationStats.getInstance();

        try {
            switch (type) {
                case "general":
                    const statsEmbed = await statsManager.createStatsEmbed(
                        interaction.guild.id,
                        interaction.guild
                    );
                    await interaction.editReply({embeds: [statsEmbed]});
                    break;

                case "leaderboard":
                    const leaderboardEmbed = await statsManager.createLeaderboardEmbed(
                        interaction.guild.id,
                        interaction.guild
                    );
                    await interaction.editReply({embeds: [leaderboardEmbed]});
                    break;

                case "weekly":
                    const weeklyEmbed = await statsManager.createStatsEmbed(
                        interaction.guild.id,
                        interaction.guild
                    );
                    weeklyEmbed.setTitle("📅 Statystyki Tygodniowe");
                    await interaction.editReply({embeds: [weeklyEmbed]});
                    break;

                default:
                    await interaction.editReply("❌ Nieznany typ statystyk!");
            }
        } catch (error) {
            console.error("Błąd podczas pobierania statystyk weryfikacji:", error);
            await interaction.editReply(
                "❌ Wystąpił błąd podczas pobierania statystyk."
            );
        }
    },
};
