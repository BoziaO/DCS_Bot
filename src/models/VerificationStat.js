const { Schema, model } = require("mongoose");

/**
 * Model for storing verification statistics
 * Replaces the in-memory stats in VerificationStats class
 */
const verificationStatSchema = new Schema(
  {
    userId: { type: String },
    guildId: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    method: {
      type: String,
      enum: ["basic", "challenge", "speed"],
      default: "basic",
    },
    timeTaken: { type: Number, default: 0 },
    challengeType: { type: String },
    score: { type: Number },
    theme: { type: String, default: "classic" },

    isGuildStat: { type: Boolean, default: false },
    totalVerifications: { type: Number, default: 0 },
    challengeCompletions: { type: Number, default: 0 },
    fastestTime: { type: Number },
    slowestTime: { type: Number },
    methodStats: {
      basic: { type: Number, default: 0 },
      challenge: { type: Number, default: 0 },
      speed: { type: Number, default: 0 },
    },
    popularTheme: { type: Map, of: Number, default: {} },
    dailyVerifications: { type: Map, of: Number, default: {} },
  },
  { timestamps: true }
);

verificationStatSchema.index({ userId: 1, guildId: 1 });
verificationStatSchema.index({ guildId: 1, isGuildStat: 1 });
verificationStatSchema.index({ timestamp: 1 });
verificationStatSchema.index({ method: 1 });

module.exports = model("VerificationStat", verificationStatSchema);
