const {SlashCommandBuilder, EmbedBuilder} = require("discord.js");
const {detailedItems} = require("../../data/phasmophobiaData");

const items = detailedItems;

module.exports = {
    data: new SlashCommandBuilder()
        .setName("item")
        .setDescription("Wyświetla informacje o przedmiotach w Phasmophobia")
        .addStringOption((option) =>
            option
                .setName("przedmiot")
                .setDescription("Wybierz przedmiot")
                .setRequired(false)
                .addChoices(
                    {name: "EMF Reader", value: "emf"},
                    {name: "Spirit Box", value: "spiritbox"},
                    {name: "Photo Camera", value: "camera"},
                    {name: "Flashlight", value: "flashlight"},
                    {name: "Thermometer", value: "thermometer"},
                    {name: "UV Light", value: "uvlight"},
                    {name: "Crucifix", value: "crucifix"},
                    {name: "D.O.T.S Projector", value: "dots"},
                    {name: "Motion Sensor", value: "motionsensor"},
                    {name: "Incense", value: "incense"}
                )
        ),

    async execute(interaction) {
        const itemType = interaction.options.getString("przedmiot");

        if (!itemType) {
            const embed = new EmbedBuilder()
                .setColor("#4B0082")
                .setTitle("🎒 Przedmioty w Phasmophobia")
                .setDescription(
                    "Użyj `/item przedmiot:[nazwa]` aby uzyskać szczegółowe informacje."
                )
                .addFields({
                    name: "📦 Dostępne przedmioty:",
                    value: Object.keys(items)
                        .map((key) => `• ${items[key].name} (${items[key].price})`)
                        .join("\n"),
                })
                .setTimestamp();

            await interaction.reply({embeds: [embed]});
            return;
        }

        const item = items[itemType];
        if (!item) {
            await interaction.reply({
                content: "❌ Nie znaleziono takiego przedmiotu!",
                ephemeral: true,
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor("#4B0082")
            .setTitle(`🎒 ${item.name}`)
            .setDescription(item.description)
            .addFields(
                {name: "💰 Cena:", value: item.price, inline: true},
                {name: "🏆 Tier:", value: item.tier, inline: true},
                {name: "📖 Użycie:", value: item.usage, inline: false},
                {name: "💡 Wskazówki:", value: item.tips.join("\n• "), inline: false}
            )
            .setTimestamp();

        await interaction.reply({embeds: [embed]});
    },
};
