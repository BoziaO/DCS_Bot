const {Schema, model} = require("mongoose");

const achievementSchema = new Schema(
    {
        id: {type: String, required: true, unique: true},
        name: {type: String, required: true},
        description: {type: String, required: true},
        emoji: {type: String, default: "🏆"},
        category: {
            type: String,
            required: true,
            enum: [
                "leveling",
                "activity",
                "economy",
                "social",
                "special",
                "investigate",
                "hunt",
            ],
        },

        requirements: {
            level: {type: Number},

            totalXp: {type: Number},

            messageCount: {type: Number},
            messageStreak: {type: Number},

            balance: {type: Number},
            totalEarnings: {type: Number},
            moneySpent: {type: Number},

            totalInvestigations: {type: Number},
            successfulInvestigations: {type: Number},
            investigateStreak: {type: Number},

            totalHunts: {type: Number},
            successfulHunts: {type: Number},
            huntStreak: {type: Number},
            nightmareHunts: {type: Number},

            customCondition: {type: String},

            accountAge: {type: Number},

            itemsUsed: {type: Number},
            photosTaken: {type: Number},
            ghostsExorcised: {type: Number},
        },

        rewards: {
            xp: {type: Number, default: 0},
            money: {type: Number, default: 0},
            items: [
                {
                    name: String,
                    quantity: Number,
                },
            ],
            title: {type: String},
            badge: {type: String},
            xpMultiplier: {type: Number},
            role: {type: String},
        },

        rarity: {
            type: String,
            enum: ["common", "uncommon", "rare", "epic", "legendary", "mythic"],
            default: "common",
        },
        points: {type: Number, default: 10},
        hidden: {type: Boolean, default: false},
        secret: {type: Boolean, default: false},

        guildId: {type: String},
        enabled: {type: Boolean, default: true},

        unlockedBy: {type: Number, default: 0},
    },
    {timestamps: true}
);

achievementSchema.index({id: 1});
achievementSchema.index({category: 1});
achievementSchema.index({guildId: 1});
achievementSchema.index({enabled: 1});

module.exports = model("Achievement", achievementSchema);
