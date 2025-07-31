const {SlashCommandBuilder, EmbedBuilder} = require("discord.js");
const {cursedItems} = require("../../data/phasmophobiaData");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("cursed-item")
        .setDescription("Informacje o przedmiotach przeklętych w Phasmophobia")
        .addStringOption((option) =>
            option
                .setName("przedmiot")
                .setDescription("Wybierz przedmiot przeklęty")
                .setRequired(false)
                .addChoices(
                    {name: "Ouija Board", value: "ouija"},
                    {name: "Voodoo Doll", value: "voodoo"},
                    {name: "Music Box", value: "musicbox"},
                    {name: "Haunted Mirror", value: "mirror"},
                    {name: "Tarot Cards", value: "tarot"},
                    {name: "Summoning Circle", value: "summoning"},
                    {name: "Monkey Paw", value: "monkey"}
                )
        ),

    async execute(interaction) {
        const itemType = interaction.options.getString("przedmiot");

        if (!itemType) {
            const embed = new EmbedBuilder()
                .setColor("#8B0000")
                .setTitle("🔮 Przedmioty Przeklęte w Phasmophobia")
                .setDescription(
                    "Użyj `/cursed-item przedmiot:[nazwa]` aby uzyskać szczegółowe informacje.\n\n⚠️ **UWAGA:** Wszystkie przedmioty przeklęte są niebezpieczne!"
                )
                .addFields({
                    name: "🪄 Dostępne przedmioty:",
                    value: Object.keys(cursedItems)
                        .map((key) => `${cursedItems[key].emoji} ${cursedItems[key].name}`)
                        .join("\n"),
                })
                .setFooter({text: "Używaj ostrożnie - mogą doprowadzić do śmierci!"})
                .setTimestamp();

            await interaction.reply({embeds: [embed]});
            return;
        }

        const item = cursedItems[itemType];
        if (!item) {
            await interaction.reply({
                content: "❌ Nie znaleziono takiego przedmiotu!",
                ephemeral: true,
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor("#8B0000")
            .setTitle(`🔮 ${item.emoji} ${item.name}`)
            .setDescription(item.description)
            .addFields(
                {name: "⚡ Efekt:", value: item.effect, inline: false},
                {name: "🧠 Utrata sanity:", value: item.sanityLoss, inline: true},
                {name: "⚠️ Poziom zagrożenia:", value: item.danger, inline: true}
            );

        if (item.questions) {
            embed.addFields({
                name: "❓ Przykładowe pytania:",
                value: item.questions.join("\n• "),
                inline: false,
            });
        }
        if (item.pins) {
            embed.addFields({
                name: "📌 Efekty szpilek:",
                value: item.pins.join("\n• "),
                inline: false,
            });
        }
        if (item.mechanics) {
            embed.addFields({
                name: "⚙️ Mechanika:",
                value: item.mechanics.join("\n• "),
                inline: false,
            });
        }
        if (item.wishes) {
            embed.addFields({
                name: "🧞 Przykładowe życzenia:",
                value: item.wishes.join("\n• "),
                inline: false,
            });
        }

        embed.addFields({
            name: "💡 Wskazówki:",
            value: item.tips.join("\n• "),
            inline: false,
        });
        embed.setFooter({
            text: "Pamiętaj: przedmioty przeklęte są bardzo niebezpieczne!",
        });
        embed.setTimestamp();

        await interaction.reply({embeds: [embed]});
    },
};
