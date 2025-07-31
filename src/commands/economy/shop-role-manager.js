const {
    SlashCommandBuilder,
    PermissionFlagsBits,
    EmbedBuilder,
} = require("discord.js");
const ShopRole = require("../../models/ShopRole");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop-role-manager")
        .setDescription("Zarządza rolami dostępnymi w sklepie.")
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand((subcommand) =>
            subcommand
                .setName("add")
                .setDescription("Dodaje rolę do sklepu.")
                .addRoleOption((option) =>
                    option
                        .setName("role")
                        .setDescription("Rola do dodania.")
                        .setRequired(true)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("price")
                        .setDescription("Cena roli.")
                        .setRequired(true)
                        .setMinValue(0)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("remove")
                .setDescription("Usuwa rolę ze sklepu.")
                .addRoleOption((option) =>
                    option
                        .setName("role")
                        .setDescription("Rola do usunięcia.")
                        .setRequired(true)
                )
        ),

    async execute(interaction) {
        await interaction.deferReply({ephemeral: true});
        const subcommand = interaction.options.getSubcommand();
        const role = interaction.options.getRole("role");

        if (
            role.managed ||
            role.position >= interaction.guild.members.me.roles.highest.position
        ) {
            return interaction.reply({
                content:
                    "Nie mogę zarządzać tą rolą. Upewnij się, że nie jest to rola bota i że moja rola jest wyżej w hierarchii.",
                ephemeral: true,
            });
        }

        if (subcommand === "add") {
            const price = interaction.options.getInteger("price");

            await ShopRole.findOneAndUpdate(
                {guildId: interaction.guild.id, roleId: role.id},
                {price: price},
                {upsert: true, new: true}
            );

            const embed = new EmbedBuilder()
                .setTitle("✅ Rola Dodana do Sklepu")
                .setDescription(
                    `Pomyślnie dodano rolę ${role} do sklepu za cenę **$${price}**.`
                )
                .setColor("#2ecc71");

            await interaction.editReply({embeds: [embed]});
        } else if (subcommand === "remove") {
            const result = await ShopRole.findOneAndDelete({
                guildId: interaction.guild.id,
                roleId: role.id,
            });

            if (!result) {
                return interaction.editReply({
                    content: `Rola ${role} nie była na sprzedaż w sklepie.`,
                    ephemeral: true,
                });
            }

            await interaction.editReply({
                content: `Pomyślnie usunięto rolę ${role} ze sklepu.`,
                ephemeral: true,
            });
        }
    },
};
