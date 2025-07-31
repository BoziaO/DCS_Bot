const Warning = require('../../models/Warning');
const AutoModConfig = require('../../models/AutoModConfig');
const { cache } = require('../cache');

class ModerationManager {
  constructor() {
    this.mutedUsers = new Map();
  }

  async addWarning(userId, guildId, moderatorId, reason) {
    try {
      const warning = new Warning({
        userId,
        guildId,
        moderatorId,
        reason,
        isActive: true
      });

      await warning.save();

      // Get total warnings count
      const warningCount = await Warning.countDocuments({
        userId,
        guildId,
        isActive: true
      });

      // Clear cache
      const cacheKey = `warnings:${userId}:${guildId}`;
      cache.delete(cacheKey);

      return {
        success: true,
        warning,
        totalWarnings: warningCount,
        warningId: warning._id
      };
    } catch (error) {
      console.error('Error adding warning:', error);
      throw error;
    }
  }

  async getWarnings(userId, guildId, activeOnly = true) {
    try {
      const cacheKey = `warnings:${userId}:${guildId}:${activeOnly}`;
      let warnings = cache.get(cacheKey);
      
      if (!warnings) {
        const query = { userId, guildId };
        if (activeOnly) query.isActive = true;
        
        warnings = await Warning.find(query)
          .sort({ createdAt: -1 })
          .populate('moderatorId', 'username')
          .lean();
        
        cache.set(cacheKey, warnings, 300); // 5 minutes
      }
      
      return {
        warnings,
        total: warnings.length,
        active: warnings.filter(w => w.isActive).length
      };
    } catch (error) {
      console.error('Error getting warnings:', error);
      throw error;
    }
  }

  async removeWarning(warningId, moderatorId) {
    try {
      const warning = await Warning.findByIdAndUpdate(
        warningId,
        { 
          isActive: false,
          removedBy: moderatorId,
          removedAt: new Date()
        },
        { new: true }
      );

      if (!warning) {
        return {
          success: false,
          error: 'Warning not found'
        };
      }

      // Clear cache
      const cacheKey = `warnings:${warning.userId}:${warning.guildId}`;
      cache.delete(cacheKey);

      return {
        success: true,
        warning
      };
    } catch (error) {
      console.error('Error removing warning:', error);
      throw error;
    }
  }

  async banUser(guild, userId, moderatorId, reason, duration = null) {
    try {
      const member = await guild.members.fetch(userId).catch(() => null);
      
      if (member) {
        await member.ban({ reason: `${reason} | Moderator: ${moderatorId}` });
      } else {
        await guild.bans.create(userId, { reason: `${reason} | Moderator: ${moderatorId}` });
      }

      // Log the ban
      const banRecord = {
        userId,
        guildId: guild.id,
        moderatorId,
        reason,
        duration,
        type: 'ban',
        timestamp: new Date()
      };

      // If temporary ban, schedule unban
      if (duration) {
        setTimeout(async () => {
          try {
            await guild.bans.remove(userId, 'Temporary ban expired');
          } catch (error) {
            console.error('Error removing temporary ban:', error);
          }
        }, duration);
      }

      return {
        success: true,
        action: 'ban',
        userId,
        reason,
        duration,
        moderatorId
      };
    } catch (error) {
      console.error('Error banning user:', error);
      throw error;
    }
  }

  async kickUser(guild, userId, moderatorId, reason) {
    try {
      const member = await guild.members.fetch(userId);
      
      if (!member) {
        return {
          success: false,
          error: 'User not found in guild'
        };
      }

      await member.kick(`${reason} | Moderator: ${moderatorId}`);

      return {
        success: true,
        action: 'kick',
        userId,
        reason,
        moderatorId
      };
    } catch (error) {
      console.error('Error kicking user:', error);
      throw error;
    }
  }

  async muteUser(guild, userId, moderatorId, reason, duration = 3600000) { // 1 hour default
    try {
      const member = await guild.members.fetch(userId);
      
      if (!member) {
        return {
          success: false,
          error: 'User not found in guild'
        };
      }

      // Use Discord's timeout feature
      const timeoutUntil = new Date(Date.now() + duration);
      await member.timeout(duration, `${reason} | Moderator: ${moderatorId}`);

      // Store mute info
      this.mutedUsers.set(`${userId}:${guild.id}`, {
        userId,
        guildId: guild.id,
        moderatorId,
        reason,
        mutedAt: new Date(),
        expiresAt: timeoutUntil
      });

      return {
        success: true,
        action: 'mute',
        userId,
        reason,
        duration,
        expiresAt: timeoutUntil,
        moderatorId
      };
    } catch (error) {
      console.error('Error muting user:', error);
      throw error;
    }
  }

  async unmuteUser(guild, userId, moderatorId) {
    try {
      const member = await guild.members.fetch(userId);
      
      if (!member) {
        return {
          success: false,
          error: 'User not found in guild'
        };
      }

      await member.timeout(null, `Unmuted by moderator: ${moderatorId}`);

      // Remove from muted users
      this.mutedUsers.delete(`${userId}:${guild.id}`);

      return {
        success: true,
        action: 'unmute',
        userId,
        moderatorId
      };
    } catch (error) {
      console.error('Error unmuting user:', error);
      throw error;
    }
  }

  async clearMessages(channel, amount, filter = null) {
    try {
      let messages;
      
      if (filter) {
        const fetched = await channel.messages.fetch({ limit: Math.min(amount * 2, 100) });
        messages = fetched.filter(filter).first(amount);
      } else {
        messages = await channel.messages.fetch({ limit: Math.min(amount, 100) });
      }

      const deleted = await channel.bulkDelete(messages, true);

      return {
        success: true,
        deleted: deleted.size,
        requested: amount
      };
    } catch (error) {
      console.error('Error clearing messages:', error);
      throw error;
    }
  }

  async getAutoModConfig(guildId) {
    try {
      const cacheKey = `automod:${guildId}`;
      let config = cache.get(cacheKey);
      
      if (!config) {
        config = await AutoModConfig.findOne({ guildId }) || {
          guildId,
          enabled: false,
          filters: {
            spam: false,
            links: false,
            invites: false,
            caps: false,
            profanity: false
          },
          actions: {
            delete: true,
            warn: true,
            mute: false,
            kick: false
          },
          thresholds: {
            spam: 5,
            caps: 70,
            warnings: 3
          }
        };
        
        cache.set(cacheKey, config, 600); // 10 minutes
      }
      
      return config;
    } catch (error) {
      console.error('Error getting automod config:', error);
      throw error;
    }
  }

  async updateAutoModConfig(guildId, updates) {
    try {
      const config = await AutoModConfig.findOneAndUpdate(
        { guildId },
        { $set: updates },
        { new: true, upsert: true }
      );

      // Clear cache
      const cacheKey = `automod:${guildId}`;
      cache.delete(cacheKey);

      return {
        success: true,
        config
      };
    } catch (error) {
      console.error('Error updating automod config:', error);
      throw error;
    }
  }

  async checkAutoMod(message) {
    try {
      const config = await this.getAutoModConfig(message.guild.id);
      
      if (!config.enabled) return null;

      const violations = [];
      const content = message.content.toLowerCase();

      // Check spam (repeated characters)
      if (config.filters.spam) {
        const spamPattern = /(.)\1{4,}/g;
        if (spamPattern.test(content)) {
          violations.push('spam');
        }
      }

      // Check caps
      if (config.filters.caps && content.length > 10) {
        const capsPercentage = (content.match(/[A-Z]/g) || []).length / content.length * 100;
        if (capsPercentage > config.thresholds.caps) {
          violations.push('caps');
        }
      }

      // Check links
      if (config.filters.links) {
        const linkPattern = /https?:\/\/[^\s]+/g;
        if (linkPattern.test(content)) {
          violations.push('links');
        }
      }

      // Check Discord invites
      if (config.filters.invites) {
        const invitePattern = /(discord\.gg|discordapp\.com\/invite|discord\.com\/invite)/i;
        if (invitePattern.test(content)) {
          violations.push('invites');
        }
      }

      if (violations.length > 0) {
        return {
          violations,
          actions: config.actions,
          message
        };
      }

      return null;
    } catch (error) {
      console.error('Error checking automod:', error);
      return null;
    }
  }

  async getModerationStats(guildId) {
    try {
      const cacheKey = `mod_stats:${guildId}`;
      let stats = cache.get(cacheKey);
      
      if (!stats) {
        const warnings = await Warning.find({ guildId });
        const activeWarnings = warnings.filter(w => w.isActive);
        
        stats = {
          totalWarnings: warnings.length,
          activeWarnings: activeWarnings.length,
          topModerators: this.getTopModerators(warnings),
          recentActivity: warnings.slice(-10).reverse()
        };
        
        cache.set(cacheKey, stats, 300); // 5 minutes
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting moderation stats:', error);
      throw error;
    }
  }

  getTopModerators(warnings) {
    const moderatorCounts = {};
    
    warnings.forEach(warning => {
      moderatorCounts[warning.moderatorId] = (moderatorCounts[warning.moderatorId] || 0) + 1;
    });

    return Object.entries(moderatorCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([moderatorId, count]) => ({ moderatorId, count }));
  }
}

module.exports = new ModerationManager();