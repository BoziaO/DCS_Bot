const {Schema, model} = require("mongoose");

const userAchievementSchema = new Schema(
    {
        userId: {type: String, required: true},
        guildId: {type: String, required: true},
        achievementId: {type: String, required: true},

        unlockedAt: {type: Date, default: Date.now},
        progress: {type: Number, default: 100},

        notified: {type: Boolean, default: false},
        showcased: {type: Boolean, default: false},
    },
    {timestamps: true}
);

userAchievementSchema.index({userId: 1, guildId: 1});
userAchievementSchema.index({achievementId: 1});
userAchievementSchema.index(
    {userId: 1, guildId: 1, achievementId: 1},
    {unique: true}
);

module.exports = model("UserAchievement", userAchievementSchema);
