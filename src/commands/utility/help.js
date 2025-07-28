const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Wyświetla listę wszystkich dostępnych komend.")
    .addStringOption((option) =>
      option
        .setName("komenda")
        .setDescription("Nazwa komendy do wyświetlenia szczegółów")
        .setRequired(false)
    ),

  async execute(interaction) {
    const specificCommand = interaction.options.getString("komenda");

    if (specificCommand) {
      return await this.showCommandDetails(interaction, specificCommand);
    }

    const commandsByCategory = await this.getCommandsByCategory(interaction);

    if (commandsByCategory.size === 0) {
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Błąd")
        .setDescription("Nie znaleziono żadnych komend.")
        .setColor("#e74c3c")
        .setTimestamp();

      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    const homeEmbed = this.createHomeEmbed(commandsByCategory);
    const selectMenu = this.createSelectMenu(commandsByCategory);
    const row = new ActionRowBuilder().addComponents(selectMenu);

    const reply = await interaction.reply({
      embeds: [homeEmbed],
      components: [row],
      ephemeral: true,
      fetchReply: true,
    });

    await this.handleMenuInteraction(
      interaction,
      reply,
      commandsByCategory,
      homeEmbed
    );
  },

  async getCommandsByCategory(interaction) {
    const commandsByCategory = new Map();
    const commandFoldersPath = path.join(__dirname, "..", "..");

    try {
      const commandFolders = fs.readdirSync(
        path.join(commandFoldersPath, "commands")
      );

      for (const folder of commandFolders) {
        const commandsPath = path.join(commandFoldersPath, "commands", folder);

        if (
          !fs.existsSync(commandsPath) ||
          !fs.statSync(commandsPath).isDirectory()
        ) {
          continue;
        }

        const commandFiles = fs
          .readdirSync(commandsPath)
          .filter((file) => file.endsWith(".js"));
        const categoryCommands = [];

        for (const file of commandFiles) {
          try {
            const command = require(path.join(commandsPath, file));
            if (command.data && command.data.name) {
              const cachedCommand =
                interaction.client.application.commands.cache.find(
                  (c) => c.name === command.data.name
                );
              categoryCommands.push({
                name: command.data.name,
                description: command.data.description || "Brak opisu",
                id: cachedCommand?.id || "0",
                usage: command.usage || null,
                examples: command.examples || null,
                cooldown: command.cooldown || null,
                permissions: command.permissions || null,
              });
            }
          } catch (error) {
            console.error(`Błąd podczas ładowania komendy ${file}:`, error);
          }
        }

        if (categoryCommands.length > 0) {
          const categoryName = this.formatCategoryName(folder);
          commandsByCategory.set(categoryName, categoryCommands);
        }
      }
    } catch (error) {
      console.error("Błąd podczas ładowania komend:", error);
    }

    return commandsByCategory;
  },

  formatCategoryName(folder) {
    const categoryMap = {
      admin: "🔧 Administracja",
      moderation: "🛡️ Moderacja",
      utility: "🔧 Narzędzia",
      fun: "🎉 Rozrywka",
      music: "🎵 Muzyka",
      economy: "💰 Ekonomia",
      game: "🎮 Gry",
      info: "ℹ️ Informacje",
    };

    return (
      categoryMap[folder] ||
      `📁 ${folder.charAt(0).toUpperCase() + folder.slice(1)}`
    );
  },

  createHomeEmbed(commandsByCategory) {
    const totalCommands = [...commandsByCategory.values()].reduce(
      (total, commands) => total + commands.length,
      0
    );

    return new EmbedBuilder()
      .setTitle("📜 Centrum Pomocy Bota")
      .setDescription(
        `Witaj w centrum pomocy! Wybierz kategorię z menu poniżej, aby zobaczyć listę dostępnych komend.\n\n**Dostępne kategorie:** ${commandsByCategory.size}\n**Łączna liczba komend:** ${totalCommands}`
      )
      .setColor("#1abc9c")
      .addFields(
        {
          name: "📋 Kategorie",
          value: [...commandsByCategory.keys()].join("\n") || "Brak kategorii",
          inline: true,
        },
        {
          name: "💡 Wskazówka",
          value:
            "Użyj `/help <nazwa_komendy>` aby zobaczyć szczegóły konkretnej komendy.",
          inline: true,
        }
      )
      .setFooter({ text: "Menu będzie aktywne przez 60 sekund" })
      .setTimestamp();
  },

  createSelectMenu(commandsByCategory) {
    const options = [
      {
        label: "Strona Główna",
        description: "Wróć do strony głównej.",
        value: "home",
        emoji: "🏠",
      },
    ];

    for (const [category, commands] of commandsByCategory) {
      options.push({
        label: category,
        description: `${commands.length} komend${
          commands.length === 1 ? "a" : commands.length < 5 ? "y" : ""
        }`,
        value: category,
      });
    }

    return new StringSelectMenuBuilder()
      .setCustomId("help_category_select")
      .setPlaceholder("Wybierz kategorię...")
      .addOptions(options);
  },

  async handleMenuInteraction(
    interaction,
    reply,
    commandsByCategory,
    homeEmbed
  ) {
    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60_000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "❌ Tylko autor komendy może używać tego menu.",
          ephemeral: true,
        });
      }

      const selectedCategory = i.values[0];

      if (selectedCategory === "home") {
        await i.update({ embeds: [homeEmbed] });
        return;
      }

      const categoryCommands = commandsByCategory.get(selectedCategory);
      const categoryEmbed = this.createCategoryEmbed(
        selectedCategory,
        categoryCommands
      );

      await i.update({ embeds: [categoryEmbed] });
    });

    collector.on("end", () => {
      const disabledRow = new ActionRowBuilder().addComponents(
        this.createSelectMenu(commandsByCategory).setDisabled(true)
      );
      interaction.editReply({ components: [disabledRow] }).catch(() => {});
    });
  },

  createCategoryEmbed(categoryName, commands) {
    const commandList = commands
      .map((cmd) => {
        let commandInfo = `</${cmd.name}:${cmd.id}> - ${cmd.description}`;

        if (cmd.cooldown) {
          commandInfo += ` ⏱️ ${cmd.cooldown}s`;
        }

        return commandInfo;
      })
      .join("\n");

    return new EmbedBuilder()
      .setTitle(`${categoryName}`)
      .setColor("#3498db")
      .setDescription(commandList || "Brak komend w tej kategorii.")
      .addFields({
        name: "📊 Statystyki",
        value: `**Liczba komend:** ${commands.length}`,
        inline: true,
      })
      .setFooter({ text: "Użyj /help <nazwa_komendy> aby zobaczyć szczegóły" })
      .setTimestamp();
  },

  async showCommandDetails(interaction, commandName) {
    const commandsByCategory = await this.getCommandsByCategory(interaction);
    let foundCommand = null;

    for (const [category, commands] of commandsByCategory) {
      foundCommand = commands.find(
        (cmd) => cmd.name.toLowerCase() === commandName.toLowerCase()
      );
      if (foundCommand) {
        foundCommand.category = category;
        break;
      }
    }

    if (!foundCommand) {
      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Komenda nie znaleziona")
        .setDescription(`Nie znaleziono komendy o nazwie \`${commandName}\`.`)
        .setColor("#e74c3c")
        .setTimestamp();

      return interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }

    const detailEmbed = new EmbedBuilder()
      .setTitle(`📋 Szczegóły komendy: ${foundCommand.name}`)
      .setDescription(foundCommand.description)
      .setColor("#9b59b6")
      .addFields(
        { name: "📁 Kategoria", value: foundCommand.category, inline: true },
        { name: "🆔 ID", value: foundCommand.id, inline: true },
        {
          name: "⏱️ Cooldown",
          value: foundCommand.cooldown ? `${foundCommand.cooldown}s` : "Brak",
          inline: true,
        }
      );

    if (foundCommand.usage) {
      detailEmbed.addFields({
        name: "📝 Użycie",
        value: `\`${foundCommand.usage}\``,
        inline: false,
      });
    }

    if (foundCommand.examples) {
      detailEmbed.addFields({
        name: "💡 Przykłady",
        value: foundCommand.examples.join("\n"),
        inline: false,
      });
    }

    if (foundCommand.permissions) {
      detailEmbed.addFields({
        name: "🔐 Wymagane uprawnienia",
        value: foundCommand.permissions.join(", "),
        inline: false,
      });
    }

    detailEmbed.setTimestamp();

    return interaction.reply({ embeds: [detailEmbed], ephemeral: true });
  },
};
