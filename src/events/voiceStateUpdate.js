const { Events } = require("discord.js");
const Profile = require("../models/Profile");
const LevelingConfig = require("../models/LevelingConfig");
const LevelRoleConfig = require("../models/LevelRoleConfig");
const { EmbedBuilder } = require("discord.js");

const calculateLevel = (xp) => Math.floor(0.1 * Math.sqrt(xp || 0));

module.exports = {
  name: Events.VoiceStateUpdate,
  async execute(oldState, newState, client) {
    if (!client.voiceSessions) {
      client.voiceSessions = new Map();
    }

    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;

    const config = await LevelingConfig.findOne({ guildId: member.guild.id });
    if (!config || !config.enabled || !config.voiceXpEnabled) {
      return;
    }

    const xpPerMinute = config.xpPerMinuteVoice || 5;
    const afkChannelId = member.guild.afkChannelId;
    const sessionKey = `${member.guild.id}-${member.id}`;

    const wasInValidChannel =
      oldState.channelId &&
      oldState.channelId !== afkChannelId &&
      !oldState.serverDeaf &&
      !oldState.serverMute;
    const isInValidChannel =
      newState.channelId &&
      newState.channelId !== afkChannelId &&
      !newState.serverDeaf &&
      !newState.serverMute;

    if (wasInValidChannel && !isInValidChannel) {
      if (client.voiceSessions.has(sessionKey)) {
        const startTime = client.voiceSessions.get(sessionKey);
        const timeSpentMinutes = Math.floor(
          (Date.now() - startTime) / (1000 * 60)
        );

        if (timeSpentMinutes > 0) {
          const xpGained = timeSpentMinutes * xpPerMinute;

          const userProfile = await Profile.findOneAndUpdate(
            { userId: member.id, guildId: member.guild.id },
            { $inc: { playtime: timeSpentMinutes } },
            { upsert: true, new: true }
          );

          const oldLevel = userProfile.level;
          userProfile.xp += xpGained;
          const newLevel = calculateLevel(userProfile.xp);

          if (newLevel > oldLevel) {
            userProfile.level = newLevel;

            const rewards = await LevelRoleConfig.find({
              guildId: member.guild.id,
              level: { $gt: oldLevel, $lte: newLevel },
            }).sort({ level: "asc" });

            for (const reward of rewards) {
              const role = member.guild.roles.cache.get(reward.roleId);
              if (role) {
                await member.roles
                  .add(role)
                  .catch((err) =>
                    console.error(
                      `[VoiceXP] Błąd nadawania roli ${role.name} użytkownikowi ${member.user.tag}:`,
                      err
                    )
                  );
              }
            }
          }

          await userProfile.save();
        }
        client.voiceSessions.delete(sessionKey);
      }
    } else if (!wasInValidChannel && isInValidChannel) {
      client.voiceSessions.set(sessionKey, Date.now());
    }
  },
};
