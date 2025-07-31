const {SlashCommandBuilder} = require("discord.js");
const {VerificationChallenges} = require("../../utils/verification");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("verification-test")
        .setDescription("Przetestuj wyzwania weryfikacyjne")
        .addStringOption((option) =>
            option
                .setName("challenge-type")
                .setDescription("Typ wyzwania do przetestowania")
                .setRequired(false)
                .addChoices(
                    {name: "🎲 Losowe wyzwanie", value: "random"},
                    {name: "👻 Quiz o duchach", value: "ghost_quiz"},
                    {name: "🔧 Test sprzętu", value: "equipment_test"},
                    {name: "🛡️ Wskazówki przetrwania", value: "survival_tips"}
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const challengeType =
            interaction.options.getString("challenge-type") ||
            VerificationChallenges.getRandomChallenge();

        try {
            await VerificationChallenges.startChallenge(interaction, challengeType);
        } catch (error) {
            console.error("Błąd podczas uruchamiania testu wyzwania:", error);
            await interaction.editReply(
                "❌ Wystąpił błąd podczas uruchamiania wyzwania."
            );
        }
    },
};
