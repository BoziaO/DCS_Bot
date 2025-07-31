const {Schema, model} = require("mongoose");

const seasonalEventSchema = new Schema(
    {
        guildId: {type: String, required: true},
        eventType: {
            type: String,
            required: true,
            enum: ["christmas", "easter", "halloween"],
        },
        isActive: {type: Boolean, default: false},
        startDate: {type: Date, required: true},
        endDate: {type: Date, required: true},

        xpMultiplier: {type: Number, default: 2.0},
        moneyMultiplier: {type: Number, default: 2.0},

        participantsCount: {type: Number, default: 0},
        totalRewardsGiven: {type: Number, default: 0},
        specialItemsFound: {type: Number, default: 0},

        config: {
            specialHuntChance: {type: Number, default: 0.15},
            specialFindChance: {type: Number, default: 0.1},
            bonusRewardMultiplier: {type: Number, default: 1.5},
            specialItems: [String],
        },

        participants: [{
            userId: String,
            joinedAt: {type: Date, default: Date.now},
            specialHunts: {type: Number, default: 0},
            specialFinds: {type: Number, default: 0},
            totalEventXp: {type: Number, default: 0},
            totalEventMoney: {type: Number, default: 0},
        }],
    },
    {timestamps: true}
);

seasonalEventSchema.index({guildId: 1, eventType: 1});
seasonalEventSchema.index({isActive: 1, startDate: 1, endDate: 1});

module.exports = model("SeasonalEvent", seasonalEventSchema);