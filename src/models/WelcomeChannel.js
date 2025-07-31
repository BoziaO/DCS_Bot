const {Schema, model} = require("mongoose");

const welcomeChannelSchema = new Schema(
    {
        guildId: {
            type: String,
            required: true,
        },
        channelId: {
            type: String,
            required: true,
        },
        embed: {
            title: {type: String, default: "Witaj na serwerze!"},
            description: {
                type: String,
                default:
                    "Witaj {mention-member}! Mamy nadzieję, że będziesz się dobrze bawić na {server-name}.",
            },
            color: {type: String, default: "#0099ff"},
            thumbnail: {type: Boolean, default: true},
            footer: {type: String, default: "Miłego pobytu!"},
        },
    },
    {timestamps: true}
);

welcomeChannelSchema.index({guildId: 1, channelId: 1}, {unique: true});

module.exports = model("WelcomeChannel", welcomeChannelSchema);
