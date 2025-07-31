const {Schema, model} = require("mongoose");

const profileSchema = new Schema(
    {
        userId: {type: String, required: true},
        guildId: {type: String, required: true},
        balance: {type: Number, default: 100},
        cash: {type: Number, default: 100},
        sanity: {type: Number, default: 100, min: 0, max: 100},
        inventory: {
            type: Map,
            of: Number,
            default: {},
        },
        oldInventory: [
            {
                name: {type: String, required: true},
                quantity: {type: Number, default: 1},
            },
        ],

        lastDaily: {type: Date, default: null},
        lastHunt: {type: Date, default: null},
        lastWork: {type: Date, default: null},
        lastInvestigate: {type: Date, default: null},
        lastActive: {type: Date, default: Date.now},

        xp: {type: Number, default: 0},
        level: {type: Number, default: 0},

        prestige: {type: Number, default: 0},
        prestigeXp: {type: Number, default: 0},

        xpBoosters: [
            {
                name: String,
                description: String,
                multiplier: Number,
                expiresAt: Date,
                addedAt: {type: Date, default: Date.now},
            },
        ],
        premiumUntil: {type: Date},

        achievements: [String],
        achievementPoints: {type: Number, default: 0},

        messageStreak: {type: Number, default: 0},
        lastMessageDate: {type: Date},
        dailyXp: {type: Number, default: 0},
        weeklyXp: {type: Number, default: 0},
        monthlyXp: {type: Number, default: 0},

        activeChallenges: [String],
        completedChallenges: {type: Number, default: 0},

        totalHunts: {type: Number, default: 0},
        successfulHunts: {type: Number, default: 0},
        huntStreak: {type: Number, default: 0},
        maxStreak: {type: Number, default: 0},
        nightmareHunts: {type: Number, default: 0},
        teamHunts: {type: Number, default: 0},
        fastestId: {type: Number, default: null},

        huntStats: {
            totalHunts: {type: Number, default: 0},
            successfulHunts: {type: Number, default: 0},
            ghostsIdentified: {
                type: Map,
                of: Number,
                default: {},
            },
            favoriteLocation: {type: String, default: null},
            bestSuccessRate: {type: Number, default: 0},
            longestStreak: {type: Number, default: 0},
            currentStreak: {type: Number, default: 0},
            totalEarningsFromHunts: {type: Number, default: 0},
            equipmentUsed: {
                type: Map,
                of: Number,
                default: {},
            },
            locationsVisited: {
                type: Map,
                of: Number,
                default: {},
            },
        },

        maxSanityHunt: {type: Number, default: 0},
        minSanity: {type: Number, default: 100},
        pillsUsed: {type: Number, default: 0},

        totalEarnings: {type: Number, default: 0},
        moneySpent: {type: Number, default: 0},
        maxEarningsPerHunt: {type: Number, default: 0},

        itemsUsed: {type: Number, default: 0},
        photosTaken: {type: Number, default: 0},
        ghostsExorcised: {type: Number, default: 0},
        playtime: {type: Number, default: 0},
        messageCount: {type: Number, default: 0},
        ghostEncounters: {type: Map, of: Number, default: {}},
        favoriteEquipment: [
            {
                name: String,
                uses: Number,
            },
        ],
    },
    {timestamps: true}
);

profileSchema.index({userId: 1, guildId: 1}, {unique: true});

profileSchema.pre("save", function (next) {
    if (this.isModified("cash") && !this.isModified("balance")) {
        this.balance = this.cash;
    } else if (this.isModified("balance") && !this.isModified("cash")) {
        this.cash = this.balance;
    }

    if (!this.huntStats) {
        this.huntStats = {
            totalHunts: 0,
            successfulHunts: 0,
            ghostsIdentified: new Map(),
            favoriteLocation: null,
            bestSuccessRate: 0,
            longestStreak: 0,
            currentStreak: 0,
            totalEarningsFromHunts: 0,
            equipmentUsed: new Map(),
            locationsVisited: new Map(),
        };
    }

    next();
});

profileSchema
    .virtual("experience")
    .get(function () {
        return this.xp;
    })
    .set(function (value) {
        this.xp = value;
    });

module.exports = model("Profile", profileSchema);
