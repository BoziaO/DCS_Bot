const {SlashCommandBuilder, EmbedBuilder} = require("discord.js");
const Profile = require("../../models/Profile");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("leaderboard")
        .setDescription(
            "Wyświetla ranking najbogatszych łowców duchów na serwerze."
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const topUsers = await Profile.find({guildId: interaction.guild.id})
            .sort({balance: -1})
            .limit(10);

        if (topUsers.length === 0) {
            return interaction.editReply(
                "Na tym serwerze nikt jeszcze nie dołączył do zabawy!"
            );
        }

        const embed = new EmbedBuilder()
            .setTitle(`🏆 Tablica Liderów - ${interaction.guild.name}`)
            .setColor("#f1c40f")
            .setTimestamp();

        const leaderboardEntries = await Promise.all(
            topUsers.map(async (profile, index) => {
                const user = await interaction.client.users
                    .fetch(profile.userId)
                    .catch(() => null);
                const medal = ["🥇", "🥈", "🥉"][index] || `**${index + 1}.**`;
                const username = user ? user.username : "Nieznany Użytkownik";
                return `${medal} ${username} - **$${profile.balance}**`;
            })
        );

        embed.setDescription(leaderboardEntries.join("\n\n"));

        await interaction.editReply({embeds: [embed]});
    },
};
