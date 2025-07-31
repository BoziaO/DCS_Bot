const {SlashCommandBuilder, PermissionFlagsBits} = require("discord.js");
const LevelRoleConfig = require("../../models/LevelRoleConfig");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("remove-level-role")
        .setDescription("Usuwa nagrodę w postaci roli z danego poziomu.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addIntegerOption((option) =>
            option
                .setName("level")
                .setDescription("Poziom, z którego chcesz usunąć nagrodę.")
                .setRequired(true)
                .setMinValue(1)
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const level = interaction.options.getInteger("level");

        const result = await LevelRoleConfig.findOneAndDelete({
            guildId: interaction.guild.id,
            level: level,
        });

        if (!result) {
            return interaction.editReply(
                `Dla **Poziomu ${level}** nie była ustawiona żadna rola.`
            );
        }

        await interaction.editReply(
            `Pomyślnie usunięto nagrodę w postaci roli z **Poziomu ${level}**.`
        );
    },
};
