const { Events, Collection, EmbedBuilder } = require("discord.js");
const Profile = require("../models/Profile");
const LevelRoleConfig = require("../models/LevelRoleConfig");
const LevelingConfig = require("../models/LevelingConfig");

const LevelCalculator = require("../utils/leveling/levelCalculator");
const XpMultiplier = require("../utils/leveling/xpMultiplier");
const AchievementManager = require("../utils/leveling/achievementManager");
const ChallengeManager = require("../utils/leveling/challengeManager");
const levelingCache = require("../utils/leveling/levelingCache");

const cooldowns = new Collection();
const COOLDOWN_SECONDS = 60;

const achievementManager = new AchievementManager();
const challengeManager = new ChallengeManager();

module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    if (message.author.bot || !message.guild) {
      return;
    }

    const levelingConfig = await LevelingConfig.findOne({
      guildId: message.guild.id,
    });
    if (levelingConfig) {
      if (!levelingConfig.enabled) return;
      if (levelingConfig.ignoredChannels.includes(message.channel.id)) return;
      if (
        message.member.roles.cache.some((r) =>
          levelingConfig.ignoredRoles.includes(r.id)
        )
      )
        return;
    }

    const cooldownKey = `${message.guild.id}-${message.author.id}`;
    if (cooldowns.has(cooldownKey)) {
      const expirationTime =
        cooldowns.get(cooldownKey) + COOLDOWN_SECONDS * 1000;
      if (Date.now() < expirationTime) {
        return;
      }
    }
    cooldowns.set(cooldownKey, Date.now());

    let userProfile = levelingCache.getProfile(
      message.author.id,
      message.guild.id
    );

    if (!userProfile) {
      userProfile = await Profile.findOneAndUpdate(
        { userId: message.author.id, guildId: message.guild.id },
        { $inc: { messageCount: 1 } },
        { upsert: true, new: true }
      );
    } else {
      userProfile.messageCount = (userProfile.messageCount || 0) + 1;
    }

    const today = new Date().toDateString();
    const lastMessageDate = userProfile.lastMessageDate
      ? new Date(userProfile.lastMessageDate).toDateString()
      : null;

    if (lastMessageDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayString = yesterday.toDateString();

      if (lastMessageDate === yesterdayString) {
        userProfile.messageStreak = (userProfile.messageStreak || 0) + 1;
      } else {
        userProfile.messageStreak = 1;
      }
      userProfile.lastMessageDate = new Date();
    }

    const oldLevel = userProfile.level || 0;
    const oldXp = userProfile.xp || 0;

    const baseXp = Math.floor(Math.random() * 11) + 15;

    const multiplierInfo = await XpMultiplier.calculateMultiplier(userProfile, {
      messageLength: message.content.length,
    });

    const xpGained = Math.floor(baseXp * multiplierInfo.totalMultiplier);
    userProfile.xp = oldXp + xpGained;

    userProfile.dailyXp = (userProfile.dailyXp || 0) + xpGained;
    userProfile.weeklyXp = (userProfile.weeklyXp || 0) + xpGained;
    userProfile.monthlyXp = (userProfile.monthlyXp || 0) + xpGained;

    const newLevel = LevelCalculator.calculateLevel(userProfile.xp);
    userProfile.level = newLevel;

    await userProfile.save();
    levelingCache.setProfile(message.author.id, message.guild.id, userProfile);

    if (newLevel > oldLevel) {
      let announcementChannel = message.channel;
      if (levelingConfig && levelingConfig.announcementChannelId) {
        const foundChannel = await message.guild.channels
          .fetch(levelingConfig.announcementChannelId)
          .catch(() => null);
        if (foundChannel && foundChannel.isTextBased()) {
          announcementChannel = foundChannel;
        }
      }

      const levelUpEmbed = new EmbedBuilder()
        .setColor("#f1c40f")
        .setTitle("🎉 Awans na wyższy poziom!")
        .setDescription(
          `Gratulacje, ${message.author}! Osiągnąłeś/aś **Poziom ${newLevel}**!`
        )
        .setThumbnail(message.author.displayAvatarURL({ dynamic: true }))
        .addFields([
          {
            name: "⭐ XP Zdobyte",
            value: `+${xpGained} XP`,
            inline: true,
          },
          {
            name: "🔥 Mnożnik",
            value: `x${multiplierInfo.totalMultiplier} (+${multiplierInfo.bonusPercentage}%)`,
            inline: true,
          },
          {
            name: "📊 Całkowite XP",
            value: `${userProfile.xp.toLocaleString()}`,
            inline: true,
          },
        ])
        .setTimestamp();

      const rewards = await LevelRoleConfig.find({
        guildId: message.guild.id,
        level: { $gt: oldLevel, $lte: newLevel },
      }).sort({ level: "asc" });

      if (rewards.length > 0) {
        const addedRoles = [];
        for (const reward of rewards) {
          const role = message.guild.roles.cache.get(reward.roleId);
          if (role) {
            try {
              await message.member.roles.add(role);
              addedRoles.push(role.toString());
            } catch (error) {
              console.error(
                `Błąd podczas nadawania roli ${role.name} za poziom ${reward.level}: ${error}`
              );
            }
          }
        }
        if (addedRoles.length > 0) {
          levelUpEmbed.addFields({
            name: "🏆 Nagrody za poziomy!",
            value: `Otrzymałeś/aś role: ${addedRoles.join(", ")}!`,
          });
        }
      }

      await announcementChannel
        .send({ embeds: [levelUpEmbed] })
        .catch(console.error);

      levelingCache.deleteLeaderboard(message.guild.id);
    }

    try {
      const newAchievements = await achievementManager.checkAchievements(
        message.author.id,
        message.guild.id,
        userProfile
      );

      for (const { achievement, userAchievement } of newAchievements) {
        const achievementEmbed = achievementManager.createAchievementEmbed(
          achievement,
          message.author
        );
        await message.channel
          .send({ embeds: [achievementEmbed] })
          .catch(console.error);
      }
    } catch (error) {
      console.error("Błąd podczas sprawdzania osiągnięć:", error);
    }

    try {
      const completedChallenges = await challengeManager.updateProgress(
        message.author.id,
        message.guild.id,
        "sendMessage",
        1
      );

      if (xpGained > 0) {
        const xpChallenges = await challengeManager.updateProgress(
          message.author.id,
          message.guild.id,
          "gainXp",
          xpGained
        );
        completedChallenges.push(...xpChallenges);
      }

      for (const { challenge, userChallenge } of completedChallenges) {
        const challengeEmbed = challengeManager.createChallengeCompletedEmbed(
          challenge,
          message.author
        );
        await message.channel
          .send({ embeds: [challengeEmbed] })
          .catch(console.error);
      }
    } catch (error) {
      console.error("Błąd podczas aktualizacji wyzwań:", error);
    }
  },
};
