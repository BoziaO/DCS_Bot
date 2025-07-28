const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const Warning = require("../../models/Warning");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warnings")
    .setDescription("Wyświetla historię ostrzeżeń danego użytkownika.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("uzytkownik")
        .setDescription("Użytkownik, którego historię chcesz sprawdzić.")
        .setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("uzytkownik");

    const warnings = await Warning.find({
      guildId: interaction.guild.id,
      userId: target.id,
    });

    const embed = new EmbedBuilder()
      .setColor("#3498db")
      .setTitle(`Historia ostrzeżeń dla ${target.tag}`)
      .setThumbnail(target.displayAvatarURL());

    if (warnings.length === 0) {
      embed.setDescription("Ten użytkownik nie ma żadnych ostrzeżeń.");
      return interaction.reply({ embeds: [embed] });
    }

    const warningsList = warnings
      .map((warn, index) => {
        const moderator = interaction.guild.members.cache.get(warn.moderatorId);
        return (
          `**${index + 1}. ID: \`${warn._id}\`**` +
          `\n**Data:** <t:${Math.floor(warn.createdAt.getTime() / 1000)}:D>` +
          `\n**Moderator:** ${moderator ? moderator.user.tag : "Nieznany"}` +
          `\n**Powód:** ${warn.reason}`
        );
      })
      .join("\n\n");

    embed.setDescription(warningsList);
    embed.setFooter({ text: `Łączna liczba ostrzeżeń: ${warnings.length}` });

    await interaction.reply({ embeds: [embed] });
  },
};
