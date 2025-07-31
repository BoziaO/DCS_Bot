const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const VerificationConfig = require("../../models/VerificationConfig");
const {VerificationStats} = require("../../utils/verification");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("verification-reset")
        .setDescription("Resetuje system weryfikacji")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption((option) =>
            option
                .setName("type")
                .setDescription("Co chcesz zresetować")
                .setRequired(true)
                .addChoices(
                    {name: "🔧 Tylko konfigurację", value: "config"},
                    {name: "📊 Tylko statystyki", value: "stats"},
                    {name: "💥 Wszystko (konfiguracja + statystyki)", value: "all"}
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const type = interaction.options.getString("type");

        const confirmEmbed = new EmbedBuilder()
            .setTitle("⚠️ Potwierdzenie Resetu")
            .setDescription(this.getResetDescription(type))
            .setColor("#FF6B35")
            .addFields({
                name: "❗ Uwaga",
                value:
                    "Ta operacja jest nieodwracalna! Upewnij się, że chcesz kontynuować.",
                inline: false,
            })
            .setTimestamp();

        const confirmButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`verification_reset_confirm_${type}`)
                .setLabel("Tak, resetuj")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("💥"),
            new ButtonBuilder()
                .setCustomId("verification_reset_cancel")
                .setLabel("Anuluj")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("❌")
        );

        await interaction.editReply({
            embeds: [confirmEmbed],
            components: [confirmButton],
        });

        setTimeout(async () => {
            try {
                await interaction.editReply({
                    embeds: [confirmEmbed],
                    components: [],
                });
            } catch (error) {
            }
        }, 30000);
    },

    async handleConfirmation(interaction, resetType) {
        await interaction.deferUpdate();

        try {
            let resetResults = {
                config: false,
                stats: false,
                error: null,
            };

            if (resetType === "config" || resetType === "all") {
                await VerificationConfig.deleteOne({guildId: interaction.guild.id});
                resetResults.config = true;
            }

            if (resetType === "stats" || resetType === "all") {
                const statsManager = VerificationStats.getInstance();

                for (const [key, value] of statsManager.stats.entries()) {
                    if (
                        key.startsWith(`${interaction.guild.id}_`) ||
                        key === `guild_${interaction.guild.id}`
                    ) {
                        statsManager.stats.delete(key);
                    }
                }
                resetResults.stats = true;
            }

            const successEmbed = new EmbedBuilder()
                .setTitle("✅ Reset Zakończony")
                .setDescription("System weryfikacji został pomyślnie zresetowany!")
                .setColor("#00FF00")
                .setTimestamp();

            const resetInfo = [];
            if (resetResults.config) resetInfo.push("🔧 Konfiguracja usunięta");
            if (resetResults.stats) resetInfo.push("📊 Statystyki wyczyszczone");

            successEmbed.addFields({
                name: "📋 Co zostało zresetowane",
                value: resetInfo.join("\n"),
                inline: false,
            });

            if (resetType === "config" || resetType === "all") {
                successEmbed.addFields({
                    name: "🔄 Następne kroki",
                    value:
                        "Użyj `/setup-verification` aby ponownie skonfigurować system weryfikacji.",
                    inline: false,
                });
            }

            await interaction.editReply({
                embeds: [successEmbed],
                components: [],
            });
        } catch (error) {
            console.error("Błąd podczas resetowania systemu weryfikacji:", error);

            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Błąd Resetu")
                .setDescription(
                    "Wystąpił błąd podczas resetowania systemu weryfikacji."
                )
                .setColor("#FF0000")
                .addFields({
                    name: "🔍 Szczegóły",
                    value: error.message || "Nieznany błąd",
                    inline: false,
                })
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed],
                components: [],
            });
        }
    },

    async handleCancel(interaction) {
        await interaction.deferUpdate();

        const cancelEmbed = new EmbedBuilder()
            .setTitle("❌ Reset Anulowany")
            .setDescription(
                "Operacja resetowania została anulowana. System weryfikacji pozostaje niezmieniony."
            )
            .setColor("#FFA500")
            .setTimestamp();

        await interaction.editReply({
            embeds: [cancelEmbed],
            components: [],
        });
    },

    getResetDescription(type) {
        const descriptions = {
            config:
                "🔧 **Reset Konfiguracji**\n\nZostanie usunięta:\n• Konfiguracja ról\n• Ustawienia motywów\n• Konfiguracja wyzwań\n• Role nagród\n\nStatystyki pozostaną nietknięte.",
            stats:
                "📊 **Reset Statystyk**\n\nZostaną wyczyszczone:\n• Statystyki weryfikacji\n• Rankingi użytkowników\n• Historia wyzwań\n• Dane czasowe\n\nKonfiguracja pozostanie nietknięta.",
            all: "💥 **Pełny Reset**\n\nZostanie usunięte WSZYSTKO:\n• Cała konfiguracja systemu\n• Wszystkie statystyki\n• Rankingi użytkowników\n• Historia weryfikacji\n\nSystem zostanie całkowicie wyczyszczony!",
        };
        return descriptions[type] || "Nieznany typ resetu";
    },
};
