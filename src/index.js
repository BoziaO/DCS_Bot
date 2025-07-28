const fs = require("node:fs");
const path = require("node:path");
const {
  Client,
  Collection,
  GatewayIntentBits,
  Partials,
  Options,
} = require("discord.js");

const { dbService } = require("./utils/database");
const { cache } = require("./utils/cache");
const { performanceMonitor } = require("./utils/performance");

require("dotenv").config();
const token = process.env.DISCORD_TOKEN;

if (!token) {
  throw new Error(
    "DISCORD_TOKEN is not defined in the .env file. Please add it."
  );
}

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

const logWithAnimation = (message, color = colors.white, delay = 50) => {
  return new Promise((resolve) => {
    let i = 0;
    const interval = setInterval(() => {
      process.stdout.write(
        `\r${color}${message.substring(0, i + 1)}${colors.reset}`
      );
      i++;
      if (i >= message.length) {
        clearInterval(interval);
        console.log();
        setTimeout(resolve, delay);
      }
    }, delay);
  });
};

const showBootAnimation = async () => {
  console.clear();
  const logo = `
    ${colors.cyan}╔═══════════════════════════════════════════════════════════════╗${colors.reset}
    ${colors.cyan}║                                                               ║${colors.reset}
    ${colors.cyan}║                  ${colors.bright}👻 DUCHOWE CZTERY SERY 👻${colors.reset}${colors.cyan}                    ║${colors.reset}
    ${colors.cyan}║                                                               ║${colors.reset}
    ${colors.cyan}║        ${colors.yellow}Hunt ghosts, solve mysteries, survive the night!${colors.reset}${colors.cyan}       ║${colors.reset}
    ${colors.cyan}║                                                               ║${colors.reset}
    ${colors.cyan}╚═══════════════════════════════════════════════════════════════╝${colors.reset}
    `;
  console.log(logo);
  await new Promise((resolve) => setTimeout(resolve, 500));
  await logWithAnimation("🔧 Initializing bot systems...", colors.yellow);
};

const mongooseOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 10000,
  maxPoolSize: 10,
  minPoolSize: 1,
  maxIdleTimeMS: 30000,
  heartbeatFrequencyMS: 10000,
  retryWrites: true,
  w: "majority",
};

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  makeCache: Options.cacheWithLimits({
    MessageManager: 50,
    PresenceManager: 0,
    GuildMemberManager: {
      maxSize: 200,
      keepOverLimit: (member) => member.id === client.user?.id,
    },
    BaseGuildEmojiManager: 0,
    GuildBanManager: 0,
    GuildInviteManager: 0,
    GuildScheduledEventManager: 0,
    GuildStickerManager: 0,
    StageInstanceManager: 0,
    ThreadManager: 10,
    UserManager: 100,
    ReactionManager: 25,
    ReactionUserManager: 0,
  }),
  sweepers: {
    ...Options.DefaultSweeperSettings,
    messages: { interval: 1200, lifetime: 600 },
    threads: { interval: 1800, lifetime: 900 },
    users: {
      interval: 2400,
      filter: () => (user) => user.bot && user.id !== client.user?.id,
    },
    guildMembers: { interval: 3600, filter: () => () => true },
  },
  rest: {
    timeout: 20000,
    retries: 5,
    globalRequestsPerSecond: 50,
  },

  failIfNotExists: false,
  allowedMentions: {
    parse: ["users", "roles"],
    repliedUser: false,
  },
});

client.commands = new Collection();

const loadHandlers = async (directory, handlerName) => {
  const dirPath = path.join(__dirname, directory);
  if (!fs.existsSync(dirPath)) {
    console.log(
      `${colors.red}[ERROR] ${handlerName} folder not found at ${dirPath}${colors.reset}`
    );
    return 0;
  }

  const files = fs.readdirSync(dirPath, { withFileTypes: true });
  let count = 0;
  const loadPromises = [];

  for (const file of files) {
    const fullPath = path.join(dirPath, file.name);
    if (file.isDirectory()) {
      loadPromises.push(
        loadHandlers(path.join(directory, file.name), handlerName)
      );
    } else if (file.name.endsWith(".js")) {
      loadPromises.push(
        loadSingleHandler(fullPath, directory, handlerName, file.name)
      );
    }
  }

  const results = await Promise.allSettled(loadPromises);
  for (const result of results) {
    if (result.status === "fulfilled") {
      count += result.value;
    } else {
      console.error(
        `${colors.red}[✗] Handler loading failed:${colors.reset}`,
        result.reason
      );
    }
  }

  return count;
};

const loadSingleHandler = async (
  fullPath,
  directory,
  handlerName,
  fileName
) => {
  try {
    delete require.cache[require.resolve(fullPath)];
    const handler = require(fullPath);

    if (directory.includes("commands")) {
      if ("data" in handler && "execute" in handler) {
        const originalExecute = handler.execute;
        handler.execute = async function (interaction) {
          const start = process.hrtime.bigint();
          let success = true;
          let error = null;

          try {
            await originalExecute.call(this, interaction);
          } catch (err) {
            success = false;
            error = err;
            throw err;
          } finally {
            const end = process.hrtime.bigint();
            const executionTime = Number(end - start) / 1000000;
            performanceMonitor.trackCommand(
              handler.data.name,
              executionTime,
              success,
              error
            );
          }
        };

        client.commands.set(handler.data.name, handler);
      } else {
        console.log(
          `${colors.yellow}[⚠] Invalid command at ${fullPath}${colors.reset}`
        );
        return 0;
      }
    } else if (directory.includes("events")) {
      const originalExecute = handler.execute;
      const wrappedExecute = async (...args) => {
        const start = process.hrtime.bigint();
        let success = true;
        let error = null;

        try {
          await originalExecute(...args);
        } catch (err) {
          success = false;
          error = err;
          console.error(
            `${colors.red}[ERROR] Event ${handler.name} failed:${colors.reset}`,
            err
          );
        } finally {
          const end = process.hrtime.bigint();
          const executionTime = Number(end - start) / 1000000;
          performanceMonitor.trackEvent(
            handler.name,
            executionTime,
            success,
            error
          );
        }
      };

      if (handler.once) {
        client.once(handler.name, wrappedExecute);
      } else {
        client.on(handler.name, wrappedExecute);
      }
    }
    return 1;
  } catch (error) {
    console.error(
      `${colors.red}[✗] Error loading ${handlerName} ${fileName}:${colors.reset}`,
      error.message
    );
    return 0;
  }
};

const connectToMongoDB = async (maxRetries = 5) => {
  await logWithAnimation(
    "🌐 Connecting to MongoDB with optimizations...",
    colors.blue
  );

  try {
    await dbService.connect(process.env.MONGODB_URI, {
      ...mongooseOptions,
      maxPoolSize: 15,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      serverSelectionTimeoutMS: 10000,
    });

    console.log(
      `${colors.green}[✓] Optimized MongoDB connection established${colors.reset}`
    );

    await warmupCache();

    return true;
  } catch (error) {
    console.error(
      `${colors.red}[✗] MongoDB connection failed:${colors.reset}`,
      error.message
    );
    throw error;
  }
};

const warmupCache = async () => {
  try {
    console.log(
      `${colors.cyan}[INFO] Warming up cache with advanced strategies...${colors.reset}`
    );

    const cachePreloader = require("./utils/cachePreloader");
    const startTime = Date.now();

    const { results, summary } = await cachePreloader.smartPreload(client);

    const duration = Date.now() - startTime;

    console.log(
      `${colors.green}[✓] Cache warmup completed in ${duration}ms${colors.reset}`
    );
    console.log(
      `${colors.cyan}[INFO] Cached ${summary.totalItems} items using ${summary.successfulStrategies}/${summary.totalStrategies} strategies${colors.reset}`
    );

    results.forEach((result) => {
      if (result.successful > 0) {
        console.log(
          `${colors.dim}  • ${result.strategy}: ${result.successful}/${result.total} items${colors.reset}`
        );
      } else if (result.error) {
        console.warn(
          `${colors.yellow}  • ${result.strategy}: Failed - ${result.error}${colors.reset}`
        );
      }
    });

    if (summary.errors.length > 0) {
      console.warn(
        `${colors.yellow}[⚠] ${summary.errors.length} strategies failed:${colors.reset}`
      );
      summary.errors.forEach(({ strategy, error }) => {
        console.warn(
          `${colors.yellow}  • ${strategy}: ${error}${colors.reset}`
        );
      });
    }

    const cacheHealth = cache.healthCheck();
    console.log(
      `${colors.dim}[DEBUG] Cache health: ${
        cacheHealth.healthy ? "Good" : "Warning"
      } - ${cacheHealth.stats.size}/${cache.maxSize} entries${colors.reset}`
    );
    console.log(
      `${colors.dim}[DEBUG] Memory usage: ${cacheHealth.memoryUsage.heapUsed}MB heap${colors.reset}`
    );

    if (cacheHealth.recommendations.length > 0) {
      console.log(`${colors.cyan}[INFO] Cache recommendations:${colors.reset}`);
      cacheHealth.recommendations.forEach((rec) => {
        console.log(`${colors.dim}  • ${rec}${colors.reset}`);
      });
    }
  } catch (error) {
    console.warn(
      `${colors.yellow}[⚠] Cache warmup failed:${colors.reset}`,
      error.message
    );
  }
};

const initializeBot = async () => {
  try {
    await showBootAnimation();
    await connectToMongoDB();

    await logWithAnimation("⚙️  Loading commands and events...", colors.cyan);
    const commandCount = await loadHandlers("commands", "Command");
    const eventCount = await loadHandlers("events", "Event");
    console.log(
      `${colors.cyan}[INFO] Loaded ${commandCount} commands and ${eventCount} events total.${colors.reset}`
    );

    await logWithAnimation(
      "📡 Establishing Discord connection...",
      colors.magenta
    );
    await client.login(token);
  } catch (error) {
    console.error(
      `${colors.red}[FATAL] Failed to initialize bot:${colors.reset}`,
      error.message
    );
    process.exit(1);
  }
};

const gracefulShutdown = async (signal) => {
  console.log(
    `${colors.yellow}[INFO] Received ${signal}. Shutting down gracefully...${colors.reset}`
  );

  try {
    const finalReport = performanceMonitor.generateReport();
    console.log(
      `${colors.cyan}[INFO] Final performance report generated${colors.reset}`
    );

    if (client.isReady()) {
      client.destroy();
    }

    await dbService.disconnect();

    cache.clear();

    console.log(
      `${colors.green}[INFO] Bot shut down successfully.${colors.reset}`
    );
    process.exit(0);
  } catch (error) {
    console.error(
      `${colors.red}[ERROR] Error during shutdown:${colors.reset}`,
      error
    );
    process.exit(1);
  }
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

process.on("unhandledRejection", (reason, promise) => {
  console.error(
    `${colors.red}[ERROR] Unhandled promise rejection:${colors.reset}`,
    reason
  );
  performanceMonitor.logError("system", "unhandledRejection", reason);
});

process.on("uncaughtException", (error) => {
  console.error(
    `${colors.red}[FATAL] Uncaught exception:${colors.reset}`,
    error
  );
  performanceMonitor.logError("system", "uncaughtException", error);
  gracefulShutdown("UNCAUGHT_EXCEPTION");
});

client.on("error", (error) => {
  console.error(
    `${colors.red}[ERROR] Discord client error:${colors.reset}`,
    error
  );
  performanceMonitor.logError("discord", "clientError", error);
});

client.on("warn", (warning) => {
  console.warn(
    `${colors.yellow}[WARNING] Discord client warning:${colors.reset}`,
    warning
  );
});

client.on("rateLimit", (rateLimitData) => {
  console.warn(
    `${colors.yellow}[RATE LIMIT] ${rateLimitData.method} ${rateLimitData.route}${colors.reset}`
  );
});

client.on("debug", (info) => {
  if (info.includes("Heartbeat") || info.includes("Session")) {
    console.log(`${colors.dim}[DEBUG] ${info}${colors.reset}`);
  }
});

setInterval(() => {
  const memUsage = process.memoryUsage();
  const memUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);

  if (memUsedMB > 256) {
    console.warn(
      `${colors.yellow}[MEMORY] High memory usage: ${memUsedMB}MB${colors.reset}`
    );
  }
}, 60000);

initializeBot();
