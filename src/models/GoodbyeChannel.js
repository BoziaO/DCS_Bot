const { Schema, model } = require("mongoose");

const goodbyeChannelSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
    },
    channelId: {
      type: String,
      required: true,
    },
    embed: {
      title: { type: String, default: "Żegnaj!" },
      description: {
        type: String,
        default: "Użytkownik **{username}** opuścił serwer {server-name}.",
      },
      color: { type: String, default: "#ff4757" },
      thumbnail: { type: Boolean, default: true },
      footer: { type: String, default: "Do zobaczenia!" },
    },
  },
  { timestamps: true }
);

goodbyeChannelSchema.index({ guildId: 1, channelId: 1 }, { unique: true });

module.exports = model("GoodbyeChannel", goodbyeChannelSchema);
