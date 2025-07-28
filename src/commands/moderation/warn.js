const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const Warning = require("../../models/Warning");
const AutoModConfig = require("../../models/AutoModConfig");
const LogConfig = require("../../models/LogConfig");
const ms = require("ms");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("warn")
    .setDescription("Daje ostrzeżenie użytkownikowi.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .setDMPermission(false)
    .addUserOption((option) =>
      option
        .setName("uzytkownik")
        .setDescription("Użytkownik, który ma otrzymać ostrzeżenie.")
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("powod")
        .setDescription("Powód ostrzeżenia.")
        .setRequired(true)
    ),

  async execute(interaction) {
    const target = interaction.options.getUser("uzytkownik");
    const reason = interaction.options.getString("powod");
    const moderator = interaction.user;

    if (target.bot) {
      return interaction.reply({
        content: "Nie możesz ostrzegać botów.",
        ephemeral: true,
      });
    }
    if (target.id === moderator.id) {
      return interaction.reply({
        content: "Nie możesz ostrzegać samego siebie.",
        ephemeral: true,
      });
    }

    const targetMember = await interaction.guild.members
      .fetch(target.id)
      .catch(() => null);
    if (!targetMember) {
      return interaction.reply({
        content: "Nie można znaleźć tego użytkownika na serwerze.",
        ephemeral: true,
      });
    }
    if (
      targetMember.roles.highest.position >=
        interaction.member.roles.highest.position &&
      interaction.guild.ownerId !== interaction.user.id
    ) {
      return interaction.reply({
        content:
          "Nie możesz ostrzegać użytkownika z taką samą lub wyższą rolą.",
        ephemeral: true,
      });
    }

    const newWarning = new Warning({
      guildId: interaction.guild.id,
      userId: target.id,
      moderatorId: moderator.id,
      reason: reason,
    });
    await newWarning.save();

    try {
      const dmEmbed = new EmbedBuilder()
        .setColor("#e67e22")
        .setTitle(
          `Otrzymałeś/aś ostrzeżenie na serwerze ${interaction.guild.name}`
        )
        .addFields(
          { name: "Powód", value: reason },
          { name: "Nadane przez", value: moderator.tag }
        )
        .setTimestamp();
      await target.send({ embeds: [dmEmbed] });
    } catch (error) {
      console.log(`Nie udało się wysłać DM do ${target.tag}.`);
    }

    const confirmationEmbed = new EmbedBuilder()
      .setColor("#e67e22")
      .setTitle("✅ Użytkownik Ostrzeżony")
      .setDescription(`**${target.tag}** otrzymał/a ostrzeżenie.`)
      .addFields(
        { name: "Moderator", value: moderator.toString(), inline: true },
        { name: "Powód", value: reason, inline: true }
      )
      .setTimestamp()
      .setFooter({ text: `ID Użytkownika: ${target.id}` });

    await interaction.reply({ embeds: [confirmationEmbed] });

    await this.checkAutoMod(interaction, targetMember);
  },

  async checkAutoMod(interaction, targetMember) {
    const guildId = interaction.guild.id;
    const targetId = targetMember.id;

    const autoModConfig = await AutoModConfig.findOne({ guildId });
    if (!autoModConfig || autoModConfig.rules.length === 0) {
      return;
    }

    const warningCount = await Warning.countDocuments({
      guildId,
      userId: targetId,
    });

    const applicableRule = autoModConfig.rules
      .sort((a, b) => b.warnings - a.warnings)
      .find((rule) => warningCount >= rule.warnings);

    if (!applicableRule) {
      return;
    }

    if (!targetMember.moderatable) {
      console.log(`[AutoMod] Bot nie może moderować ${targetMember.user.tag}.`);
      return;
    }

    const logConfig = await LogConfig.findOne({ guildId });
    const logChannel = logConfig
      ? await interaction.guild.channels
          .fetch(logConfig.channelId)
          .catch(() => null)
      : null;

    const autoModReason = `AutoMod: Osiągnięto ${warningCount} ostrzeżeń.`;
    let actionDescription = "";
    let actionColor = "#e74c3c";

    try {
      switch (applicableRule.action) {
        case "mute":
          const durationMs = ms(applicableRule.duration);
          if (targetMember.isCommunicationDisabled()) break;
          await targetMember.timeout(durationMs, autoModReason);
          actionDescription = `został automatycznie **wyciszony** na **${applicableRule.duration}**.`;
          actionColor = "#f1c40f";
          break;
        case "kick":
          await targetMember.kick(autoModReason);
          actionDescription = `został automatycznie **wyrzucony** z serwera.`;
          actionColor = "#e67e22";
          break;
        case "ban":
          await targetMember.ban({ reason: autoModReason });
          actionDescription = `został automatycznie **zbanowany**.`;
          actionColor = "#e74c3c";
          break;
      }

      if (actionDescription && logChannel) {
        const logEmbed = new EmbedBuilder()
          .setColor(actionColor)
          .setTitle("🛡️ Akcja Automoderatora")
          .setDescription(`Użytkownik ${targetMember} ${actionDescription}`)
          .addFields(
            {
              name: "Powód",
              value: `Osiągnięcie progu **${warningCount}** ostrzeżeń.`,
            },
            {
              name: "Wykonana akcja",
              value: applicableRule.action.toUpperCase(),
            }
          )
          .setTimestamp()
          .setFooter({ text: "Ta akcja została wykonana automatycznie." });

        await logChannel.send({ embeds: [logEmbed] });
      }
    } catch (error) {
      console.error(
        `[AutoMod] Błąd podczas wykonywania akcji dla ${targetMember.user.tag}:`,
        error
      );
    }
  },
};
