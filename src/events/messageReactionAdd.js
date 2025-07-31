const {Events} = require("discord.js");
const ReactionRole = require("../models/ReactionRole");

module.exports = {
    name: Events.MessageReactionAdd,
    async execute(reaction, user) {
        if (user.bot) return;

        if (reaction.partial) {
            try {
                await reaction.fetch();
            } catch (error) {
                console.error("Błąd podczas pobierania pełnej reakcji:", error);
                return;
            }
        }

        const config = await ReactionRole.findOne({
            messageId: reaction.message.id,
            emoji: reaction.emoji.name,
        });

        if (!config) return;

        try {
            const member = await reaction.message.guild.members.fetch(user.id);
            await member.roles.add(config.roleId);
        } catch (error) {
            console.error(`Błąd podczas nadawania roli za reakcję: ${error}`);
        }
    },
};
