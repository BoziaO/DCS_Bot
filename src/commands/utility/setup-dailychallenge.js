const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    EmbedBuilder,
} = require("discord.js");
const DailyChallengeConfig = require("../../models/DailyChallengeConfig");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("setup-dailychallenge")
        .setDescription("Konfiguruje kanał do wysyłania codziennych wyzwań.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addChannelOption((option) =>
            option
                .setName("channel")
                .setDescription("Kanał, na który będą wysyłane wyzwania.")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("frequency")
                .setDescription("Częstotliwość odnowienia wyzwań")
                .addChoices(
                    {name: "⏰ Co godzinę", value: "hourly"},
                    {name: "🕒 Co 3 godziny", value: "every3hours"},
                    {name: "🕕 Co 6 godzin", value: "every6hours"},
                    {name: "🕐 Co 12 godzin", value: "every12hours"},
                    {name: "📅 Codziennie", value: "daily"}
                )
                .setRequired(false)
        )
        .addIntegerOption((option) =>
            option
                .setName("hour")
                .setDescription(
                    "Godzina wysyłania (0-23) - tylko dla częstotliwości 'codziennie'"
                )
                .setMinValue(0)
                .setMaxValue(23)
                .setRequired(false)
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const channel = interaction.options.getChannel("channel");
        const frequency = interaction.options.getString("frequency") || "daily";
        const customHour = interaction.options.getInteger("hour") || 8;

        if (frequency === "daily" && (customHour < 0 || customHour > 23)) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Błąd konfiguracji")
                .setDescription("Godzina musi być w zakresie 0-23.")
                .setColor("#e74c3c");

            return interaction.editReply({embeds: [errorEmbed]});
        }

        const updateData = {
            channelId: channel.id,
            renewalFrequency: frequency,
            enabled: true,
        };

        if (frequency === "daily") {
            updateData.customHour = customHour;
        }

        const config = await DailyChallengeConfig.findOneAndUpdate(
            {guildId: interaction.guild.id},
            updateData,
            {upsert: true, new: true}
        );

        const frequencyTexts = {
            hourly: "co godzinę",
            every3hours: "co 3 godziny",
            every6hours: "co 6 godzin",
            every12hours: "co 12 godzin",
            daily: `codziennie o ${customHour}:00`,
        };

        const embed = new EmbedBuilder()
            .setTitle("✅ Skonfigurowano Codzienne Wyzwania")
            .setDescription(
                `Pomyślnie ustawiono kanał dla codziennych wyzwań na ${channel}.`
            )
            .setColor("#2ecc71")
            .addFields([
                {
                    name: "⏰ Częstotliwość odnowienia",
                    value: frequencyTexts[frequency],
                    inline: true,
                },
                {
                    name: "📊 Status",
                    value: config.enabled ? "✅ Włączone" : "❌ Wyłączone",
                    inline: true,
                },
                {
                    name: "💡 Informacja",
                    value:
                        "Wyzwania będą automatycznie odnawiać się zgodnie z ustawioną częstotliwością.",
                    inline: false,
                },
            ])
            .setFooter({
                text: `Konfiguracja zapisana • ${interaction.guild.name}`,
                iconURL: interaction.guild.iconURL(),
            });

        await interaction.editReply({embeds: [embed]});
    },
};
