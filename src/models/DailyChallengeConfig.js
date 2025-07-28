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
  },
  { timestamps: true }
);

module.exports = model("DailyChallengeConfig", dailyChallengeConfigSchema);
