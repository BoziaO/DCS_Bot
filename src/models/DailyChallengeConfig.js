const { Schema, model } = require("mongoose");

const dailyChallengeConfigSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    renewalFrequency: {
      type: String,
      enum: ["hourly", "every3hours", "every6hours", "every12hours", "daily"],
      default: "daily",
    },
    customHour: {
      type: Number,
      min: 0,
      max: 23,
      default: 8,
    },
    enabled: {
      type: Boolean,
      default: true,
    },
    lastChallengeId: {
      type: String,
    },
    lastRenewal: {
      type: Date,
    },
  },
  { timestamps: true }
);

module.exports = model("DailyChallengeConfig", dailyChallengeConfigSchema);
