const { Schema, model } = require("mongoose");

const logConfigSchema = new Schema({
  guildId: { type: String, required: true, unique: true },
  messageLogChannelId: { type: String, required: false },
  memberLogChannelId: { type: String, required: false },
});

module.exports = model("LogConfig", logConfigSchema);
