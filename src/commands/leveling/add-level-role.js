const {
    SlashCommandBuilder,
    EmbedBuilder,
    PermissionFlagsBits,
} = require("discord.js");
const LevelRole = require("../../models/LevelRoleConfig");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("add-level-role")
        .setDescription("Dodaj rolę za osiągnięcie określonego poziomu")
        .addIntegerOption((option) =>
            option
                .setName("level")
                .setDescription("Poziom wymagany do otrzymania roli")
                .setRequired(true)
                .setMinValue(1)
                .setMaxValue(200)
        )
        .addRoleOption((option) =>
            option.setName("role").setDescription("Rola do nadania").setRequired(true)
        )
        .addBooleanOption((option) =>
            option
                .setName("remove-previous")
                .setDescription(
                    "Czy usunąć poprzednie role levelowe przy nadaniu tej roli?"
                )
                .setRequired(false)
        )
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        await interaction.deferReply();

        const level = interaction.options.getInteger("level");
        const role = interaction.options.getRole("role");
        const removePrevious =
            interaction.options.getBoolean("remove-previous") ?? false;

        if (role.position >= interaction.guild.members.me.roles.highest.position) {
            return interaction.editReply({
                content:
                    "❌ Nie mogę nadać tej roli, ponieważ jest wyżej w hierarchii niż moja najwyższa rola!",
                ephemeral: true,
            });
        }

        const existingRole = await LevelRole.findOne({
            guildId: interaction.guild.id,
            level: level,
        });

        if (existingRole) {
            return interaction.editReply({
                content: `❌ Rola dla poziomu ${level} już istnieje! Usuń ją najpierw używając \`/remove-level-role\`.`,
                ephemeral: true,
            });
        }

        const roleExists = await LevelRole.findOne({
            guildId: interaction.guild.id,
            roleId: role.id,
        });

        if (roleExists) {
            return interaction.editReply({
                content: `❌ Ta rola jest już używana dla poziomu ${roleExists.level}!`,
                ephemeral: true,
            });
        }

        try {
            const newLevelRole = new LevelRole({
                guildId: interaction.guild.id,
                level: level,
                roleId: role.id,
                removePrevious: removePrevious,
                createdAt: new Date(),
            });

            await newLevelRole.save();

            const embed = new EmbedBuilder()
                .setTitle("✅ Rola levelowa dodana!")
                .setColor("#2ecc71")
                .addFields([
                    {name: "📊 Poziom", value: `${level}`, inline: true},
                    {name: "🎭 Rola", value: `${role}`, inline: true},
                    {
                        name: "🔄 Usuwanie poprzednich",
                        value: removePrevious ? "✅ Tak" : "❌ Nie",
                        inline: true,
                    },
                    {
                        name: "⏰ Dodano",
                        value: `<t:${Math.floor(Date.now() / 1000)}:R>`,
                        inline: false,
                    },
                ])
                .setTimestamp();

            await interaction.editReply({embeds: [embed]});

            const Profile = require("../../models/Profile");
            const calculateLevel = (xp) => Math.floor(0.1 * Math.sqrt(xp));

            const profiles = await Profile.find({guildId: interaction.guild.id});
            let rolesAdded = 0;

            for (const profile of profiles) {
                const userLevel = calculateLevel(profile.xp);
                if (userLevel >= level) {
                    try {
                        const member = await interaction.guild.members.fetch(
                            profile.userId
                        );
                        if (member && !member.roles.cache.has(role.id)) {
                            await member.roles.add(role);
                            rolesAdded++;
                        }
                    } catch (error) {
                        console.error(
                            `Nie można nadać roli użytkownikowi ${profile.userId}:`,
                            error
                        );
                    }
                }
            }

            if (rolesAdded > 0) {
                await interaction.followUp({
                    content: `🎉 Automatycznie nadano rolę **${rolesAdded}** użytkownikom, którzy już osiągnęli poziom ${level}!`,
                    ephemeral: true,
                });
            }
        } catch (error) {
            console.error("Błąd podczas dodawania roli levelowej:", error);
            await interaction.editReply({
                content:
                    "❌ Wystąpił błąd podczas dodawania roli levelowej. Spróbuj ponownie.",
                ephemeral: true,
            });
        }
    },
};
