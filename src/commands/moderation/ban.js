const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require("discord.js");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("ban")
        .setDescription("Banuje użytkownika z serwera.")
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("Użytkownik do zbanowania.")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option.setName("reason").setDescription("Powód bana.")
        )
        .addIntegerOption((option) =>
            option
                .setName("delete_message_days")
                .setDescription(
                    "Liczba dni (0-7), z których wiadomości użytkownika mają być usunięte."
                )
                .setMinValue(0)
                .setMaxValue(7)
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});

        const targetUser = interaction.options.getUser("user");
        const reason =
            interaction.options.getString("reason") || "Nie podano powodu.";
        const deleteDays =
            interaction.options.getInteger("delete_message_days") || 0;
        const deleteSeconds = deleteDays * 24 * 60 * 60;

        const targetMember = await interaction.guild.members
            .fetch(targetUser.id)
            .catch(() => null);

        if (!targetMember) {
            return interaction.editReply({
                content: "Nie można znaleźć tego użytkownika na serwerze.",
                ephemeral: true,
            });
        }

        if (targetUser.id === interaction.user.id) {
            return interaction.editReply({
                content: "Nie możesz zbanować samego siebie.",
                ephemeral: true,
            });
        }

        if (targetUser.id === interaction.client.user.id) {
            return interaction.editReply({
                content: "Nie mogę zbanować samego siebie.",
                ephemeral: true,
            });
        }

        if (
            targetMember.roles.highest.position >=
            interaction.member.roles.highest.position &&
            interaction.guild.ownerId !== interaction.user.id
        ) {
            return interaction.editReply({
                content:
                    "Nie możesz zbanować użytkownika, który ma taką samą lub wyższą rolę.",
                ephemeral: true,
            });
        }

        if (!targetMember.bannable) {
            return interaction.editReply({
                content:
                    "Nie mogę zbanować tego użytkownika. Prawdopodobnie ma wyższą rolę ode mnie lub nie mam uprawnień.",
                ephemeral: true,
            });
        }

        try {
            const banEmbed = new EmbedBuilder()
                .setColor("#ff4757")
                .setTitle("Zostałeś zbanowany!")
                .setDescription(
                    `Zostałeś zbanowany na serwerze **${interaction.guild.name}**.`
                )
                .addFields(
                    {name: "Powód", value: reason},
                    {name: "Zbanowany przez", value: interaction.user.tag}
                )
                .setTimestamp()
                .setFooter({text: `ID Użytkownika: ${targetUser.id}`});

            await targetUser.send({embeds: [banEmbed]}).catch((err) => {
                console.log(
                    `Nie udało się wysłać wiadomości DM do ${targetUser.tag}. Błąd: ${err.message}`
                );
            });

            await interaction.guild.bans.create(targetUser.id, {
                reason: `${reason} (Zbanowany przez: ${interaction.user.tag})`,
                deleteMessageSeconds: deleteSeconds,
            });

            const successEmbed = new EmbedBuilder()
                .setColor("#2ed573")
                .setTitle("Użytkownik zbanowany")
                .setDescription(`Pomyślnie zbanowano **${targetUser.tag}**.`)
                .addFields({name: "Powód", value: reason})
                .setTimestamp();

            await interaction.editReply({embeds: [successEmbed], ephemeral: true});
        } catch (error) {
            console.error(`Błąd podczas banowania użytkownika:`, error);
            await interaction.editReply({
                content: "Wystąpił błąd podczas próby zbanowania użytkownika.",
                ephemeral: true,
            });
        }
    },
};
