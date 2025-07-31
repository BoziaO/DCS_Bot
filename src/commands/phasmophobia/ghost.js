const {SlashCommandBuilder, EmbedBuilder} = require("discord.js");
const {ghosts} = require("../../data/phasmophobiaData");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ghost")
        .setDescription("Wyświetla informacje o duchach w Phasmophobia")
        .addStringOption((option) =>
            option
                .setName("typ")
                .setDescription("Wybierz typ ducha")
                .setRequired(false)
                .addChoices(
                    ...ghosts.map((ghost) => ({
                        name: ghost.name,
                        value: ghost.name.toLowerCase(),
                    }))
                )
        ),

    async execute(interaction) {
        const ghostType = interaction.options.getString("typ");

        if (!ghostType) {
            const embed = new EmbedBuilder()
                .setColor("#8B0000")
                .setTitle("🔮 Duchy w Phasmophobia")
                .setDescription(
                    "Użyj `/ghost typ:[nazwa]` aby uzyskać szczegółowe informacje o konkretnym duchu."
                )
                .addFields({
                    name: "👻 Dostępne duchy:",
                    value: ghosts.map((ghost) => `• ${ghost.name}`).join("\n"),
                })
                .setTimestamp();

            await interaction.reply({embeds: [embed]});
            return;
        }

        const ghost = ghosts.find((g) => g.name.toLowerCase() === ghostType);
        if (!ghost) {
            await interaction.reply({
                content: "❌ Nie znaleziono takiego ducha!",
                ephemeral: true,
            });
            return;
        }

        const embed = new EmbedBuilder()
            .setColor("#8B0000")
            .setTitle(`👻 ${ghost.name}`)
            .setDescription(ghost.description)
            .addFields(
                {
                    name: "🔍 Dowody",
                    value: `• ${ghost.evidence.join("\n• ")}`,
                    inline: false,
                },
                {
                    name: "💪 Mocne strony",
                    value: `• ${ghost.strengths.join("\n• ")}`,
                    inline: false,
                },
                {
                    name: "🛡️ Słabe strony",
                    value: `• ${ghost.weaknesses.join("\n• ")}`,
                    inline: false,
                },
                {
                    name: "🧠 Próg polowania",
                    value: `${ghost.huntThreshold}% poczytalności`,
                    inline: true,
                }
            )
            .setTimestamp();

        await interaction.reply({embeds: [embed]});
    },
};
