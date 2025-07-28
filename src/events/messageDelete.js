const { Events, EmbedBuilder } = require("discord.js");
const LogConfig = require("../models/LogConfig");

module.exports = {
  name: Events.MessageDelete,
  async execute(message) {
    if (!message.guild) return;

    const config = await LogConfig.findOne({ guildId: message.guild.id });
    if (!config || !config.messageLogChannelId) return;

    const logChannel = await message.guild.channels
      .fetch(config.messageLogChannelId)
      .catch(() => null);
    if (!logChannel) return;

    const author = message.author;
    if (author && author.bot) return;

    const embed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle("Wiadomość usunięta")
      .addFields({
        name: "Kanał",
        value: `${message.channel || "Nieznany kanał"}`,
      })
      .setTimestamp();

    if (author) {
      embed.setAuthor({ name: author.tag, iconURL: author.displayAvatarURL() });
    } else {
      embed.setAuthor({ name: "Nieznany autor" });
    }

    if (message.content) {
      embed.setDescription(
        message.content.length > 4096
          ? message.content.substring(0, 4093) + "..."
          : message.content
      );
    } else {
      embed.setDescription(
        "*Treść wiadomości nie jest dostępna (prawdopodobnie obraz, embed lub stara wiadomość).*"
      );
    }

    if (message.attachments.size > 0) {
      embed.addFields({
        name: "Załączniki",
        value: message.attachments.map((a) => `${a.name}`).join("\n"),
      });
    }

    await logChannel.send({ embeds: [embed] });
  },
};
