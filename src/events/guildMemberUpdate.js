const { Events, EmbedBuilder, AuditLogEvent } = require("discord.js");
const LogConfig = require("../models/LogConfig");

async function handleRoleChange(oldMember, newMember, logChannel) {
  const oldRoles = oldMember.roles.cache;
  const newRoles = newMember.roles.cache;

  const addedRoles = newRoles.filter((role) => !oldRoles.has(role.id));
  const removedRoles = oldRoles.filter((role) => !newRoles.has(role.id));

  if (addedRoles.size === 0 && removedRoles.size === 0) return;

  const fetchedLogs = await newMember.guild.fetchAuditLogs({
    limit: 1,
    type: AuditLogEvent.MemberRoleUpdate,
  });
  const roleLog = fetchedLogs.entries.first();
  let executor = "Nieznany";

  if (
    roleLog &&
    roleLog.target.id === newMember.id &&
    Date.now() - roleLog.createdTimestamp < 5000
  ) {
    executor = roleLog.executor;
  }

  const embed = new EmbedBuilder()
    .setColor("#3498db")
    .setTitle("Zmieniono Role Użytkownika")
    .setDescription(
      `**Użytkownik:** ${newMember.user} (\`${newMember.user.id}\`)\n**Zmienione przez:** ${executor}`
    )
    .setTimestamp();

  if (addedRoles.size > 0) {
    embed.addFields({
      name: "✅ Dodane role",
      value: addedRoles.map((r) => r.toString()).join("\n"),
      inline: true,
    });
  }
  if (removedRoles.size > 0) {
    embed.addFields({
      name: "❌ Usunięte role",
      value: removedRoles.map((r) => r.toString()).join("\n"),
      inline: true,
    });
  }

  await logChannel.send({ embeds: [embed] });
}

async function handleNicknameChange(oldMember, newMember, logChannel) {
  if (oldMember.nickname === newMember.nickname) return;

  const fetchedLogs = await newMember.guild.fetchAuditLogs({
    limit: 1,
    type: AuditLogEvent.MemberUpdate,
  });
  const nickLog = fetchedLogs.entries.first();
  let executor = "Nieznany";
  if (
    nickLog &&
    nickLog.target.id === newMember.id &&
    Date.now() - nickLog.createdTimestamp < 5000
  ) {
    executor = nickLog.executor;
  }

  const embed = new EmbedBuilder()
    .setColor("#e67e22")
    .setTitle("Zmieniono Pseudonim")
    .setDescription(
      `**Użytkownik:** ${newMember.user} (\`${newMember.user.id}\`)\n**Zmienione przez:** ${executor}`
    )
    .addFields(
      {
        name: "Stary pseudonim",
        value: `\`${oldMember.nickname || oldMember.user.username}\``,
        inline: true,
      },
      {
        name: "Nowy pseudonim",
        value: `\`${newMember.nickname || newMember.user.username}\``,
        inline: true,
      }
    )
    .setTimestamp();

  await logChannel.send({ embeds: [embed] });
}

module.exports = {
  name: Events.GuildMemberUpdate,
  async execute(oldMember, newMember) {
    if (newMember.user.bot) return;

    const config = await LogConfig.findOne({ guildId: newMember.guild.id });
    if (!config) return;

    const logChannel = await newMember.guild.channels
      .fetch(config.channelId)
      .catch(() => null);
    if (!logChannel) return;

    await handleRoleChange(oldMember, newMember, logChannel);
    await handleNicknameChange(oldMember, newMember, logChannel);
  },
};
