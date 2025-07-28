const { Schema, model } = require("mongoose");

const ticketConfigSchema = new Schema(
  {
    guildId: {
      type: String,
      required: true,
      unique: true,
    },
    ticketsCategoryId: {
      type: String,
      required: true,
    },
    staffRoleId: {
      type: String,
      required: true,
    },
    panelChannelId: {
      type: String,
      required: true,
    },
    ticketCount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = model("TicketConfig", ticketConfigSchema);
