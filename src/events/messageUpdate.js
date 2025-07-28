const { Events, EmbedBuilder } = require("discord.js");
const LogConfig = require("../models/LogConfig");

module.exports = {
  name: Events.MessageUpdate,
  async execute(oldMessage, newMessage) {
    if (
      oldMessage.author?.bot ||
      !oldMessage.guild ||
      oldMessage.content === newMessage.content
    )
      return;

    const config = await LogConfig.findOne({ guildId: oldMessage.guild.id });
    if (!config) return;

    const logChannel = await oldMessage.guild.channels
      .fetch(config.channelId)
      .catch(() => null);
    if (!logChannel) return;

    const embed = new EmbedBuilder()
      .setColor("#f1c40f")
      .setTitle("Zaktualizowano Wiadomość")
      .setURL(newMessage.url)
      .setDescription(
        `**Autor:** ${newMessage.author} (\`${newMessage.author.id}\`)\n**Kanał:** ${newMessage.channel}`
      )
      .addFields(
        {
          name: "Przed edycją",
          value: `\`\`\`${oldMessage.content.slice(0, 1000)}\`\`\``,
        },
        {
          name: "Po edycji",
          value: `\`\`\`${newMessage.content.slice(0, 1000)}\`\`\``,
        }
      )
      .setTimestamp()
      .setFooter({ text: `ID Wiadomości: ${newMessage.id}` });

    await logChannel.send({ embeds: [embed] });
  },
};
