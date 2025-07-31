const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const Team = require("../../models/Team");
const TeamSession = require("../../models/TeamSession");
const {v4: uuidv4} = require("uuid");

class TeamManager {
    constructor() {
        this.activeSessions = new Map();
    }

    async createTeam(guildId, leaderId, name, options = {}) {
        const teamId = uuidv4();

        const team = new Team({
            teamId,
            guildId,
            leaderId,
            name,
            description: options.description || "",
            maxMembers: options.maxMembers || 4,
            isPrivate: options.isPrivate || false,
            settings: {
                shareRewards: options.shareRewards !== false,
                shareEvidence: options.shareEvidence !== false,
                requireAllMembers: options.requireAllMembers || false,
                allowSpectators: options.allowSpectators !== false,
            },
            members: [
                {
                    userId: leaderId,
                    role: "leader",
                    joinedAt: new Date(),
                },
            ],
        });

        await team.save();
        return team;
    }

    async getUserTeam(guildId, userId) {
        return await Team.findOne({
            guildId,
            $or: [{leaderId: userId}, {"members.userId": userId}],
        });
    }

    async getTeamById(teamId) {
        return await Team.findOne({teamId});
    }

    async joinTeam(teamId, userId) {
        const team = await this.getTeamById(teamId);
        if (!team) {
            throw new Error("Team not found");
        }

        if (team.isMember(userId)) {
            throw new Error("User is already a member of this team");
        }

        if (team.getMemberCount() >= team.maxMembers) {
            throw new Error("Team is full");
        }

        await team.addMember(userId);
        return team;
    }

    async leaveTeam(teamId, userId) {
        const team = await this.getTeamById(teamId);
        if (!team) {
            throw new Error("Team not found");
        }

        if (!team.isMember(userId)) {
            throw new Error("User is not a member of this team");
        }

        if (team.isLeader(userId)) {
            if (team.getMemberCount() > 1) {
                const newLeader = team.members.find((m) => m.userId !== userId);
                team.leaderId = newLeader.userId;
                newLeader.role = "leader";
            } else {
                await Team.deleteOne({teamId});
                return null;
            }
        }

        await team.removeMember(userId);
        return team;
    }

    async createTeamSession(teamId, channelId, type, options = {}) {
        const team = await this.getTeamById(teamId);
        if (!team) {
            throw new Error("Team not found");
        }

        const sessionId = uuidv4();

        const session = new TeamSession({
            sessionId,
            teamId,
            guildId: team.guildId,
            channelId,
            type,
            settings: {
                shareRewards: options.shareRewards !== false,
                shareEvidence: options.shareEvidence !== false,
                allowLateJoin: options.allowLateJoin !== false,
                maxWaitTime: options.maxWaitTime || 300000,
            },
        });

        if (type === "hunt") {
            session.huntData = {
                targetGhost: options.targetGhost,
                mapName: options.mapName,
                difficulty: options.difficulty,
                selectedItems: [],
                sharedEvidence: [],
                timeRemaining: options.timeRemaining || 600000,
                maxActions: options.maxActions || 20,
                teamSanity: 100,
            };
        } else if (type === "investigation") {
            session.investigationData = {
                location: options.location,
                sharedFinds: [],
                totalExperience: 0,
                totalEarnings: 0,
                areasSearched: [],
            };
        }

        await session.save();
        this.activeSessions.set(sessionId, session);

        return session;
    }

    async getActiveSession(sessionId) {
        if (this.activeSessions.has(sessionId)) {
            return this.activeSessions.get(sessionId);
        }

        const session = await TeamSession.findOne({
            sessionId,
            status: {$in: ["waiting", "active"]},
        });

        if (session) {
            this.activeSessions.set(sessionId, session);
        }

        return session;
    }

    async joinSession(sessionId, userId) {
        const session = await this.getActiveSession(sessionId);
        if (!session) {
            throw new Error("Session not found or not active");
        }

        const team = await this.getTeamById(session.teamId);
        if (!team || !team.isMember(userId)) {
            throw new Error("User is not a member of this team");
        }

        if (session.isParticipant(userId)) {
            throw new Error("User is already in this session");
        }

        if (session.status === "active" && !session.settings.allowLateJoin) {
            throw new Error("Late joining is not allowed for this session");
        }

        await session.addParticipant(userId);
        this.activeSessions.set(sessionId, session);

        return session;
    }

    async markReady(sessionId, userId) {
        const session = await this.getActiveSession(sessionId);
        if (!session) {
            throw new Error("Session not found");
        }

        if (!session.isParticipant(userId)) {
            throw new Error("User is not a participant");
        }

        await session.updateParticipantStatus(userId, "ready");
        this.activeSessions.set(sessionId, session);

        return session;
    }

    async startSession(sessionId) {
        const session = await this.getActiveSession(sessionId);
        if (!session) {
            throw new Error("Session not found");
        }

        if (!session.canStart()) {
            throw new Error(
                "Session cannot be started - not all participants are ready"
            );
        }

        await session.start();
        this.activeSessions.set(sessionId, session);

        return session;
    }

    async completeSession(sessionId, results = {}) {
        const session = await this.getActiveSession(sessionId);
        if (!session) {
            throw new Error("Session not found");
        }

        await session.complete(results);

        const team = await this.getTeamById(session.teamId);
        if (team) {
            await team.updateStats(results);
        }

        this.activeSessions.delete(sessionId);

        return session;
    }

    createTeamEmbed(team) {
        const membersList = team.members
            .map((member) => {
                const role = member.role === "leader" ? "👑" : "👤";
                return `${role} <@${member.userId}>`;
            })
            .join("\n");

        const successRate =
            team.stats.totalHunts > 0
                ? Math.round((team.stats.successfulHunts / team.stats.totalHunts) * 100)
                : 0;

        return new EmbedBuilder()
            .setTitle(`👥 ${team.name}`)
            .setDescription(team.description || "*Brak opisu*")
            .addFields([
                {
                    name: "👥 Członkowie",
                    value: membersList || "Brak członków",
                    inline: true,
                },
                {
                    name: "📊 Statystyki",
                    value:
                        `🎯 Polowania: ${team.stats.totalHunts}\n` +
                        `✅ Sukces: ${successRate}%\n` +
                        `💰 Zarobki: $${team.stats.totalEarnings}`,
                    inline: true,
                },
                {
                    name: "⚙️ Ustawienia",
                    value:
                        `👥 Max członków: ${team.maxMembers}\n` +
                        `💰 Dzielenie nagród: ${
                            team.settings.shareRewards ? "✅" : "❌"
                        }\n` +
                        `🔍 Dzielenie dowodów: ${
                            team.settings.shareEvidence ? "✅" : "❌"
                        }`,
                    inline: false,
                },
            ])
            .setColor("#3498db")
            .setTimestamp();
    }

    createSessionEmbed(session, team) {
        const participantsList = session.participants
            .map((p) => {
                const status = this.getStatusEmoji(p.status);
                return `${status} <@${p.userId}>`;
            })
            .join("\n");

        const embed = new EmbedBuilder()
            .setTitle(
                `🎮 Sesja zespołowa - ${
                    session.type === "hunt" ? "Polowanie" : "Śledztwo"
                }`
            )
            .setDescription(`Zespół: **${team.name}**`)
            .addFields([
                {
                    name: "👥 Uczestnicy",
                    value: participantsList || "Brak uczestników",
                    inline: true,
                },
                {
                    name: "📊 Status",
                    value:
                        `Status: ${this.getSessionStatusText(session.status)}\n` +
                        `Gotowi: ${session.getReadyCount()}/${session.getParticipantCount()}`,
                    inline: true,
                },
            ])
            .setColor(this.getSessionColor(session.status))
            .setTimestamp();

        if (session.type === "hunt" && session.huntData) {
            embed.addFields([
                {
                    name: "🎯 Szczegóły polowania",
                    value:
                        `🗺️ Mapa: ${session.huntData.mapName}\n` +
                        `⚡ Trudność: ${session.huntData.difficulty}\n` +
                        `🔍 Dowody: ${session.huntData.sharedEvidence.length}/3`,
                    inline: false,
                },
            ]);
        }

        if (session.type === "investigation" && session.investigationData) {
            embed.addFields([
                {
                    name: "🔍 Szczegóły śledztwa",
                    value:
                        `📍 Lokacja: ${
                            session.investigationData.location?.name || "Nieznana"
                        }\n` +
                        `🎒 Znaleziska: ${session.investigationData.sharedFinds.length}\n` +
                        `💰 Zarobki: $${session.investigationData.totalEarnings}`,
                    inline: false,
                },
            ]);
        }

        return embed;
    }

    createSessionButtons(session) {
        const row = new ActionRowBuilder();

        if (session.status === "waiting") {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`team_join_${session.sessionId}`)
                    .setLabel("Dołącz")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("➕"),
                new ButtonBuilder()
                    .setCustomId(`team_ready_${session.sessionId}`)
                    .setLabel("Gotowy")
                    .setStyle(ButtonStyle.Success)
                    .setEmoji("✅"),
                new ButtonBuilder()
                    .setCustomId(`team_leave_${session.sessionId}`)
                    .setLabel("Opuść")
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji("❌")
            );

            if (session.canStart()) {
                row.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`team_start_${session.sessionId}`)
                        .setLabel("Rozpocznij")
                        .setStyle(ButtonStyle.Success)
                        .setEmoji("🚀")
                );
            }
        }

        return row;
    }

    getStatusEmoji(status) {
        const emojis = {
            joined: "⏳",
            ready: "✅",
            active: "🎮",
            disconnected: "❌",
        };
        return emojis[status] || "❓";
    }

    getSessionStatusText(status) {
        const texts = {
            waiting: "Oczekiwanie",
            active: "Aktywna",
            completed: "Zakończona",
            cancelled: "Anulowana",
        };
        return texts[status] || "Nieznany";
    }

    getSessionColor(status) {
        const colors = {
            waiting: "#f39c12",
            active: "#27ae60",
            completed: "#3498db",
            cancelled: "#e74c3c",
        };
        return colors[status] || "#95a5a6";
    }

    async cleanupInactiveSessions() {
        const expiredSessions = await TeamSession.find({
            status: {$in: ["waiting", "active"]},
            createdAt: {$lt: new Date(Date.now() - 2 * 60 * 60 * 1000)},
        });

        for (const session of expiredSessions) {
            session.status = "cancelled";
            await session.save();
            this.activeSessions.delete(session.sessionId);
        }

        return expiredSessions.length;
    }
}

module.exports = TeamManager;
