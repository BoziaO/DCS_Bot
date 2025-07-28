const fs = require("node:fs");
const path = require("node:path");
require("dotenv").config();

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

const validateCommandStructure = (command, filePath) => {
  const issues = [];

  if (!command.data) {
    issues.push("Missing data property");
    return issues;
  }

  const commandData = command.data.toJSON();

  if (!commandData.name) {
    issues.push("Missing command name");
  }

  if (!commandData.description) {
    issues.push("Missing command description");
  }

  if (commandData.options && commandData.options.length > 0) {
    const hasSubcommands = commandData.options.some((opt) => opt.type === 1);
    const hasSubcommandGroups = commandData.options.some(
      (opt) => opt.type === 2
    );
    const hasOtherOptions = commandData.options.some(
      (opt) => opt.type !== 1 && opt.type !== 2
    );

    if ((hasSubcommands || hasSubcommandGroups) && hasOtherOptions) {
      issues.push(
        "CRITICAL: Sub-commands and sub-command groups cannot be mixed with other option types"
      );
      issues.push("Options found:");
      commandData.options.forEach((opt, index) => {
        const typeNames = {
          1: "SUB_COMMAND",
          2: "SUB_COMMAND_GROUP",
          3: "STRING",
          4: "INTEGER",
          5: "BOOLEAN",
          6: "USER",
          7: "CHANNEL",
          8: "ROLE",
          9: "MENTIONABLE",
          10: "NUMBER",
          11: "ATTACHMENT",
        };
        issues.push(
          `  ${index}: ${opt.name} (type: ${typeNames[opt.type] || opt.type})`
        );
      });
    }

    commandData.options.forEach((option, index) => {
      if (!option.name) {
        issues.push(`Option ${index}: Missing name`);
      }

      if (!option.description) {
        issues.push(`Option ${index}: Missing description`);
      }

      if (option.type === undefined) {
        issues.push(`Option ${index}: Missing type`);
      }

      if (option.type === 1 && option.options) {
        option.options.forEach((subOpt, subIndex) => {
          if (!subOpt.name) {
            issues.push(
              `Subcommand ${option.name} option ${subIndex}: Missing name`
            );
          }
          if (!subOpt.description) {
            issues.push(
              `Subcommand ${option.name} option ${subIndex}: Missing description`
            );
          }
        });
      }
    });
  }

  return issues;
};

const scanAllCommands = () => {
  const commandsPath = path.join(__dirname, "..", "src", "commands");
  const allIssues = [];

  if (!fs.existsSync(commandsPath)) {
    console.error(`${colors.red}Commands directory not found!${colors.reset}`);
    return;
  }

  const folders = fs.readdirSync(commandsPath);

  for (const folder of folders) {
    const folderPath = path.join(commandsPath, folder);

    if (!fs.statSync(folderPath).isDirectory()) continue;

    const files = fs.readdirSync(folderPath).filter((f) => f.endsWith(".js"));

    for (const file of files) {
      const filePath = path.join(folderPath, file);
      const relativePath = path.relative(process.cwd(), filePath);

      try {
        delete require.cache[require.resolve(filePath)];
        const command = require(filePath);

        if (!command.data || !command.execute) {
          allIssues.push({
            file: relativePath,
            issues: ["Missing data or execute property"],
          });
          continue;
        }

        const issues = validateCommandStructure(command, filePath);

        if (issues.length > 0) {
          allIssues.push({
            file: relativePath,
            command: command.data.name,
            issues,
          });
        }
      } catch (error) {
        allIssues.push({
          file: relativePath,
          issues: [`Syntax error: ${error.message}`],
        });
      }
    }
  }

  return allIssues;
};

const main = () => {
  console.log(
    `${colors.cyan}🔍 Scanning commands for structural issues...${colors.reset}\n`
  );

  const allIssues = scanAllCommands();

  if (allIssues.length === 0) {
    console.log(`${colors.green}✅ All commands are valid!${colors.reset}`);
    return;
  }

  console.log(
    `${colors.red}❌ Found issues in ${allIssues.length} command(s):${colors.reset}\n`
  );

  allIssues.forEach(({ file, command, issues }) => {
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
    `${colors.blue}💡 Fix these issues before deploying commands.${colors.reset}`
  );
};

if (require.main === module) {
  main();
}

module.exports = { validateCommandStructure, scanAllCommands };
