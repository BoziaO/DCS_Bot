const { Schema, model } = require("mongoose");

const levelRoleConfigSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
    },
    level: {
      type: Number,
      required: true,
    },
    roleId: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

levelRoleConfigSchema.index({ guildId: 1, level: 1 }, { unique: true });

module.exports = model("LevelRoleConfig", levelRoleConfigSchema);
