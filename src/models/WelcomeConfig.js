const {Schema, model} = require("mongoose");

const welcomeConfigSchema = new Schema(
    {
        guildId: {
            type: String,
            required: true,
            index: true,
        },
        channelId: {
            type: String,
            required: true,
        },
        enabled: {
            type: Boolean,
            default: true,
        },

        welcomeMessage: {
            enabled: {
                type: Boolean,
                default: true,
            },
            embed: {
                enabled: {
                    type: Boolean,
                    default: true,
                },
                title: {
                    type: String,
                    default: "Witaj na serwerze! 👋",
                },
                description: {
                    type: String,
                    default:
                        "Witaj {mention-member}! Mamy nadzieję, że będziesz się dobrze bawić na **{server-name}**.\n\nJesteś **{member-count}** członkiem naszej społeczności!",
                },
                color: {
                    type: String,
                    default: "#00ff88",
                },
                thumbnail: {
                    enabled: {
                        type: Boolean,
                        default: true,
                    },
                    type: {
                        type: String,
                        enum: ["user-avatar", "server-icon", "custom"],
                        default: "user-avatar",
                    },
                    customUrl: String,
                },
                image: {
                    enabled: {
                        type: Boolean,
                        default: false,
                    },
                    url: String,
                },
                footer: {
                    enabled: {
                        type: Boolean,
                        default: true,
                    },
                    text: {
                        type: String,
                        default: "Miłego pobytu! • {server-name}",
                    },
                    iconUrl: String,
                },
                timestamp: {
                    type: Boolean,
                    default: true,
                },
                author: {
                    enabled: {
                        type: Boolean,
                        default: false,
                    },
                    name: String,
                    iconUrl: String,
                    url: String,
                },
                fields: [
                    {
                        name: String,
                        value: String,
                        inline: {
                            type: Boolean,
                            default: false,
                        },
                    },
                ],
            },
            content: {
                enabled: {
                    type: Boolean,
                    default: false,
                },
                text: {
                    type: String,
                    default: "{mention-member}",
                },
            },
        },

        farewellMessage: {
            enabled: {
                type: Boolean,
                default: false,
            },
            channelId: String,
            embed: {
                enabled: {
                    type: Boolean,
                    default: true,
                },
                title: {
                    type: String,
                    default: "Żegnaj! 👋",
                },
                description: {
                    type: String,
                    default:
                        "**{username}** opuścił serwer **{server-name}**.\n\nMamy teraz **{member-count}** członków.",
                },
                color: {
                    type: String,
                    default: "#ff4444",
                },
                thumbnail: {
                    enabled: {
                        type: Boolean,
                        default: true,
                    },
                    type: {
                        type: String,
                        enum: ["user-avatar", "server-icon", "custom"],
                        default: "user-avatar",
                    },
                    customUrl: String,
                },
                footer: {
                    enabled: {
                        type: Boolean,
                        default: true,
                    },
                    text: {
                        type: String,
                        default: "Do zobaczenia! • {server-name}",
                    },
                },
                timestamp: {
                    type: Boolean,
                    default: true,
                },
            },
        },

        autoRoles: {
            enabled: {
                type: Boolean,
                default: false,
            },
            roles: [String],
            delay: {
                type: Number,
                default: 0,
            },
            requireVerification: {
                type: Boolean,
                default: false,
            },
        },

        directMessage: {
            enabled: {
                type: Boolean,
                default: false,
            },
            embed: {
                enabled: {
                    type: Boolean,
                    default: true,
                },
                title: {
                    type: String,
                    default: "Witaj na {server-name}! 🎉",
                },
                description: {
                    type: String,
                    default:
                        "Dziękujemy za dołączenie do **{server-name}**!\n\nJeśli masz jakieś pytania, nie wahaj się zapytać na serwerze.",
                },
                color: {
                    type: String,
                    default: "#0099ff",
                },
                thumbnail: {
                    enabled: {
                        type: Boolean,
                        default: true,
                    },
                    type: {
                        type: String,
                        enum: ["server-icon", "custom"],
                        default: "server-icon",
                    },
                    customUrl: String,
                },
                footer: {
                    enabled: {
                        type: Boolean,
                        default: true,
                    },
                    text: {
                        type: String,
                        default: "Zespół {server-name}",
                    },
                },
            },
            delay: {
                type: Number,
                default: 5,
            },
        },

        statistics: {
            enabled: {
                type: Boolean,
                default: true,
            },
            totalWelcomes: {
                type: Number,
                default: 0,
            },
            totalFarewells: {
                type: Number,
                default: 0,
            },
            lastWelcome: Date,
            lastFarewell: Date,
        },

        filters: {
            ignoreBots: {
                type: Boolean,
                default: true,
            },
            ignoreRoles: [String],
            requiredRoles: [String],
            minAccountAge: {
                type: Number,
                default: 0,
            },
            cooldown: {
                type: Number,
                default: 0,
            },
        },

        advanced: {
            deleteAfter: {
                type: Number,
                default: 0,
            },
            mentionUser: {
                type: Boolean,
                default: false,
            },
            pingRoles: [String],
            customPlaceholders: [
                {
                    name: String,
                    value: String,
                },
            ],
        },
    },
    {
        timestamps: true,
        collection: "welcomeconfigs",
    }
);

welcomeConfigSchema.index({guildId: 1, channelId: 1}, {unique: true});
welcomeConfigSchema.index({guildId: 1, enabled: 1});
welcomeConfigSchema.index({"welcomeMessage.enabled": 1});
welcomeConfigSchema.index({"farewellMessage.enabled": 1});

welcomeConfigSchema.methods.incrementWelcomes = function () {
    this.statistics.totalWelcomes += 1;
    this.statistics.lastWelcome = new Date();
    return this.save();
};

welcomeConfigSchema.methods.incrementFarewells = function () {
    this.statistics.totalFarewells += 1;
    this.statistics.lastFarewell = new Date();
    return this.save();
};

welcomeConfigSchema.statics.getActiveConfigs = function (guildId) {
    return this.find({
        guildId: guildId,
        enabled: true,
        "welcomeMessage.enabled": true,
    });
};

welcomeConfigSchema.statics.getFarewellConfigs = function (guildId) {
    return this.find({
        guildId: guildId,
        enabled: true,
        "farewellMessage.enabled": true,
    });
};

module.exports = model("WelcomeConfig", welcomeConfigSchema);
