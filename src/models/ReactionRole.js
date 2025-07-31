const {Schema, model} = require("mongoose");

const reactionRoleSchema = new Schema({
    guildId: {type: String, required: true},
    messageId: {type: String, required: true},
    roleId: {type: String, required: true},
    emoji: {type: String, required: true},
});

reactionRoleSchema.index({messageId: 1, emoji: 1}, {unique: true});

module.exports = model("ReactionRole", reactionRoleSchema);
