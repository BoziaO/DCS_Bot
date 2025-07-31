const {SlashCommandBuilder, EmbedBuilder} = require("discord.js");
const {tarotCards} = require("../../data/phasmophobiaData");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("tarot")
        .setDescription("Informacje o kartach Tarot w Phasmophobia"),

    async execute(interaction) {
        const cardKeys = Object.keys(tarotCards);
        const randomCard = cardKeys[Math.floor(Math.random() * cardKeys.length)];
        const card = tarotCards[randomCard];

        const embed = new EmbedBuilder()
            .setColor("#4B0082")
            .setTitle(`🔮 Wylosowałeś: ${card.emoji} ${card.name}`)
            .setDescription(`**Efekt:** ${card.effect}`)
            .addFields(
                {name: "📝 Opis:", value: card.description, inline: false},
                {name: "💎 Rzadkość:", value: card.rarity, inline: true}
            )
            .setFooter({text: "Uważaj na niebezpieczne karty!"})
            .setTimestamp();

        await interaction.reply({embeds: [embed]});
    },
};
