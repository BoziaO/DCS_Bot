const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require("discord.js");
const Profile = require("../../models/Profile");

const calculateLevel = (xp) => Math.floor(0.1 * Math.sqrt(xp || 0));
const calculateXpForLevel = (level) => Math.pow((level || 0) / 0.1, 2);

module.exports = {
    data: new SlashCommandBuilder()
        .setName("level-admin")
        .setDescription("Zarządza poziomami użytkowników.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("set")
                .setDescription("Ustawia poziom i XP dla użytkownika.")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("Użytkownik do modyfikacji.")
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("level")
                        .setDescription(
                            "Nowy poziom. Spowoduje to ustawienie minimalnego XP dla tego poziomu."
                        )
                        .setRequired(true)
                        .setMinValue(0)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add-xp")
                .setDescription("Dodaje XP użytkownikowi.")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("Użytkownik do modyfikacji.")
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("amount")
                        .setDescription("Ilość XP do dodania.")
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const subcommand = interaction.options.getSubcommand();
        const targetUser = interaction.options.getUser("user");

        const userProfile = await Profile.findOneAndUpdate(
            {userId: targetUser.id, guildId: interaction.guild.id},
            {},
            {upsert: true, new: true}
        );

        if (subcommand === "set") {
            const level = interaction.options.getInteger("level");
            const xpForLevel = calculateXpForLevel(level);
            userProfile.level = level;
            userProfile.xp = xpForLevel;
        } else if (subcommand === "add-xp") {
            const amount = interaction.options.getInteger("amount");
            userProfile.xp += amount;

            if (userProfile.xp < 0) userProfile.xp = 0;
            userProfile.level = calculateLevel(userProfile.xp);
        }

        await userProfile.save();

        const embed = new EmbedBuilder()
            .setColor("#2ecc71")
            .setTitle("✅ Zaktualizowano Profil")
            .setDescription(`Pomyślnie zaktualizowano profil dla ${targetUser}.`)
            .addFields(
                {
                    name: "Nowy Poziom",
                    value: userProfile.level.toLocaleString(),
                    inline: true,
                },
                {
                    name: "Nowe XP",
                    value: userProfile.xp.toLocaleString(),
                    inline: true,
                }
            );

        await interaction.editReply({embeds: [embed]});
    },
};
