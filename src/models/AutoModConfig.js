const {Schema, model} = require("mongoose");

const ruleSchema = new Schema({
    warnings: {type: Number, required: true},
    action: {type: String, required: true, enum: ["mute", "kick", "ban"]},
    duration: {type: String, required: false},
});

const autoModConfigSchema = new Schema(
    {
        guildId: {type: String, required: true, unique: true},
        rules: [ruleSchema],
    },
    {timestamps: true}
);

module.exports = model("AutoModConfig", autoModConfigSchema);
