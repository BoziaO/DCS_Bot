const {Schema, model} = require("mongoose");

const challengeSchema = new Schema(
    {
        id: {type: String, required: true, unique: true},
        name: {type: String, required: true},
        description: {type: String, required: true},
        emoji: {type: String, default: "🎯"},

        type: {
            type: String,
            required: true,
            enum: ["daily", "weekly", "monthly", "special", "event"],
        },

        category: {
            type: String,
            required: true,
            enum: [
                "activity",
                "leveling",
                "economy",
                "investigate",
                "hunt",
                "social",
                "special",
            ],
        },

        requirements: {
            sendMessages: {type: Number},
            beActive: {type: Number},

            gainXp: {type: Number},
            reachLevel: {type: Number},

            earnMoney: {type: Number},
            spendMoney: {type: Number},

            completeInvestigations: {type: Number},
            findItems: {type: Number},

            completeHunts: {type: Number},
            identifyGhosts: {type: Number},

            helpOthers: {type: Number},
            useCommands: {type: Number},

            customCondition: {type: String},
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
            xpBooster: {
                multiplier: Number,
                duration: Number,
            },
            title: {type: String},
            badge: {type: String},
        },

        startDate: {type: Date, required: true},
        endDate: {type: Date, required: true},

        guildId: {type: String},
        maxCompletions: {type: Number, default: 1},

        difficulty: {
            type: String,
            enum: ["easy", "medium", "hard", "extreme"],
            default: "medium",
        },

        enabled: {type: Boolean, default: true},
        featured: {type: Boolean, default: false},
        completedBy: {type: Number, default: 0},
    },
    {timestamps: true}
);

challengeSchema.index({id: 1});
challengeSchema.index({type: 1});
challengeSchema.index({category: 1});
challengeSchema.index({guildId: 1});
challengeSchema.index({startDate: 1, endDate: 1});
challengeSchema.index({enabled: 1});

module.exports = model("Challenge", challengeSchema);
