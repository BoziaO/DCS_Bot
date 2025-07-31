const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder,
} = require("discord.js");
const LevelingConfig = require("../../models/LevelingConfig");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup-leveling-channel")
        .setDescription("Konfiguruje kanał do ogłoszeń o awansach.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("set")
                .setDescription("Ustawia kanał dla ogłoszeń o awansach.")
                .addChannelOption((option) =>
                    option
                        .setName("channel")
                        .setDescription("Kanał, na który będą wysyłane ogłoszenia.")
                        .addChannelTypes(ChannelType.GuildText)
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Wyłącza dedykowany kanał ogłoszeń o awansach.")
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        if (subcommand === "set") {
            const channel = interaction.options.getChannel("channel");

            await LevelingConfig.findOneAndUpdate(
                {guildId},
                {announcementChannelId: channel.id},
                {upsert: true, new: true}
            );

            const embed = new EmbedBuilder()
                .setTitle("✅ Skonfigurowano Kanał Awansów")
                .setDescription(
                    `Pomyślnie ustawiono kanał ogłoszeń o awansach na ${channel}.`
                )
                .setColor("#2ecc71");

            await interaction.editReply({embeds: [embed]});
        } else if (subcommand === "remove") {
            await LevelingConfig.findOneAndUpdate(
                {guildId},
                {$unset: {announcementChannelId: ""}}
            );

            const embed = new EmbedBuilder()
                .setTitle("✅ Wyłączono Ogłoszenia")
                .setDescription(
                    "Pomyślnie wyłączono dedykowany kanał ogłoszeń. Będą one teraz wysyłane na kanale, gdzie użytkownik awansował."
                )
                .setColor("#e74c3c");

            await interaction.editReply({embeds: [embed]});
        }
    },
};
