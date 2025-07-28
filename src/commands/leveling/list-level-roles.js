const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const LevelRoleConfig = require("../../models/LevelRoleConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("list-level-roles")
    .setDescription(
      "Wyświetla listę wszystkich skonfigurowanych ról za poziomy."
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply();

    const configs = await LevelRoleConfig.find({
      guildId: interaction.guild.id,
    }).sort({ level: 1 });

    if (configs.length === 0) {
      return interaction.editReply(
        "Na tym serwerze nie skonfigurowano żadnych ról za poziomy."
      );
    }
    const description = configs
      .map((config) => `**Poziom ${config.level}** → <@&${config.roleId}>`)
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("📜 Skonfigurowane Nagrody za Poziomy")
      .setDescription(description)
      .setColor("#1abc9c")
      .setTimestamp()
      .setFooter({ text: `Serwer: ${interaction.guild.name}` });

    await interaction.editReply({ embeds: [embed] });
  },
};
