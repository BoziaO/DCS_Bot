const {SlashCommandBuilder, EmbedBuilder} = require("discord.js");
const Profile = require("../../models/Profile");
const {parseDuration, formatDuration} = require("../../utils/time");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("daily")
        .setDescription("Odbierz swoją codzienną nagrodę pieniężną."),

    async execute(interaction) {
        const userProfile = await Profile.findOneAndUpdate(
            {userId: interaction.user.id, guildId: interaction.guild.id},
            {},
            {upsert: true, new: true}
        );

        const cooldown = parseDuration("24h");
        const lastDailyTime = userProfile.lastDaily?.getTime() || 0;

        if (Date.now() - lastDailyTime < cooldown) {
            const timeLeft = cooldown - (Date.now() - lastDailyTime);
            return interaction.reply({
                content: `Już odebrałeś/aś dzisiaj swoją nagrodę! Spróbuj ponownie za **${formatDuration(
                    timeLeft
                )}**.`,
                ephemeral: true,
            });
        }

        const dailyReward = 200;
        userProfile.balance += dailyReward;
        userProfile.lastDaily = new Date();
        userProfile.totalEarnings = (userProfile.totalEarnings || 0) + dailyReward;
        await userProfile.save();

        const embed = new EmbedBuilder()
            .setTitle("Codzienna Nagroda!")
            .setDescription(
                `Odebrałeś/aś swoją codzienną nagrodę w wysokości **$${dailyReward}**!`
            )
            .setColor("#2ecc71")
            .setTimestamp();

        await interaction.reply({embeds: [embed]});
    },
};
