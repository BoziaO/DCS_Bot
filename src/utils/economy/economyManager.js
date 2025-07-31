const Profile = require('../../models/Profile');
const ShopRole = require('../../models/ShopRole');
const { cache } = require('../cache');

class EconomyManager {
  constructor() {
    this.dailyCooldowns = new Map();
  }

  async getBalance(userId, guildId) {
    try {
      const cacheKey = `balance:${userId}:${guildId}`;
      let balance = cache.get(cacheKey);
      
      if (balance === undefined) {
        const profile = await Profile.findOne({ userId, guildId });
        balance = profile?.money || 0;
        cache.set(cacheKey, balance, 300); // 5 minutes
      }
      
      return { balance, userId, guildId };
    } catch (error) {
      console.error('Error getting balance:', error);
      throw error;
    }
  }

  async updateBalance(userId, guildId, amount, reason = 'Unknown') {
    try {
      const profile = await Profile.findOneAndUpdate(
        { userId, guildId },
        { 
          $inc: { money: amount },
          $push: {
            transactions: {
              amount,
              reason,
              timestamp: new Date(),
              type: amount > 0 ? 'credit' : 'debit'
            }
          }
        },
        { new: true, upsert: true }
      );

      // Update cache
      const cacheKey = `balance:${userId}:${guildId}`;
      cache.set(cacheKey, profile.money, 300);

      return {
        success: true,
        newBalance: profile.money,
        transaction: {
          amount,
          reason,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('Error updating balance:', error);
      throw error;
    }
  }

  async getDailyReward(userId, guildId) {
    try {
      const cooldownKey = `daily:${userId}:${guildId}`;
      const lastDaily = this.dailyCooldowns.get(cooldownKey);
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      if (lastDaily && lastDaily > oneDayAgo) {
        const timeLeft = 24 * 60 * 60 * 1000 - (now.getTime() - lastDaily.getTime());
        return {
          success: false,
          error: 'Daily reward already claimed',
          timeLeft: Math.ceil(timeLeft / 1000)
        };
      }

      // Calculate reward based on streak
      const profile = await Profile.findOne({ userId, guildId });
      const streak = this.calculateDailyStreak(profile?.lastDaily, now);
      const baseReward = 100;
      const streakBonus = Math.min(streak * 10, 200); // Max 200 bonus
      const totalReward = baseReward + streakBonus;

      // Update profile
      await Profile.findOneAndUpdate(
        { userId, guildId },
        {
          $inc: { money: totalReward },
          $set: { 
            lastDaily: now,
            dailyStreak: streak
          },
          $push: {
            transactions: {
              amount: totalReward,
              reason: `Daily reward (streak: ${streak})`,
              timestamp: now,
              type: 'credit'
            }
          }
        },
        { upsert: true }
      );

      // Update cooldown
      this.dailyCooldowns.set(cooldownKey, now);

      // Update cache
      const cacheKey = `balance:${userId}:${guildId}`;
      cache.delete(cacheKey);

      return {
        success: true,
        reward: totalReward,
        streak,
        nextDaily: new Date(now.getTime() + 24 * 60 * 60 * 1000)
      };
    } catch (error) {
      console.error('Error getting daily reward:', error);
      throw error;
    }
  }

  calculateDailyStreak(lastDaily, now) {
    if (!lastDaily) return 1;

    const daysDiff = Math.floor((now - lastDaily) / (24 * 60 * 60 * 1000));
    
    if (daysDiff === 1) {
      // Consecutive day
      return (lastDaily.dailyStreak || 1) + 1;
    } else if (daysDiff > 1) {
      // Streak broken
      return 1;
    } else {
      // Same day (shouldn't happen due to cooldown check)
      return lastDaily.dailyStreak || 1;
    }
  }

  async getShop(guildId) {
    try {
      const cacheKey = `shop:${guildId}`;
      let shopItems = cache.get(cacheKey);
      
      if (!shopItems) {
        shopItems = await ShopRole.find({ guildId, isActive: true })
          .sort({ price: 1 });
        cache.set(cacheKey, shopItems, 600); // 10 minutes
      }
      
      return {
        items: shopItems,
        categories: [...new Set(shopItems.map(item => item.category))],
        totalItems: shopItems.length
      };
    } catch (error) {
      console.error('Error getting shop:', error);
      throw error;
    }
  }

  async buyItem(userId, guildId, itemId, guild) {
    try {
      const shopItem = await ShopRole.findOne({ 
        _id: itemId, 
        guildId, 
        isActive: true 
      });

      if (!shopItem) {
        return {
          success: false,
          error: 'Item not found or not available'
        };
      }

      const profile = await Profile.findOne({ userId, guildId });
      if (!profile || profile.money < shopItem.price) {
        return {
          success: false,
          error: 'Insufficient funds',
          required: shopItem.price,
          current: profile?.money || 0
        };
      }

      // Check if user already has the role
      const member = await guild.members.fetch(userId);
      if (member.roles.cache.has(shopItem.roleId)) {
        return {
          success: false,
          error: 'You already have this role'
        };
      }

      // Deduct money and add role
      await Profile.findOneAndUpdate(
        { userId, guildId },
        {
          $inc: { money: -shopItem.price },
          $push: {
            transactions: {
              amount: -shopItem.price,
              reason: `Bought role: ${shopItem.name}`,
              timestamp: new Date(),
              type: 'debit'
            },
            purchasedRoles: {
              roleId: shopItem.roleId,
              name: shopItem.name,
              price: shopItem.price,
              purchasedAt: new Date()
            }
          }
        }
      );

      // Add role to user
      await member.roles.add(shopItem.roleId);

      // Update cache
      const cacheKey = `balance:${userId}:${guildId}`;
      cache.delete(cacheKey);

      return {
        success: true,
        item: shopItem,
        newBalance: profile.money - shopItem.price,
        transaction: {
          amount: -shopItem.price,
          reason: `Bought role: ${shopItem.name}`,
          timestamp: new Date()
        }
      };
    } catch (error) {
      console.error('Error buying item:', error);
      throw error;
    }
  }

  async getTransactionHistory(userId, guildId, limit = 10) {
    try {
      const profile = await Profile.findOne({ userId, guildId })
        .select('transactions')
        .lean();

      if (!profile || !profile.transactions) {
        return { transactions: [], total: 0 };
      }

      const transactions = profile.transactions
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, limit);

      return {
        transactions,
        total: profile.transactions.length
      };
    } catch (error) {
      console.error('Error getting transaction history:', error);
      throw error;
    }
  }

  async getEconomyStats(guildId) {
    try {
      const cacheKey = `economy_stats:${guildId}`;
      let stats = cache.get(cacheKey);
      
      if (!stats) {
        const profiles = await Profile.find({ guildId }).select('money transactions');
        
        const totalMoney = profiles.reduce((sum, p) => sum + (p.money || 0), 0);
        const totalTransactions = profiles.reduce((sum, p) => sum + (p.transactions?.length || 0), 0);
        const averageMoney = profiles.length > 0 ? totalMoney / profiles.length : 0;
        
        const richestUser = profiles.reduce((max, p) => 
          (p.money || 0) > (max.money || 0) ? p : max, { money: 0 });

        stats = {
          totalUsers: profiles.length,
          totalMoney,
          averageMoney: Math.round(averageMoney),
          totalTransactions,
          richestUser: richestUser.userId,
          richestAmount: richestUser.money || 0
        };
        
        cache.set(cacheKey, stats, 300); // 5 minutes
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting economy stats:', error);
      throw error;
    }
  }
}

module.exports = new EconomyManager();