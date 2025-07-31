const mongoose = require("mongoose");

const teamSessionSchema = new mongoose.Schema({
    sessionId: {
        type: String,
        required: true,
        unique: true,
    },
    teamId: {
        type: String,
        required: true,
    },
    guildId: {
        type: String,
        required: true,
    },
    channelId: {
        type: String,
        required: true,
    },
    type: {
        type: String,
        enum: ["hunt", "investigation"],
        required: true,
    },
    status: {
        type: String,
        enum: ["waiting", "active", "completed", "cancelled"],
        default: "waiting",
    },
    participants: [
        {
            userId: String,
            status: {
                type: String,
                enum: ["joined", "ready", "active", "disconnected"],
                default: "joined",
            },
            joinedAt: {
                type: Date,
                default: Date.now,
            },
            contribution: {
                actionsUsed: {
                    type: Number,
                    default: 0,
                },
                evidenceFound: [
                    {
                        type: String,
                    },
                ],
                sanityLost: {
                    type: Number,
                    default: 0,
                },
                earnings: {
                    type: Number,
                    default: 0,
                },
            },
        },
    ],

    huntData: {
        targetGhost: {
            type: mongoose.Schema.Types.Mixed,
        },
        mapName: String,
        difficulty: String,
        selectedItems: [
            {
                userId: String,
                items: [String],
            },
        ],
        sharedEvidence: [String],
        timeRemaining: Number,
        totalActions: {
            type: Number,
            default: 0,
        },
        maxActions: {
            type: Number,
            default: 20,
        },
        teamSanity: {
            type: Number,
            default: 100,
        },
        isCompleted: {
            type: Boolean,
            default: false,
        },
        isCorrect: {
            type: Boolean,
            default: false,
        },
    },

    investigationData: {
        location: {
            type: mongoose.Schema.Types.Mixed,
        },
        sharedFinds: [
            {
                findType: String,
                foundBy: String,
                area: String,
                timestamp: {
                    type: Date,
                    default: Date.now,
                },
                details: mongoose.Schema.Types.Mixed,
            },
        ],
        totalExperience: {
            type: Number,
            default: 0,
        },
        totalEarnings: {
            type: Number,
            default: 0,
        },
        areasSearched: [String],
    },

    settings: {
        shareRewards: {
            type: Boolean,
            default: true,
        },
        shareEvidence: {
            type: Boolean,
            default: true,
        },
        allowLateJoin: {
            type: Boolean,
            default: true,
        },
        maxWaitTime: {
            type: Number,
            default: 300000,
        },
    },

    createdAt: {
        type: Date,
        default: Date.now,
    },
    startedAt: Date,
    completedAt: Date,

    expiresAt: {
        type: Date,
        default: Date.now,
        expires: 7200,
    },
});

teamSessionSchema.index({sessionId: 1});
teamSessionSchema.index({teamId: 1, status: 1});
teamSessionSchema.index({guildId: 1, channelId: 1});
teamSessionSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});

teamSessionSchema.methods.addParticipant = function (userId) {
    if (this.participants.some((p) => p.userId === userId)) {
        throw new Error("User is already a participant");
    }

    this.participants.push({userId});
    return this.save();
};

teamSessionSchema.methods.removeParticipant = function (userId) {
    const participantIndex = this.participants.findIndex(
        (p) => p.userId === userId
    );
    if (participantIndex === -1) {
        throw new Error("User is not a participant");
    }

    this.participants.splice(participantIndex, 1);
    return this.save();
};

teamSessionSchema.methods.updateParticipantStatus = function (userId, status) {
    const participant = this.participants.find((p) => p.userId === userId);
    if (!participant) {
        throw new Error("User is not a participant");
    }

    participant.status = status;
    return this.save();
};

teamSessionSchema.methods.addEvidence = function (userId, evidence) {
    if (this.type !== "hunt") {
        throw new Error("Evidence can only be added to hunt sessions");
    }

    const participant = this.participants.find((p) => p.userId === userId);
    if (!participant) {
        throw new Error("User is not a participant");
    }

    if (!this.huntData.sharedEvidence.includes(evidence)) {
        this.huntData.sharedEvidence.push(evidence);
    }

    if (!participant.contribution.evidenceFound.includes(evidence)) {
        participant.contribution.evidenceFound.push(evidence);
    }

    return this.save();
};

teamSessionSchema.methods.addFind = function (userId, findData) {
    if (this.type !== "investigation") {
        throw new Error("Finds can only be added to investigation sessions");
    }

    const participant = this.participants.find((p) => p.userId === userId);
    if (!participant) {
        throw new Error("User is not a participant");
    }

    this.investigationData.sharedFinds.push({
        ...findData,
        foundBy: userId,
    });

    return this.save();
};

teamSessionSchema.methods.isParticipant = function (userId) {
    return this.participants.some((p) => p.userId === userId);
};

teamSessionSchema.methods.getParticipantCount = function () {
    return this.participants.length;
};

teamSessionSchema.methods.getReadyCount = function () {
    return this.participants.filter((p) => p.status === "ready").length;
};

teamSessionSchema.methods.canStart = function () {
    return (
        this.getParticipantCount() >= 2 &&
        this.getReadyCount() === this.getParticipantCount()
    );
};

teamSessionSchema.methods.start = function () {
    if (!this.canStart()) {
        throw new Error("Session cannot be started");
    }

    this.status = "active";
    this.startedAt = new Date();

    this.participants.forEach((p) => {
        p.status = "active";
    });

    return this.save();
};

teamSessionSchema.methods.complete = function (results = {}) {
    this.status = "completed";
    this.completedAt = new Date();

    if (this.type === "hunt") {
        this.huntData.isCompleted = true;
        this.huntData.isCorrect = results.isCorrect || false;
    }

    return this.save();
};

module.exports = mongoose.model("TeamSession", teamSessionSchema);
