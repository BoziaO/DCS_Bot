const { Events, ActivityType, EmbedBuilder } = require("discord.js");
const cron = require("node-cron");
const Profile = require("../models/Profile");
const DailyChallengeConfig = require("../models/DailyChallengeConfig");
const { ghosts, challenges } = require("../data/phasmophobiaData");
const { performanceMonitor } = require("../utils/performance");
const { cache } = require("../utils/cache");
const challengeScheduler = require("../utils/leveling/challengeScheduler");
const levelingCache = require("../utils/leveling/levelingCache");
const welcomeCache = require("../utils/welcome/welcomeCache");

const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const statusMessages = [
  { type: ActivityType.Playing, name: "Phasmophobia 👻" },
  { type: ActivityType.Watching, name: "ghost hunts 🔍" },
  { type: ActivityType.Listening, name: "spirit voices 📻" },
  { type: ActivityType.Playing, name: "with Ouija boards 🪄" },
  { type: ActivityType.Competing, name: "ghost hunting competitions 🏆" },
];
let currentStatusIndex = 0;
const rotateStatus = (client) => {
  if (!client.user) return;
  const status = statusMessages[currentStatusIndex];
  client.user.setActivity(status.name, { type: status.type });
  currentStatusIndex = (currentStatusIndex + 1) % statusMessages.length;
};

const sanityRegeneration = async () => {
  const start = process.hrtime.bigint();

  try {
    const result = await Profile.updateMany({ sanity: { $lt: 100 } }, [
      { $set: { sanity: { $min: [100, { $add: ["$sanity", 5] }] } } },
    ]);

    if (result.modifiedCount > 0) {
      console.log(
        `${colors.dim}[CRON] Regenerated sanity for ${result.modifiedCount} users.${colors.reset}`
      );

      const cacheKeys = Array.from(cache.cache.keys()).filter((key) =>
        key.startsWith("profile:")
      );
      for (const key of cacheKeys) {
        cache.delete(key);
      }
    }

    const end = process.hrtime.bigint();
    const executionTime = Number(end - start) / 1000000;
    performanceMonitor.trackDatabaseQuery(
      "sanityRegeneration",
      executionTime,
      true
    );
  } catch (error) {
    const end = process.hrtime.bigint();
    const executionTime = Number(end - start) / 1000000;
    performanceMonitor.trackDatabaseQuery(
      "sanityRegeneration",
      executionTime,
      false,
      error
    );
    console.error(
      `${colors.red}[ERROR] Sanity regeneration failed:${colors.reset}`,
      error.message
    );
  }
};

const getDailyChallenge = () => {
  const challengeKeys = Object.keys(challenges);
  const randomCategoryKey =
    challengeKeys[Math.floor(Math.random() * challengeKeys.length)];
  const category = challenges[randomCategoryKey];
  const baseChallenge =
    category.tasks[Math.floor(Math.random() * category.tasks.length)];

  if (Math.random() < 0.33 && ghosts && ghosts.length > 0) {
    const randomGhost = ghosts[Math.floor(Math.random() * ghosts.length)];
    return {
      challenge: `${baseChallenge}\n**Bonus:** Znajdź ducha typu *${randomGhost.name}* 👻`,
      category,
    };
  }
  return { challenge: baseChallenge, category };
};

const scheduleDailyChallenge = (client) => {
  cron.schedule(
    "0 8 * * *",
    async () => {
      console.log(
        `${colors.yellow}[CRON] Running daily challenge job...${colors.reset}`
      );
      try {
        const configs = await DailyChallengeConfig.find();
        if (configs.length === 0) return;

        const { challenge, category } = getDailyChallenge();
        const challengeEmbed = new EmbedBuilder()
          .setTitle("📅 Codzienne Wyzwanie Phasmophobia!")
          .setDescription(
            `**Kategoria:** ${category.emoji} ${category.name}\n\n**Wyzwanie:**\n> ${challenge}`
          )
          .setColor("#ff6b35")
          .setTimestamp()
          .setFooter({ text: "Powodzenia, łowcy duchów! 🎯" });

        for (const config of configs) {
          try {
            const channel = await client.channels.fetch(config.channelId);
            if (channel && channel.isTextBased()) {
              await channel.send({ embeds: [challengeEmbed] });
            }
          } catch (error) {
            console.error(
              `${colors.red}[ERROR] Failed to send challenge to ${config.channelId}:${colors.reset}`,
              error.message
            );
          }
        }
      } catch (error) {
        console.error(
          `${colors.red}[ERROR] Daily challenge job failed:${colors.reset}`,
          error
        );
      }
    },
    { timezone: "Europe/Warsaw" }
  );
};

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
    console.log(
      `${colors.green}[✓] Bot is ready! Logged in as ${client.user.tag}${colors.reset}`
    );
    console.log(
      `${colors.cyan}[INFO] Serving ${client.guilds.cache.size} guilds.${colors.reset}`
    );

    rotateStatus(client);
    setInterval(() => rotateStatus(client), 30000);

    setInterval(sanityRegeneration, 3600 * 1000);
    scheduleDailyChallenge(client);

    try {
      challengeScheduler.start();
      console.log(
        `${colors.green}[✓] Challenge Scheduler initialized successfully${colors.reset}`
      );
    } catch (error) {
      console.error(
        `${colors.red}[ERROR] Failed to initialize Challenge Scheduler:${colors.reset}`,
        error
      );
    }

    try {
      levelingCache.initialize();
      console.log(
        `${colors.green}[✓] Leveling Cache initialized successfully${colors.reset}`
      );
    } catch (error) {
      console.error(
        `${colors.red}[ERROR] Failed to initialize Leveling Cache:${colors.reset}`,
        error
      );
    }

    try {
      const guildIds = client.guilds.cache.map((guild) => guild.id);
      await welcomeCache.warmup(guildIds);
      console.log(
        `${colors.green}[✓] Welcome Cache warmed up for ${guildIds.length} guilds${colors.reset}`
      );
    } catch (error) {
      console.error(
        `${colors.red}[ERROR] Failed to warm up Welcome Cache:${colors.reset}`,
        error
      );
    }

    setInterval(() => {
      const report = performanceMonitor.generateReport();
      console.log(
        `${colors.cyan}[PERFORMANCE] Generated performance report${colors.reset}`
      );
    }, 300000);

    setInterval(() => {
      const cacheHealth = cache.healthCheck();

      if (!cacheHealth.healthy) {
        console.log(
          `${colors.yellow}[CACHE] Cache health warning: ${cacheHealth.stats.size}/${cache.maxSize} entries${colors.reset}`
        );
      }

      if (Math.random() < 0.5) {
        console.log(
          `${colors.dim}[CACHE] Stats: ${cacheHealth.stats.size} entries, ` +
            `${(cacheHealth.stats.hitRate * 100).toFixed(1)}% hit rate, ` +
            `${cacheHealth.memoryUsage.heapUsed}MB memory${colors.reset}`
        );

        if (cacheHealth.recommendations.length > 0) {
          console.log(`${colors.cyan}[CACHE] Recommendations:${colors.reset}`);
          cacheHealth.recommendations.forEach((rec) => {
            console.log(`${colors.dim}  • ${rec}${colors.reset}`);
          });
        }
      }
    }, 1800000);

    console.log(`
    ${colors.green}╔═══════════════════════════════════════════════════════════════╗${colors.reset}
    ${colors.green}║                                                               ║${colors.reset}
    ${colors.green}║                 ${colors.bright}🎉 BOT SUCCESSFULLY STARTED! 🎉${colors.reset}${colors.green}               ║${colors.reset}
    ${colors.green}║                                                               ║${colors.reset}
    ${colors.green}║           ${colors.white}Ready to hunt ghosts and solve mysteries!${colors.reset}${colors.green}           ║${colors.reset}
    ${colors.green}║                                                               ║${colors.reset}
    ${colors.green}╚═══════════════════════════════════════════════════════════════╝${colors.reset}
    `);
  },
};
