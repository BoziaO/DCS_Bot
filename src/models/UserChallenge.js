const {Schema, model} = require("mongoose");

const userChallengeSchema = new Schema(
    {
        userId: {type: String, required: true},
        guildId: {type: String, required: true},
        challengeId: {type: String, required: true},

        progress: {type: Map, of: Number, default: {}},
        completed: {type: Boolean, default: false},
        completedAt: {type: Date},

        startedAt: {type: Date, default: Date.now},
        rewardsClaimed: {type: Boolean, default: false},
        completionCount: {type: Number, default: 0},
    },
    {timestamps: true}
);

userChallengeSchema.index({userId: 1, guildId: 1});
userChallengeSchema.index({challengeId: 1});
userChallengeSchema.index(
    {userId: 1, guildId: 1, challengeId: 1},
    {unique: true}
);
userChallengeSchema.index({completed: 1});

module.exports = model("UserChallenge", userChallengeSchema);
