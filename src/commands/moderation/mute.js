const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require("discord.js");
const {parseDuration} = require("../../utils/time");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("mute")
        .setDescription("Wycisza użytkownika na określony czas.")
        .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("Użytkownik do wyciszenia.")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("duration")
                .setDescription("Czas wyciszenia (np. 10m, 1h, 1d).")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("Powód wyciszenia.")
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const targetUser = interaction.options.getUser("user");
        const durationString = interaction.options.getString("duration");
        const reason =
            interaction.options.getString("reason") || "Nie podano powodu.";
        const targetMember = await interaction.guild.members
            .fetch(targetUser.id)
            .catch(() => null);

        if (!targetMember) {
            return interaction.editReply({
                content: "Nie można znaleźć tego użytkownika na serwerze.",
                ephemeral: true,
            });
        }
        if (targetMember.id === interaction.user.id) {
            return interaction.editReply({
                content: "Nie możesz wyciszyć samego siebie.",
                ephemeral: true,
            });
        }
        if (
            targetMember.roles.highest.position >=
            interaction.member.roles.highest.position &&
            interaction.guild.ownerId !== interaction.user.id
        ) {
            return interaction.editReply({
                content: "Nie możesz wyciszyć użytkownika z taką samą lub wyższą rolą.",
                ephemeral: true,
            });
        }
        if (!targetMember.moderatable) {
            return interaction.editReply({
                content:
                    "Nie mogę wyciszyć tego użytkownika. Prawdopodobnie ma wyższą rolę ode mnie lub nie mam uprawnień.",
                ephemeral: true,
            });
        }
        if (targetMember.isCommunicationDisabled()) {
            return interaction.editReply({
                content: "Ten użytkownik jest już wyciszony.",
                ephemeral: true,
            });
        }

        const durationMs = parseDuration(durationString);
        if (!durationMs) {
            return interaction.editReply({
                content:
                    "Podano nieprawidłowy format czasu. Użyj np. `10m`, `1h`, `7d`.",
                ephemeral: true,
            });
        }
        if (durationMs > parseDuration("28d")) {
            return interaction.editReply({
                content: "Czas wyciszenia nie może przekraczać 28 dni.",
                ephemeral: true,
            });
        }

        try {
            await targetMember.timeout(
                durationMs,
                `${reason} (Wyciszony przez: ${interaction.user.tag})`
            );

            const successEmbed = new EmbedBuilder()
                .setColor("#f1c40f")
                .setTitle("Użytkownik wyciszony")
                .setDescription(
                    `Pomyślnie wyciszono **${targetUser.tag}** na **${durationString}**.`
                )
                .addFields({name: "Powód", value: reason})
                .setTimestamp();

            await interaction.editReply({embeds: [successEmbed], ephemeral: true});
        } catch (error) {
            console.error("Błąd podczas wyciszania użytkownika:", error);
            await interaction.editReply({
                content: "Wystąpił błąd podczas próby wyciszenia użytkownika.",
                ephemeral: true,
            });
        }
    },
};
