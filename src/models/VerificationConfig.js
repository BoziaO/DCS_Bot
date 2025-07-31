const {Schema, model} = require("mongoose");

const verificationConfigSchema = new Schema(
    {
        guildId: {
            type: String,
            required: true,
            unique: true,
        },
        roleId: {
            type: String,
            required: true,
        },
        channelId: {
            type: String,
            required: false,
        },
        theme: {
            type: String,
            default: "classic",
            enum: ["classic", "investigator", "dark", "haunted", "asylum", "school"],
        },
        challengeEnabled: {
            type: Boolean,
            default: false,
        },
        challengeType: {
            type: String,
            default: "random",
            enum: ["random", "ghost_quiz", "equipment_test", "survival_tips"],
        },
        rewardRoles: [
            {
                type: {
                    type: String,
                    enum: ["challenge_master", "speed_runner", "ghost_expert"],
                },
                roleId: String,
            },
        ],
        welcomeChannelId: {
            type: String,
            required: false,
        },
        statsEnabled: {
            type: Boolean,
            default: true,
        },
        autoDelete: {
            type: Boolean,
            default: true,
        },
        lastUpdated: {
            type: Date,
            default: Date.now,
        },
    },
    {timestamps: true}
);

module.exports = model("VerificationConfig", verificationConfigSchema);
