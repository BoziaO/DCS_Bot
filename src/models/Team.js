const mongoose = require("mongoose");

const teamSchema = new mongoose.Schema({
  teamId: {
    type: String,
    required: true,
    unique: true,
  },
  guildId: {
    type: String,
    required: true,
  },
  leaderId: {
    type: String,
    required: true,
  },
  members: [
    {
      userId: String,
      joinedAt: {
        type: Date,
        default: Date.now,
      },
      role: {
        type: String,
        enum: ["leader", "member"],
        default: "member",
      },
    },
  ],
  name: {
    type: String,
    required: true,
    maxlength: 50,
  },
  description: {
    type: String,
    maxlength: 200,
  },
  maxMembers: {
    type: Number,
    default: 4,
    min: 2,
    max: 8,
  },
  isPrivate: {
    type: Boolean,
    default: false,
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
    requireAllMembers: {
      type: Boolean,
      default: false,
    },
    allowSpectators: {
      type: Boolean,
      default: true,
    },
  },
  stats: {
    totalHunts: {
      type: Number,
      default: 0,
    },
    successfulHunts: {
      type: Number,
      default: 0,
    },
    totalInvestigations: {
      type: Number,
      default: 0,
    },
    totalEarnings: {
      type: Number,
      default: 0,
    },
    ghostsIdentified: {
      type: Map,
      of: Number,
      default: new Map(),
    },
    evidenceFound: {
      type: Map,
      of: Number,
      default: new Map(),
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },
});

// Indeksy dla lepszej wydajności
teamSchema.index({ guildId: 1, leaderId: 1 });
teamSchema.index({ guildId: 1, "members.userId": 1 });
teamSchema.index({ teamId: 1 });

// Metody pomocnicze
teamSchema.methods.addMember = function (userId) {
  if (this.members.length >= this.maxMembers) {
    throw new Error("Team is full");
  }

  if (this.members.some((member) => member.userId === userId)) {
    throw new Error("User is already a member");
  }

  this.members.push({ userId, role: "member" });
  this.lastActivity = new Date();
  return this.save();
};

teamSchema.methods.removeMember = function (userId) {
  const memberIndex = this.members.findIndex(
    (member) => member.userId === userId
  );
  if (memberIndex === -1) {
    throw new Error("User is not a member");
  }

  this.members.splice(memberIndex, 1);
  this.lastActivity = new Date();
  return this.save();
};

teamSchema.methods.isMember = function (userId) {
  return this.members.some((member) => member.userId === userId);
};

teamSchema.methods.isLeader = function (userId) {
  return this.leaderId === userId;
};

teamSchema.methods.getMemberCount = function () {
  return this.members.length;
};

teamSchema.methods.updateStats = function (huntResult) {
  this.stats.totalHunts += 1;
  if (huntResult.success) {
    this.stats.successfulHunts += 1;
  }
  this.stats.totalEarnings += huntResult.earnings || 0;

  if (huntResult.ghostIdentified) {
    const currentCount =
      this.stats.ghostsIdentified.get(huntResult.ghostIdentified) || 0;
    this.stats.ghostsIdentified.set(
      huntResult.ghostIdentified,
      currentCount + 1
    );
  }

  if (huntResult.evidenceFound && Array.isArray(huntResult.evidenceFound)) {
    huntResult.evidenceFound.forEach((evidence) => {
      const currentCount = this.stats.evidenceFound.get(evidence) || 0;
      this.stats.evidenceFound.set(evidence, currentCount + 1);
    });
  }

  this.lastActivity = new Date();
  return this.save();
};

module.exports = mongoose.model("Team", teamSchema);
