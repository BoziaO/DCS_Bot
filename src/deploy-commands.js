const { REST, Routes } = require("discord.js");
const fs = require("node:fs");
const path = require("node:path");
const { scanAllCommands } = require("./command-validator");

require("dotenv").config();
const token = process.env.DISCORD_TOKEN;
const clientId = process.env.CLIENT_ID;
const guildId = process.env.GUILD_ID;

if (!token || !clientId) {
  console.error(
    "❌ DISCORD_TOKEN and CLIENT_ID must be defined in the .env file."
  );
  process.exit(1);
}

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const loadCommands = () => {
  const commands = [];
  const foldersPath = path.join(__dirname, "commands");

  if (!fs.existsSync(foldersPath)) {
    console.error(
      `${colors.red}❌ Commands directory not found!${colors.reset}`
    );
    process.exit(1);
  }

  const commandFolders = fs.readdirSync(foldersPath);

  for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);

    if (!fs.statSync(commandsPath).isDirectory()) continue;

    const commandFiles = fs
      .readdirSync(commandsPath)
      .filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(commandsPath, file);

      try {
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);

        if ("data" in command && "execute" in command) {
          const commandData = command.data.toJSON();

          if (!commandData.name || !commandData.description) {
            console.error(
              `${colors.red}❌ Command ${file} is missing name or description${colors.reset}`
            );
            continue;
          }

          commands.push(commandData);
          console.log(
            `${colors.green}✅ Loaded: ${commandData.name}${colors.reset}`
          );
        } else {
          console.error(
            `${colors.red}❌ Command ${file} missing data or execute${colors.reset}`
          );
        }
      } catch (error) {
        console.error(
          `${colors.red}❌ Error loading ${file}:${colors.reset}`,
          error.message
        );
      }
    }
  }

  return commands;
};

const deployCommands = async (commands) => {
  const rest = new REST({ version: "10" }).setToken(token);

  try {
    console.log(
      `${colors.cyan}🚀 Deploying ${commands.length} commands...${colors.reset}`
    );

    const data = guildId
      ? await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
          body: commands,
        })
      : await rest.put(Routes.applicationCommands(clientId), {
          body: commands,
        });

    console.log(
      `${colors.green}✅ Successfully deployed ${data.length} commands!${colors.reset}`
    );
  } catch (error) {
    console.error(`${colors.red}❌ Deployment failed:${colors.reset}`);

    if (error.code === 50035) {
      console.error(
        `${colors.red}Invalid Form Body - Command structure error${colors.reset}`
      );
      console.error(
        `${colors.yellow}Running command validator...${colors.reset}\n`
      );

      const issues = scanAllCommands();
      if (issues.length > 0) {
        console.log(
          `${colors.red}Found ${issues.length} issue(s):${colors.reset}\n`
        );
        issues.forEach(({ file, command, issues }) => {
          console.log(
            `${colors.yellow}📄 ${file}${colors.reset}${
              command ? ` (${command})` : ""
            }`
          );
          issues.forEach((issue) => {
            console.log(`${colors.white}   • ${issue}${colors.reset}`);
          });
          console.log("");
        });
      }
    } else {
      console.error(error);
    }

    process.exit(1);
  }
};

const main = async () => {
  console.log(`${colors.cyan}🔧 Discord Command Deployer${colors.reset}\n`);

  console.log(`${colors.blue}🔍 Validating commands...${colors.reset}`);
  const issues = scanAllCommands();

  if (issues.length > 0) {
    console.log(
      `${colors.red}❌ Found ${issues.length} validation issue(s):${colors.reset}\n`
    );
    issues.forEach(({ file, command, issues }) => {
      console.log(
        `${colors.yellow}📄 ${file}${colors.reset}${
          command ? ` (${command})` : ""
        }`
      );
      issues.forEach((issue) => {
        const isCritical = issue.includes("CRITICAL");
        const color = isCritical ? colors.red : colors.white;
        console.log(`${color}   • ${issue}${colors.reset}`);
      });
      console.log("");
    });
    console.log(
      `${colors.red}❌ Fix these issues before deploying!${colors.reset}`
    );
    process.exit(1);
  }

  console.log(
    `${colors.green}✅ All commands validated successfully!${colors.reset}\n`
  );

  const commands = loadCommands();

  if (commands.length === 0) {
    console.log(`${colors.yellow}⚠️ No commands to deploy${colors.reset}`);
    process.exit(0);
  }

  await deployCommands(commands);
};

main();
