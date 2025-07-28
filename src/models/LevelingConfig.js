const { Schema, model } = require("mongoose");

const levelingConfigSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
    },
    enabled: { type: Boolean, default: true },
    announcementChannelId: {
      type: String,
      required: false,
    },
    ignoredChannels: { type: [String], default: [] },
    ignoredRoles: { type: [String], default: [] },
    voiceXpEnabled: { type: Boolean, default: true },
    xpPerMinuteVoice: { type: Number, default: 5 },
  },
  { timestamps: true }
);

module.exports = model("LevelingConfig", levelingConfigSchema);
