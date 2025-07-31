const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const TeamManager = require("../utils/team/teamManager");
const CooperativeHunt = require("../utils/hunt/cooperativeHunt");
const CooperativeInvestigation = require("../utils/investigate/cooperativeInvestigation");
const Profile = require("../models/Profile");
const Team = require("../models/Team");

const teamManager = new TeamManager();
const cooperativeHunt = new CooperativeHunt();
const cooperativeInvestigation = new CooperativeInvestigation();

async function handleTeamInteraction(interaction) {
    if (!interaction.isButton()) return;

    const customId = interaction.customId;
    const userId = interaction.user.id;
    const guildId = interaction.guild.id;

    try {
        if (customId.startsWith("team_accept_")) {
            await handleTeamAccept(interaction, customId, userId, guildId);
        } else if (customId.startsWith("team_decline_")) {
            await handleTeamDecline(interaction, customId, userId, guildId);
        } else if (customId.startsWith("team_confirm_leave_")) {
            await handleTeamConfirmLeave(interaction, customId, userId, guildId);
        } else if (customId.startsWith("team_confirm_disband_")) {
            await handleTeamConfirmDisband(interaction, customId, userId, guildId);
        } else if (customId.startsWith("team_cancel_")) {
            await handleTeamCancel(interaction);
        } else if (customId.startsWith("team_hunt_start_")) {
            await handleTeamHuntStart(interaction, customId, userId, guildId);
        } else if (customId.startsWith("team_hunt_cancel_")) {
            await handleTeamHuntCancel(interaction, customId);
        } else if (customId.startsWith("team_join_")) {
            await handleTeamSessionJoin(interaction, customId, userId, guildId);
        } else if (customId.startsWith("team_ready_")) {
            await handleTeamSessionReady(interaction, customId, userId, guildId);
        } else if (customId.startsWith("team_leave_")) {
            await handleTeamSessionLeave(interaction, customId, userId, guildId);
        } else if (customId.startsWith("team_start_")) {
            await handleTeamSessionStart(interaction, customId, userId, guildId);
        } else if (customId.startsWith("team_investigate_confirm_")) {
            await handleTeamInvestigateConfirm(
                interaction,
                customId,
                userId,
                guildId
            );
        } else if (customId.startsWith("team_investigate_cancel_")) {
            await handleTeamInvestigateCancel(interaction, customId);
        }
    } catch (error) {
        console.error("Team interaction error:", error);

        const errorEmbed = new EmbedBuilder()
            .setTitle("❌ Błąd")
            .setDescription("Wystąpił błąd podczas przetwarzania akcji zespołowej.")
            .setColor("#e74c3c");

        if (interaction.replied || interaction.deferred) {
            await interaction.editReply({embeds: [errorEmbed]});
        } else {
            await interaction.reply({embeds: [errorEmbed], ephemeral: true});
        }
    }
}

async function handleTeamAccept(interaction, customId, userId, guildId) {
    const parts = customId.split("_");
    const teamId = parts[2];
    const invitedUserId = parts[3];

    if (userId !== invitedUserId) {
        return interaction.reply({
            content: "❌ To zaproszenie nie jest dla ciebie.",
            ephemeral: true,
        });
    }

    const existingTeam = await teamManager.getUserTeam(guildId, userId);
    if (existingTeam) {
        return interaction.reply({
            content:
                "❌ Już należysz do zespołu! Opuść obecny zespół przed dołączeniem do nowego.",
            ephemeral: true,
        });
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

    await interaction.update({
        content: `✅ <@${userId}> dołączył do zespołu!`,
        embeds: [embed],
        components: [],
    });
}

async function handleTeamDecline(interaction, customId, userId, guildId) {
    const parts = customId.split("_");
    const invitedUserId = parts[3];

    if (userId !== invitedUserId) {
        return interaction.reply({
            content: "❌ To zaproszenie nie jest dla ciebie.",
            ephemeral: true,
        });
    }

    const embed = new EmbedBuilder()
        .setTitle("❌ Zaproszenie odrzucone")
        .setDescription(`<@${userId}> odrzucił zaproszenie do zespołu.`)
        .setColor("#e74c3c")
        .setTimestamp();

    await interaction.update({
        content: "",
        embeds: [embed],
        components: [],
    });
}

async function handleTeamConfirmLeave(interaction, customId, userId, guildId) {
    const parts = customId.split("_");
    const teamId = parts[3];
    const confirmUserId = parts[4];

    if (userId !== confirmUserId) {
        return interaction.reply({
            content: "❌ Nie możesz potwierdzić tej akcji.",
            ephemeral: true,
        });
    }

    const team = await teamManager.getTeamById(teamId);
    if (!team) {
        return interaction.reply({
            content: "❌ Zespół nie został znaleziony.",
            ephemeral: true,
        });
    }

    const result = await teamManager.leaveTeam(teamId, userId);

    const embed = new EmbedBuilder()
        .setTitle("✅ Opuszczono zespół")
        .setDescription(
            result
                ? `Pomyślnie opuściłeś zespół **${team.name}**`
                : `Zespół **${team.name}** został rozwiązany (byłeś jedynym członkiem)`
        )
        .setColor("#95a5a6")
        .setTimestamp();

    await interaction.update({embeds: [embed], components: []});
}

async function handleTeamConfirmDisband(
    interaction,
    customId,
    userId,
    guildId
) {
    const parts = customId.split("_");
    const teamId = parts[3];
    const confirmUserId = parts[4];

    if (userId !== confirmUserId) {
        return interaction.reply({
            content: "❌ Nie możesz potwierdzić tej akcji.",
            ephemeral: true,
        });
    }

    const team = await teamManager.getTeamById(teamId);
    if (!team) {
        return interaction.reply({
            content: "❌ Zespół nie został znaleziony.",
            ephemeral: true,
        });
    }

    if (!team.isLeader(userId)) {
        return interaction.reply({
            content: "❌ Tylko lider może rozwiązać zespół.",
            ephemeral: true,
        });
    }

    await Team.deleteOne({teamId});

    const embed = new EmbedBuilder()
        .setTitle("💥 Zespół rozwiązany")
        .setDescription(`Zespół **${team.name}** został rozwiązany.`)
        .setColor("#e74c3c")
        .setTimestamp();

    await interaction.update({embeds: [embed], components: []});
}

async function handleTeamCancel(interaction) {
    const embed = new EmbedBuilder()
        .setTitle("❌ Anulowano")
        .setDescription("Akcja została anulowana.")
        .setColor("#95a5a6");

    await interaction.update({embeds: [embed], components: []});
}

async function handleTeamHuntStart(interaction, customId, userId, guildId) {
    const parts = customId.split("_");
    const teamId = parts[3];

    const team = await teamManager.getTeamById(teamId);
    if (!team) {
        return interaction.reply({
            content: "❌ Zespół nie został znaleziony.",
            ephemeral: true,
        });
    }

    if (!team.isLeader(userId)) {
        return interaction.reply({
            content: "❌ Tylko lider zespołu może rozpocząć polowanie.",
            ephemeral: true,
        });
    }

    const targetGhost = require("../data/phasmophobiaData").ghosts[
        Math.floor(
            Math.random() * require("../data/phasmophobiaData").ghosts.length
        )
        ];
    const maps = require("../data/phasmophobiaData").maps;
    const selectedMap = maps[Math.floor(Math.random() * maps.length)];

    const teamSession = await teamManager.createTeamSession(
        team.teamId,
        interaction.channel.id,
        "hunt",
        {
            targetGhost,
            mapName: selectedMap.name,
            difficulty: "intermediate",
            shareRewards: team.settings.shareRewards,
            shareEvidence: team.settings.shareEvidence,
        }
    );

    await teamSession.addParticipant(userId);

    const embed = teamManager.createSessionEmbed(teamSession, team);
    const buttons = teamManager.createSessionButtons(teamSession);

    await interaction.update({
        content: team.members.map((m) => `<@${m.userId}>`).join(" "),
        embeds: [embed],
        components: [buttons],
    });
}

async function handleTeamHuntCancel(interaction, customId) {
    const embed = new EmbedBuilder()
        .setTitle("❌ Polowanie anulowane")
        .setDescription("Polowanie zespołowe zostało anulowane.")
        .setColor("#95a5a6");

    await interaction.update({embeds: [embed], components: []});
}

async function handleTeamSessionJoin(interaction, customId, userId, guildId) {
    const parts = customId.split("_");
    const sessionId = parts[2];

    const session = await teamManager.getActiveSession(sessionId);
    if (!session) {
        return interaction.reply({
            content: "❌ Sesja nie została znaleziona lub już się zakończyła.",
            ephemeral: true,
        });
    }

    const team = await teamManager.getTeamById(session.teamId);
    if (!team || !team.isMember(userId)) {
        return interaction.reply({
            content: "❌ Nie należysz do tego zespołu.",
            ephemeral: true,
        });
    }

    if (session.isParticipant(userId)) {
        return interaction.reply({
            content: "❌ Już uczestniczysz w tej sesji.",
            ephemeral: true,
        });
    }

    await teamManager.joinSession(sessionId, userId);

    const embed = teamManager.createSessionEmbed(session, team);
    const buttons = teamManager.createSessionButtons(session);

    await interaction.update({
        embeds: [embed],
        components: [buttons],
    });
}

async function handleTeamSessionReady(interaction, customId, userId, guildId) {
    const parts = customId.split("_");
    const sessionId = parts[2];

    const session = await teamManager.getActiveSession(sessionId);
    if (!session) {
        return interaction.reply({
            content: "❌ Sesja nie została znaleziona.",
            ephemeral: true,
        });
    }

    if (!session.isParticipant(userId)) {
        return interaction.reply({
            content: "❌ Nie uczestniczysz w tej sesji.",
            ephemeral: true,
        });
    }

    await teamManager.markReady(sessionId, userId);

    const team = await teamManager.getTeamById(session.teamId);
    const embed = teamManager.createSessionEmbed(session, team);
    const buttons = teamManager.createSessionButtons(session);

    await interaction.update({
        embeds: [embed],
        components: [buttons],
    });
}

async function handleTeamSessionLeave(interaction, customId, userId, guildId) {
    const parts = customId.split("_");
    const sessionId = parts[2];

    const session = await teamManager.getActiveSession(sessionId);
    if (!session) {
        return interaction.reply({
            content: "❌ Sesja nie została znaleziona.",
            ephemeral: true,
        });
    }

    if (!session.isParticipant(userId)) {
        return interaction.reply({
            content: "❌ Nie uczestniczysz w tej sesji.",
            ephemeral: true,
        });
    }

    await session.removeParticipant(userId);

    const team = await teamManager.getTeamById(session.teamId);
    const embed = teamManager.createSessionEmbed(session, team);
    const buttons = teamManager.createSessionButtons(session);

    await interaction.update({
        embeds: [embed],
        components: [buttons],
    });
}

async function handleTeamSessionStart(interaction, customId, userId, guildId) {
    const parts = customId.split("_");
    const sessionId = parts[2];

    const session = await teamManager.getActiveSession(sessionId);
    if (!session) {
        return interaction.reply({
            content: "❌ Sesja nie została znaleziona.",
            ephemeral: true,
        });
    }

    const team = await teamManager.getTeamById(session.teamId);
    if (!team || !team.isLeader(userId)) {
        return interaction.reply({
            content: "❌ Tylko lider zespołu może rozpocząć sesję.",
            ephemeral: true,
        });
    }

    if (!session.canStart()) {
        return interaction.reply({
            content: "❌ Nie wszyscy uczestnicy są gotowi.",
            ephemeral: true,
        });
    }

    await teamManager.startSession(sessionId);

    if (session.type === "hunt") {
        const huntState = cooperativeHunt.createCooperativeHuntState(
            session.huntData.targetGhost,
            session.huntData.mapName,
            session.huntData.difficulty,
            session
        );

        const embed = new EmbedBuilder()
            .setTitle("🎯 Polowanie zespołowe rozpoczęte!")
            .setDescription(
                `**Zespół:** ${team.name}\n` +
                `**Mapa:** ${session.huntData.mapName}\n` +
                `**Trudność:** ${session.huntData.difficulty}\n\n` +
                `Zespół rozpoczyna polowanie na ducha!`
            )
            .setColor("#27ae60");

        const actionButtons = cooperativeHunt.createTeamActionButtons(
            huntState,
            sessionId
        );

        await interaction.update({
            embeds: [embed],
            components: actionButtons,
        });
    } else if (session.type === "investigation") {
        const embed = new EmbedBuilder()
            .setTitle("🔍 Śledztwo zespołowe rozpoczęte!")
            .setDescription(
                `**Zespół:** ${team.name}\n` +
                `**Lokacja:** ${session.investigationData.location.name}\n\n` +
                `Zespół rozpoczyna śledztwo!`
            )
            .setColor("#27ae60");

        const actionButtons = cooperativeInvestigation.createTeamActionButtons(
            sessionId,
            session.investigationData.location,
            session
        );

        await interaction.update({
            embeds: [embed],
            components: actionButtons,
        });
    }
}

async function handleTeamInvestigateConfirm(
    interaction,
    customId,
    userId,
    guildId
) {
    const parts = customId.split("_");
    const sessionId = parts[3];

    const session = await teamManager.getActiveSession(sessionId);
    if (!session) {
        return interaction.reply({
            content: "❌ Sesja nie została znaleziona.",
            ephemeral: true,
        });
    }

    const team = await teamManager.getTeamById(session.teamId);
    if (!team || !team.isMember(userId)) {
        return interaction.reply({
            content: "❌ Nie należysz do tego zespołu.",
            ephemeral: true,
        });
    }

    if (!session.isParticipant(userId)) {
        await session.addParticipant(userId);
    }

    const embed = cooperativeInvestigation.createTeamEnterEmbed(
        session.investigationData.location,
        session
    );

    const actionButtons = cooperativeInvestigation.createTeamActionButtons(
        sessionId,
        session.investigationData.location,
        session
    );

    await interaction.update({
        embeds: [embed],
        components: actionButtons,
    });
}

async function handleTeamInvestigateCancel(interaction, customId) {
    const embed = cooperativeInvestigation.createTeamCancelEmbed();
    await interaction.update({embeds: [embed], components: []});
}

module.exports = {
    handleTeamInteraction,
};
