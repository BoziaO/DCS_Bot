const {Schema, model} = require("mongoose");

const activeChallengeSchema = new Schema(
    {
        userId: {type: String, required: true},
        messageId: {type: String, required: true},
        challengeType: {type: String, required: true},
        question: {
            question: {type: String, required: true},
            answers: [{type: String}],
            correct: {type: Number, required: true},
            explanation: {type: String},
        },
        startTime: {type: Date, default: Date.now},
        expiresAt: {type: Date, required: true},
    },
    {timestamps: true}
);

activeChallengeSchema.index({userId: 1}, {unique: true});
activeChallengeSchema.index({messageId: 1});
activeChallengeSchema.index({expiresAt: 1});

activeChallengeSchema.index({expiresAt: 1}, {expireAfterSeconds: 0});

module.exports = model("ActiveChallenge", activeChallengeSchema);
