const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const TeamManager = require("../../utils/team/teamManager");
const Profile = require("../../models/Profile");

const teamManager = new TeamManager();

module.exports = {
    data: new SlashCommandBuilder()
        .setName("team")
        .setDescription(
            "Zarządzaj swoim zespołem do kooperacyjnych polowań i śledztw"
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("create")
                .setDescription("Utwórz nowy zespół")
                .addStringOption((option) =>
                    option
                        .setName("name")
                        .setDescription("Nazwa zespołu")
                        .setRequired(true)
                        .setMaxLength(50)
                )
                .addStringOption((option) =>
                    option
                        .setName("description")
                        .setDescription("Opis zespołu")
                        .setRequired(false)
                        .setMaxLength(200)
                )
                .addIntegerOption((option) =>
                    option
                        .setName("max_members")
                        .setDescription("Maksymalna liczba członków (2-8)")
                        .setRequired(false)
                        .setMinValue(2)
                        .setMaxValue(8)
                )
                .addBooleanOption((option) =>
                    option
                        .setName("private")
                        .setDescription("Czy zespół ma być prywatny")
                        .setRequired(false)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("info")
                .setDescription("Pokaż informacje o swoim zespole")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("invite")
                .setDescription("Zaproś użytkownika do zespołu")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("Użytkownik do zaproszenia")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("join")
                .setDescription("Dołącz do zespołu")
                .addStringOption((option) =>
                    option
                        .setName("team_id")
                        .setDescription("ID zespołu")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand.setName("leave").setDescription("Opuść swój zespół")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("disband")
                .setDescription("Rozwiąż zespół (tylko lider)")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("kick")
                .setDescription("Wyrzuć członka z zespołu (tylko lider)")
                .addUserOption((option) =>
                    option
                        .setName("user")
                        .setDescription("Użytkownik do wyrzucenia")
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("settings")
                .setDescription("Zmień ustawienia zespołu (tylko lider)")
                .addBooleanOption((option) =>
                    option
                        .setName("share_rewards")
                        .setDescription("Czy dzielić nagrody równo między członków")
                        .setRequired(false)
                )
                .addBooleanOption((option) =>
                    option
                        .setName("share_evidence")
                        .setDescription("Czy dzielić dowody między członków")
                        .setRequired(false)
                )
                .addBooleanOption((option) =>
                    option
                        .setName("require_all_members")
                        .setDescription("Czy wymagać wszystkich członków do rozpoczęcia")
                        .setRequired(false)
                )
        ),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        try {
            switch (subcommand) {
                case "create":
                    await this.handleCreate(interaction, userId, guildId);
                    break;
                case "info":
                    await this.handleInfo(interaction, userId, guildId);
                    break;
                case "invite":
                    await this.handleInvite(interaction, userId, guildId);
                    break;
                case "join":
                    await this.handleJoin(interaction, userId, guildId);
                    break;
                case "leave":
                    await this.handleLeave(interaction, userId, guildId);
                    break;
                case "disband":
                    await this.handleDisband(interaction, userId, guildId);
                    break;
                case "kick":
                    await this.handleKick(interaction, userId, guildId);
                    break;
                case "settings":
                    await this.handleSettings(interaction, userId, guildId);
                    break;
            }
        } catch (error) {
            console.error("Team command error:", error);

            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Błąd")
                .setDescription(error.message || "Wystąpił nieoczekiwany błąd.")
                .setColor("#e74c3c");

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({embeds: [errorEmbed]});
            } else {
                await interaction.reply({embeds: [errorEmbed], ephemeral: true});
            }
        }
    },

    async handleCreate(interaction, userId, guildId) {
        const existingTeam = await teamManager.getUserTeam(guildId, userId);
        if (existingTeam) {
            throw new Error(
                "Już należysz do zespołu! Opuść obecny zespół przed utworzeniem nowego."
            );
        }

        const name = interaction.options.getString("name");
        const description = interaction.options.getString("description") || "";
        const maxMembers = interaction.options.getInteger("max_members") || 4;
        const isPrivate = interaction.options.getBoolean("private") || false;

        const team = await teamManager.createTeam(guildId, userId, name, {
            description,
            maxMembers,
            isPrivate,
        });

        const embed = new EmbedBuilder()
            .setTitle("✅ Zespół utworzony!")
            .setDescription(`Pomyślnie utworzono zespół **${team.name}**`)
            .addFields([
                {name: "🆔 ID zespołu", value: `\`${team.teamId}\``, inline: true},
                {
                    name: "👥 Maksymalna liczba członków",
                    value: `${team.maxMembers}`,
                    inline: true,
                },
                {
                    name: "🔒 Prywatny",
                    value: team.isPrivate ? "Tak" : "Nie",
                    inline: true,
                },
                {
                    name: "📝 Opis",
                    value: team.description || "*Brak opisu*",
                    inline: false,
                },
            ])
            .setColor("#27ae60")
            .setTimestamp();

        await interaction.reply({embeds: [embed]});
    },

    async handleInfo(interaction, userId, guildId) {
        const team = await teamManager.getUserTeam(guildId, userId);
        if (!team) {
            throw new Error(
                "Nie należysz do żadnego zespołu. Użyj `/team create` aby utworzyć zespół lub `/team join` aby dołączyć do istniejącego."
            );
        }

        const embed = teamManager.createTeamEmbed(team);

        embed.addFields([
            {name: "🆔 ID zespołu", value: `\`${team.teamId}\``, inline: true},
        ]);

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`team_invite_${team.teamId}`)
                .setLabel("Zaproś członka")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("➕")
                .setDisabled(!team.isLeader(userId)),
            new ButtonBuilder()
                .setCustomId(`team_settings_${team.teamId}`)
                .setLabel("Ustawienia")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("⚙️")
                .setDisabled(!team.isLeader(userId)),
            new ButtonBuilder()
                .setCustomId(`team_leave_${team.teamId}`)
                .setLabel("Opuść zespół")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("🚪")
        );

        await interaction.reply({embeds: [embed], components: [actionRow]});
    },

    async handleInvite(interaction, userId, guildId) {
        const team = await teamManager.getUserTeam(guildId, userId);
        if (!team) {
            throw new Error("Nie należysz do żadnego zespołu.");
        }

        if (!team.isLeader(userId)) {
            throw new Error("Tylko lider zespołu może zapraszać nowych członków.");
        }

        const targetUser = interaction.options.getUser("user");
        if (targetUser.id === userId) {
            throw new Error("Nie możesz zaprosić samego siebie.");
        }

        if (team.isMember(targetUser.id)) {
            throw new Error("Ten użytkownik już należy do twojego zespołu.");
        }

        if (team.getMemberCount() >= team.maxMembers) {
            throw new Error("Zespół jest pełny.");
        }

        const targetUserTeam = await teamManager.getUserTeam(
            guildId,
            targetUser.id
        );
        if (targetUserTeam) {
            throw new Error("Ten użytkownik już należy do innego zespołu.");
        }

        const embed = new EmbedBuilder()
            .setTitle("📨 Zaproszenie do zespołu")
            .setDescription(
                `<@${targetUser.id}>, zostałeś zaproszony do zespołu **${team.name}** przez <@${userId}>!\n\n` +
                `**Informacje o zespole:**\n` +
                `👥 Członkowie: ${team.getMemberCount()}/${team.maxMembers}\n` +
                `📝 Opis: ${team.description || "*Brak opisu*"}\n\n` +
                `Czy chcesz dołączyć do tego zespołu?`
            )
            .setColor("#3498db")
            .setTimestamp();

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`team_accept_${team.teamId}_${targetUser.id}`)
                .setLabel("Akceptuj")
                .setStyle(ButtonStyle.Success)
                .setEmoji("✅"),
            new ButtonBuilder()
                .setCustomId(`team_decline_${team.teamId}_${targetUser.id}`)
                .setLabel("Odrzuć")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("❌")
        );

        await interaction.reply({
            content: `<@${targetUser.id}>`,
            embeds: [embed],
            components: [actionRow],
        });
    },

    async handleJoin(interaction, userId, guildId) {
        const teamId = interaction.options.getString("team_id");

        const existingTeam = await teamManager.getUserTeam(guildId, userId);
        if (existingTeam) {
            throw new Error(
                "Już należysz do zespołu! Opuść obecny zespół przed dołączeniem do nowego."
            );
        }

        const team = await teamManager.joinTeam(teamId, userId);

        const embed = new EmbedBuilder()
            .setTitle("✅ Dołączono do zespołu!")
            .setDescription(`Pomyślnie dołączyłeś do zespołu **${team.name}**`)
            .addFields([
                {
                    name: "👥 Członkowie",
                    value: `${team.getMemberCount()}/${team.maxMembers}`,
                    inline: true,
                },
                {name: "👑 Lider", value: `<@${team.leaderId}>`, inline: true},
            ])
            .setColor("#27ae60")
            .setTimestamp();

        await interaction.reply({embeds: [embed]});
    },

    async handleLeave(interaction, userId, guildId) {
        const team = await teamManager.getUserTeam(guildId, userId);
        if (!team) {
            throw new Error("Nie należysz do żadnego zespołu.");
        }

        const isLeader = team.isLeader(userId);
        const remainingMembers = team.getMemberCount() - 1;

        if (isLeader && remainingMembers > 0) {
            const embed = new EmbedBuilder()
                .setTitle("⚠️ Potwierdzenie")
                .setDescription(
                    `Jesteś liderem zespołu **${team.name}**. Opuszczenie zespołu spowoduje:\n\n` +
                    `• Przekazanie przywództwa innemu członkowi\n` +
                    `• Lub rozwiązanie zespołu jeśli jesteś jedynym członkiem\n\n` +
                    `Czy na pewno chcesz opuścić zespół?`
                )
                .setColor("#f39c12");

            const actionRow = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`team_confirm_leave_${team.teamId}_${userId}`)
                    .setLabel("Tak, opuść zespół")
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji("✅"),
                new ButtonBuilder()
                    .setCustomId(`team_cancel_leave_${team.teamId}`)
                    .setLabel("Anuluj")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("❌")
            );

            await interaction.reply({embeds: [embed], components: [actionRow]});
            return;
        }

        const result = await teamManager.leaveTeam(team.teamId, userId);

        const embed = new EmbedBuilder()
            .setTitle("✅ Opuszczono zespół")
            .setDescription(
                result
                    ? `Pomyślnie opuściłeś zespół **${team.name}**`
                    : `Zespół **${team.name}** został rozwiązany (byłeś jedynym członkiem)`
            )
            .setColor("#95a5a6")
            .setTimestamp();

        await interaction.reply({embeds: [embed]});
    },

    async handleDisband(interaction, userId, guildId) {
        const team = await teamManager.getUserTeam(guildId, userId);
        if (!team) {
            throw new Error("Nie należysz do żadnego zespołu.");
        }

        if (!team.isLeader(userId)) {
            throw new Error("Tylko lider zespołu może rozwiązać zespół.");
        }

        const embed = new EmbedBuilder()
            .setTitle("⚠️ Potwierdzenie rozwiązania zespołu")
            .setDescription(
                `Czy na pewno chcesz rozwiązać zespół **${team.name}**?\n\n` +
                `**Ta akcja jest nieodwracalna!**\n` +
                `Wszyscy członkowie (${team.getMemberCount()}) zostaną usunięci z zespołu.`
            )
            .setColor("#e74c3c");

        const actionRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`team_confirm_disband_${team.teamId}_${userId}`)
                .setLabel("Tak, rozwiąż zespół")
                .setStyle(ButtonStyle.Danger)
                .setEmoji("💥"),
            new ButtonBuilder()
                .setCustomId(`team_cancel_disband_${team.teamId}`)
                .setLabel("Anuluj")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("❌")
        );

        await interaction.reply({embeds: [embed], components: [actionRow]});
    },

    async handleKick(interaction, userId, guildId) {
        const team = await teamManager.getUserTeam(guildId, userId);
        if (!team) {
            throw new Error("Nie należysz do żadnego zespołu.");
        }

        if (!team.isLeader(userId)) {
            throw new Error("Tylko lider zespołu może wyrzucać członków.");
        }

        const targetUser = interaction.options.getUser("user");
        if (targetUser.id === userId) {
            throw new Error(
                "Nie możesz wyrzucić samego siebie. Użyj `/team leave` aby opuścić zespół."
            );
        }

        if (!team.isMember(targetUser.id)) {
            throw new Error("Ten użytkownik nie należy do twojego zespołu.");
        }

        await team.removeMember(targetUser.id);

        const embed = new EmbedBuilder()
            .setTitle("✅ Członek wyrzucony")
            .setDescription(
                `<@${targetUser.id}> został wyrzucony z zespołu **${team.name}**`
            )
            .setColor("#e74c3c")
            .setTimestamp();

        await interaction.reply({embeds: [embed]});
    },

    async handleSettings(interaction, userId, guildId) {
        const team = await teamManager.getUserTeam(guildId, userId);
        if (!team) {
            throw new Error("Nie należysz do żadnego zespołu.");
        }

        if (!team.isLeader(userId)) {
            throw new Error("Tylko lider zespołu może zmieniać ustawienia.");
        }

        const shareRewards = interaction.options.getBoolean("share_rewards");
        const shareEvidence = interaction.options.getBoolean("share_evidence");
        const requireAllMembers = interaction.options.getBoolean(
            "require_all_members"
        );

        let updated = false;
        const changes = [];

        if (shareRewards !== null) {
            team.settings.shareRewards = shareRewards;
            changes.push(
                `Dzielenie nagród: ${shareRewards ? "Włączone" : "Wyłączone"}`
            );
            updated = true;
        }

        if (shareEvidence !== null) {
            team.settings.shareEvidence = shareEvidence;
            changes.push(
                `Dzielenie dowodów: ${shareEvidence ? "Włączone" : "Wyłączone"}`
            );
            updated = true;
        }

        if (requireAllMembers !== null) {
            team.settings.requireAllMembers = requireAllMembers;
            changes.push(
                `Wymaganie wszystkich członków: ${
                    requireAllMembers ? "Włączone" : "Wyłączone"
                }`
            );
            updated = true;
        }

        if (!updated) {
            throw new Error("Nie podano żadnych ustawień do zmiany.");
        }

        await team.save();

        const embed = new EmbedBuilder()
            .setTitle("✅ Ustawienia zaktualizowane")
            .setDescription(
                `Zaktualizowano ustawienia zespołu **${team.name}**:\n\n${changes.join(
                    "\n"
                )}`
            )
            .setColor("#27ae60")
            .setTimestamp();

        await interaction.reply({embeds: [embed]});
    },
};
