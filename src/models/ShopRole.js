const { Schema, model } = require("mongoose");

const shopRoleSchema = new Schema(
  {
    guildId: { type: String, required: true },
    roleId: { type: String, required: true },
    price: { type: Number, required: true },
  },
  { timestamps: true }
);

shopRoleSchema.index({ guildId: 1, roleId: 1 }, { unique: true });

module.exports = model("ShopRole", shopRoleSchema);
