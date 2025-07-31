const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ButtonBuilder,
    ButtonStyle,
    PermissionFlagsBits,
} = require("discord.js");
const fs = require("fs");
const path = require("path");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("help")
        .setDescription("Interaktywne centrum pomocy z wyszukiwaniem i kontekstowymi sugestiami.")
        .addStringOption((option) =>
            option
                .setName("komenda")
                .setDescription("Nazwa komendy do wyświetlenia szczegółów")
                .setRequired(false)
        )
        .addStringOption((option) =>
            option
                .setName("kategoria")
                .setDescription("Wybierz kategorię komend do wyświetlenia")
                .setRequired(false)
                .addChoices(
                    {name: "🔧 Administracja", value: "admin"},
                    {name: "🛡️ Moderacja", value: "moderation"},
                    {name: "🔧 Narzędzia", value: "utility"},
                    {name: "🎮 Gry", value: "game"},
                    {name: "💰 Ekonomia", value: "economy"},
                    {name: "📊 Levelowanie", value: "leveling"},
                    {name: "🎫 Tickety", value: "tickets"},
                    {name: "👻 Phasmophobia", value: "phasmophobia"}
                )
        )
        .addStringOption((option) =>
            option
                .setName("wyszukaj")
                .setDescription("Wyszukaj komendy po nazwie lub opisie")
                .setRequired(false)
        ),

    async execute(interaction) {
        const specificCommand = interaction.options.getString("komenda");
        const specificCategory = interaction.options.getString("kategoria");
        const searchQuery = interaction.options.getString("wyszukaj");

        const commandsByCategory = await this.getCommandsByCategory(interaction);

        if (commandsByCategory.size === 0) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Błąd")
                .setDescription("Nie znaleziono żadnych komend.")
                .setColor("#e74c3c")
                .setTimestamp();

            return interaction.reply({embeds: [errorEmbed], ephemeral: true});
        }

        if (searchQuery) {
            return await this.handleSearch(interaction, commandsByCategory, searchQuery);
        }

        if (specificCommand) {
            return await this.showCommandDetails(interaction, specificCommand, commandsByCategory);
        }

        if (specificCategory) {
            return await this.showCategoryCommands(interaction, specificCategory, commandsByCategory);
        }

        const homeEmbed = this.createAdvancedHomeEmbed(commandsByCategory, interaction);
        const components = this.createMainMenuComponents(commandsByCategory);

        const reply = await interaction.reply({
            embeds: [homeEmbed],
            components: components,
            ephemeral: true,
            fetchReply: true,
        });

        await this.handleAdvancedMenuInteraction(
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

                            const commandData = command.data.toJSON();
                            const hasPermissions = this.extractPermissions(commandData);
                            const canUse = await this.canUserUseCommand(interaction, hasPermissions);

                            categoryCommands.push({
                                name: command.data.name,
                                description: command.data.description || "Brak opisu",
                                id: cachedCommand?.id || "0",
                                usage: command.usage || this.generateUsage(commandData),
                                examples: command.examples || null,
                                cooldown: command.cooldown || null,
                                permissions: command.permissions || hasPermissions,
                                options: commandData.options || [],
                                canUse: canUse,
                                category: folder,
                                tags: this.generateTags(commandData, folder),
                            });
                        }
                    } catch (error) {
                        console.error(`Błąd podczas ładowania komendy ${file}:`, error);
                    }
                }

                if (categoryCommands.length > 0) {
                    const categoryInfo = this.getCategoryInfo(folder);
                    commandsByCategory.set(categoryInfo.name, {
                        commands: categoryCommands,
                        info: categoryInfo,
                        folder: folder
                    });
                }
            }
        } catch (error) {
            console.error("Błąd podczas ładowania komend:", error);
        }

        return commandsByCategory;
    },

    getCategoryInfo(folder) {
        const categoryMap = {
            admin: {
                name: "🔧 Administracja",
                description: "Komendy do zarządzania serwerem i konfiguracją bota",
                emoji: "🔧",
                color: "#e67e22",
                requiredPermissions: ["Administrator", "ManageGuild"]
            },
            moderation: {
                name: "🛡️ Moderacja",
                description: "Narzędzia do moderacji użytkowników i treści",
                emoji: "🛡️",
                color: "#e74c3c",
                requiredPermissions: ["ModerateMembers", "BanMembers", "KickMembers"]
            },
            utility: {
                name: "🔧 Narzędzia",
                description: "Przydatne narzędzia i funkcje pomocnicze",
                emoji: "🔧",
                color: "#3498db",
                requiredPermissions: []
            },
            economy: {
                name: "💰 Ekonomia",
                description: "System ekonomiczny, polowania i zarządzanie zasobami",
                emoji: "💰",
                color: "#f1c40f",
                requiredPermissions: []
            },
            game: {
                name: "🎮 Gry",
                description: "Rozrywkowe gry i aktywności",
                emoji: "🎮",
                color: "#9b59b6",
                requiredPermissions: []
            },
            leveling: {
                name: "📊 Levelowanie",
                description: "System poziomów, osiągnięć i progresji",
                emoji: "📊",
                color: "#2ecc71",
                requiredPermissions: []
            },
            tickets: {
                name: "🎫 Tickety",
                description: "System wsparcia i zarządzania ticketami",
                emoji: "🎫",
                color: "#1abc9c",
                requiredPermissions: ["ManageChannels"]
            },
            phasmophobia: {
                name: "👻 Phasmophobia",
                description: "Narzędzia i informacje związane z grą Phasmophobia",
                emoji: "👻",
                color: "#34495e",
                requiredPermissions: []
            }
        };

        return categoryMap[folder] || {
            name: `📁 ${folder.charAt(0).toUpperCase() + folder.slice(1)}`,
            description: "Różne komendy i funkcje",
            emoji: "📁",
            color: "#95a5a6",
            requiredPermissions: []
        };
    },

    extractPermissions(commandData) {
        const permissions = [];

        if (commandData.default_member_permissions) {
            const perms = BigInt(commandData.default_member_permissions);

            if (perms & PermissionFlagsBits.Administrator) permissions.push("Administrator");
            if (perms & PermissionFlagsBits.ManageGuild) permissions.push("ManageGuild");
            if (perms & PermissionFlagsBits.ManageChannels) permissions.push("ManageChannels");
            if (perms & PermissionFlagsBits.ManageRoles) permissions.push("ManageRoles");
            if (perms & PermissionFlagsBits.BanMembers) permissions.push("BanMembers");
            if (perms & PermissionFlagsBits.KickMembers) permissions.push("KickMembers");
            if (perms & PermissionFlagsBits.ModerateMembers) permissions.push("ModerateMembers");
            if (perms & PermissionFlagsBits.ManageMessages) permissions.push("ManageMessages");
        }

        return permissions;
    },

    async canUserUseCommand(interaction, requiredPermissions) {
        if (!requiredPermissions || requiredPermissions.length === 0) {
            return true;
        }

        const member = interaction.member;
        if (!member) return false;

        for (const permission of requiredPermissions) {
            if (!member.permissions.has(PermissionFlagsBits[permission])) {
                return false;
            }
        }

        return true;
    },

    generateUsage(commandData) {
        let usage = `/${commandData.name}`;

        if (commandData.options && commandData.options.length > 0) {
            for (const option of commandData.options) {
                if (option.required) {
                    usage += ` <${option.name}>`;
                } else {
                    usage += ` [${option.name}]`;
                }
            }
        }

        return usage;
    },

    generateTags(commandData, category) {
        const tags = [category];

        const name = commandData.name.toLowerCase();
        if (name.includes('setup') || name.includes('config')) tags.push('konfiguracja');
        if (name.includes('admin')) tags.push('administracja');
        if (name.includes('mod') || name.includes('ban') || name.includes('kick')) tags.push('moderacja');
        if (name.includes('level') || name.includes('rank')) tags.push('poziomy');
        if (name.includes('ticket')) tags.push('wsparcie');
        if (name.includes('hunt') || name.includes('ghost')) tags.push('polowanie');

        return tags;
    },

    createAdvancedHomeEmbed(commandsByCategory, interaction) {
        const totalCommands = [...commandsByCategory.values()].reduce(
            (total, categoryData) => total + categoryData.commands.length,
            0
        );

        const availableCommands = [...commandsByCategory.values()].reduce(
            (total, categoryData) => total + categoryData.commands.filter(cmd => cmd.canUse).length,
            0
        );

        const userMention = interaction.user;
        const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator);
        const isModerator = interaction.member?.permissions.has(PermissionFlagsBits.ModerateMembers);

        let personalizedMessage = "Witaj w interaktywnym centrum pomocy! 🎉";
        if (isAdmin) {
            personalizedMessage += "\n🔧 **Jako administrator masz dostęp do wszystkich funkcji bota.**";
        } else if (isModerator) {
            personalizedMessage += "\n🛡️ **Jako moderator masz dostęp do narzędzi moderacyjnych.**";
        } else {
            personalizedMessage += "\n👋 **Odkryj wszystkie dostępne dla Ciebie komendy!**";
        }

        const embed = new EmbedBuilder()
            .setTitle("🌟 Centrum Pomocy DCS Bot")
            .setDescription(personalizedMessage)
            .setColor("#1abc9c")
            .addFields(
                {
                    name: "📊 Statystyki",
                    value: `**Wszystkich komend:** ${totalCommands}\n**Dostępnych dla Ciebie:** ${availableCommands}\n**Kategorii:** ${commandsByCategory.size}`,
                    inline: true,
                },
                {
                    name: "🚀 Szybki Start",
                    value: "• Wybierz kategorię z menu\n• Wyszukaj konkretną komendę\n• Przeglądaj sugerowane komendy",
                    inline: true,
                },
                {
                    name: "💡 Wskazówki",
                    value: "• `/help komenda:<nazwa>` - szczegóły komendy\n• `/help kategoria:<typ>` - komendy kategorii\n• `/help wyszukaj:<tekst>` - wyszukiwanie",
                    inline: false,
                }
            )
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .setFooter({
                text: `Żądanie od ${userMention.tag} • Menu aktywne przez 5 minut`,
                iconURL: userMention.displayAvatarURL()
            })
            .setTimestamp();

        const suggestions = this.getSuggestedCommands(commandsByCategory, interaction);
        if (suggestions.length > 0) {
            embed.addFields({
                name: "⭐ Sugerowane dla Ciebie",
                value: suggestions.slice(0, 5).map(cmd => `</${cmd.name}:${cmd.id}> - ${cmd.description}`).join('\n'),
                inline: false
            });
        }

        return embed;
    },

    getSuggestedCommands(commandsByCategory, interaction) {
        const suggestions = [];
        const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator);
        const isModerator = interaction.member?.permissions.has(PermissionFlagsBits.ModerateMembers);

        for (const [categoryName, categoryData] of commandsByCategory) {
            for (const command of categoryData.commands) {
                if (!command.canUse) continue;

                if (isAdmin && command.tags.includes('konfiguracja')) {
                    suggestions.push({...command, priority: 3});
                } else if (isModerator && command.tags.includes('moderacja')) {
                    suggestions.push({...command, priority: 2});
                } else if (command.category === 'economy' || command.category === 'game') {
                    suggestions.push({...command, priority: 1});
                }
            }
        }

        return suggestions.sort((a, b) => (b.priority || 0) - (a.priority || 0));
    },

    createMainMenuComponents(commandsByCategory) {
        const selectMenu = this.createAdvancedSelectMenu(commandsByCategory);
        const buttons = this.createNavigationButtons();

        return [
            new ActionRowBuilder().addComponents(selectMenu),
            new ActionRowBuilder().addComponents(...buttons)
        ];
    },

    createAdvancedSelectMenu(commandsByCategory) {
        const options = [
            {
                label: "🏠 Strona Główna",
                description: "Wróć do strony głównej centrum pomocy",
                value: "home",
                emoji: "🏠",
            },
        ];

        for (const [categoryName, categoryData] of commandsByCategory) {
            const availableCommands = categoryData.commands.filter(cmd => cmd.canUse).length;
            const totalCommands = categoryData.commands.length;

            options.push({
                label: categoryData.info.name,
                description: `${availableCommands}/${totalCommands} dostępnych komend`,
                value: `category_${categoryData.folder}`,
                emoji: categoryData.info.emoji,
            });
        }

        return new StringSelectMenuBuilder()
            .setCustomId("help_category_select")
            .setPlaceholder("🔍 Wybierz kategorię do przeglądania...")
            .addOptions(options.slice(0, 25));
    },

    createNavigationButtons() {
        return [
            new ButtonBuilder()
                .setCustomId("help_search")
                .setLabel("Wyszukaj")
                .setStyle(ButtonStyle.Primary)
                .setEmoji("🔍"),
            new ButtonBuilder()
                .setCustomId("help_favorites")
                .setLabel("Popularne")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("⭐"),
            new ButtonBuilder()
                .setCustomId("help_my_commands")
                .setLabel("Moje komendy")
                .setStyle(ButtonStyle.Secondary)
                .setEmoji("👤"),
            new ButtonBuilder()
                .setCustomId("help_quick_guide")
                .setLabel("Przewodnik")
                .setStyle(ButtonStyle.Success)
                .setEmoji("📖")
        ];
    },

    async handleAdvancedMenuInteraction(interaction, reply, commandsByCategory, homeEmbed) {
        const collector = reply.createMessageComponentCollector({
            time: 300_000,
        });

        collector.on("collect", async (i) => {
            if (i.user.id !== interaction.user.id) {
                return i.reply({
                    content: "❌ Tylko autor komendy może używać tego menu.",
                    ephemeral: true,
                });
            }

            try {
                if (i.isStringSelectMenu()) {
                    await this.handleSelectMenuInteraction(i, commandsByCategory, homeEmbed);
                } else if (i.isButton()) {
                    await this.handleButtonInteraction(i, commandsByCategory, homeEmbed);
                }
            } catch (error) {
                console.error("Błąd w obsłudze interakcji help:", error);
                await i.reply({
                    content: "❌ Wystąpił błąd podczas przetwarzania żądania.",
                    ephemeral: true
                }).catch(() => {
                });
            }
        });

        collector.on("end", () => {
            const disabledComponents = this.createMainMenuComponents(commandsByCategory);
            disabledComponents.forEach(row => {
                row.components.forEach(component => component.setDisabled(true));
            });

            interaction.editReply({components: disabledComponents}).catch(() => {
            });
        });
    },

    async handleSelectMenuInteraction(interaction, commandsByCategory, homeEmbed) {
        const selectedValue = interaction.values[0];

        if (selectedValue === "home") {
            const newHomeEmbed = this.createAdvancedHomeEmbed(commandsByCategory, interaction);
            const components = this.createMainMenuComponents(commandsByCategory);
            await interaction.update({embeds: [newHomeEmbed], components: components});
            return;
        }

        if (selectedValue.startsWith("category_")) {
            const categoryFolder = selectedValue.replace("category_", "");
            const categoryData = [...commandsByCategory.values()].find(data => data.folder === categoryFolder);

            if (categoryData) {
                const categoryEmbed = this.createAdvancedCategoryEmbed(categoryData, interaction);
                const backButton = this.createBackButton();
                await interaction.update({
                    embeds: [categoryEmbed],
                    components: [new ActionRowBuilder().addComponents(backButton)]
                });
            }
        }
    },

    async handleButtonInteraction(interaction, commandsByCategory, homeEmbed) {
        const customId = interaction.customId;

        switch (customId) {
            case "help_search":
                await this.showSearchInterface(interaction, commandsByCategory);
                break;
            case "help_favorites":
                await this.showPopularCommands(interaction, commandsByCategory);
                break;
            case "help_my_commands":
                await this.showUserCommands(interaction, commandsByCategory);
                break;
            case "help_quick_guide":
                await this.showQuickGuide(interaction);
                break;
            case "help_back":
                const newHomeEmbed = this.createAdvancedHomeEmbed(commandsByCategory, interaction);
                const components = this.createMainMenuComponents(commandsByCategory);
                await interaction.update({embeds: [newHomeEmbed], components: components});
                break;
        }
    },

    createBackButton() {
        return new ButtonBuilder()
            .setCustomId("help_back")
            .setLabel("Powrót")
            .setStyle(ButtonStyle.Secondary)
            .setEmoji("⬅️");
    },

    async handleSearch(interaction, commandsByCategory, searchQuery) {
        const allCommands = [];
        for (const [categoryName, categoryData] of commandsByCategory) {
            for (const command of categoryData.commands) {
                if (command.canUse) {
                    allCommands.push({...command, categoryName});
                }
            }
        }

        const results = this.searchCommands(allCommands, searchQuery);
        const embed = this.createSearchResultsEmbed(results, searchQuery, interaction);

        await interaction.reply({embeds: [embed], ephemeral: true});
    },

    searchCommands(commands, query) {
        const lowerQuery = query.toLowerCase();
        const results = [];

        for (const command of commands) {
            let score = 0;

            if (command.name.toLowerCase() === lowerQuery) {
                score += 100;
            } else if (command.name.toLowerCase().startsWith(lowerQuery)) {
                score += 50;
            } else if (command.name.toLowerCase().includes(lowerQuery)) {
                score += 25;
            }

            if (command.description.toLowerCase().includes(lowerQuery)) {
                score += 15;
            }

            if (command.tags.some(tag => tag.toLowerCase().includes(lowerQuery))) {
                score += 10;
            }

            if (score > 0) {
                results.push({...command, score});
            }
        }

        return results.sort((a, b) => b.score - a.score).slice(0, 10);
    },

    createSearchResultsEmbed(results, query, interaction) {
        const embed = new EmbedBuilder()
            .setTitle(`🔍 Wyniki wyszukiwania: "${query}"`)
            .setColor("#3498db")
            .setFooter({
                text: `Znaleziono ${results.length} wyników`,
                iconURL: interaction.user.displayAvatarURL()
            })
            .setTimestamp();

        if (results.length === 0) {
            embed.setDescription("❌ Nie znaleziono komend pasujących do zapytania.")
                .addFields({
                    name: "💡 Wskazówki",
                    value: "• Sprawdź pisownię\n• Użyj krótszych słów kluczowych\n• Spróbuj wyszukać po kategorii",
                    inline: false
                });
        } else {
            const commandList = results.map((cmd, index) => {
                const relevanceEmoji = cmd.score >= 50 ? "🎯" : cmd.score >= 25 ? "✅" : "📝";
                return `${relevanceEmoji} </${cmd.name}:${cmd.id}> - ${cmd.description}`;
            }).join('\n');

            embed.setDescription(commandList);

            if (results.length === 10) {
                embed.addFields({
                    name: "ℹ️ Informacja",
                    value: "Pokazano pierwsze 10 wyników. Sprecyzuj zapytanie aby zawęzić wyniki.",
                    inline: false
                });
            }
        }

        return embed;
    },

    async showCategoryCommands(interaction, categoryFolder, commandsByCategory) {
        const categoryData = [...commandsByCategory.values()].find(data => data.folder === categoryFolder);

        if (!categoryData) {
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Kategoria nie znaleziona")
                .setDescription(`Nie znaleziono kategorii "${categoryFolder}".`)
                .setColor("#e74c3c");

            return interaction.reply({embeds: [errorEmbed], ephemeral: true});
        }

        const embed = this.createAdvancedCategoryEmbed(categoryData, interaction);
        await interaction.reply({embeds: [embed], ephemeral: true});
    },

    createAdvancedCategoryEmbed(categoryData, interaction) {
        const availableCommands = categoryData.commands.filter(cmd => cmd.canUse);
        const restrictedCommands = categoryData.commands.filter(cmd => !cmd.canUse);

        const embed = new EmbedBuilder()
            .setTitle(`${categoryData.info.name}`)
            .setDescription(categoryData.info.description)
            .setColor(categoryData.info.color)
            .setTimestamp();

        if (availableCommands.length > 0) {
            const commandList = availableCommands.map(cmd => {
                let info = `</${cmd.name}:${cmd.id}> - ${cmd.description}`;
                if (cmd.cooldown) info += ` ⏱️ ${cmd.cooldown}s`;
                return info;
            }).join('\n');

            embed.addFields({
                name: `✅ Dostępne komendy (${availableCommands.length})`,
                value: commandList.length > 1024 ? commandList.substring(0, 1021) + "..." : commandList,
                inline: false
            });
        }

        if (restrictedCommands.length > 0) {
            const restrictedList = restrictedCommands.slice(0, 5).map(cmd =>
                `🔒 \`/${cmd.name}\` - ${cmd.description}`
            ).join('\n');

            embed.addFields({
                name: `🔒 Ograniczone komendy (${restrictedCommands.length})`,
                value: restrictedList + (restrictedCommands.length > 5 ? `\n*...i ${restrictedCommands.length - 5} więcej*` : ""),
                inline: false
            });
        }

        embed.addFields({
            name: "📊 Statystyki kategorii",
            value: `**Wszystkich komend:** ${categoryData.commands.length}\n**Dostępnych:** ${availableCommands.length}\n**Ograniczonych:** ${restrictedCommands.length}`,
            inline: true
        });

        if (categoryData.info.requiredPermissions.length > 0) {
            embed.addFields({
                name: "🔐 Wymagane uprawnienia",
                value: categoryData.info.requiredPermissions.map(perm => `\`${perm}\``).join(', '),
                inline: true
            });
        }

        return embed;
    },

    async showCommandDetails(interaction, commandName, commandsByCategory) {
        let foundCommand = null;
        let categoryData = null;

        for (const [categoryName, catData] of commandsByCategory) {
            foundCommand = catData.commands.find(
                (cmd) => cmd.name.toLowerCase() === commandName.toLowerCase()
            );
            if (foundCommand) {
                categoryData = catData;
                break;
            }
        }

        if (!foundCommand) {
            const suggestions = this.findSimilarCommands(commandsByCategory, commandName);
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Komenda nie znaleziona")
                .setDescription(`Nie znaleziono komendy o nazwie \`${commandName}\`.`)
                .setColor("#e74c3c")
                .setTimestamp();

            if (suggestions.length > 0) {
                errorEmbed.addFields({
                    name: "💡 Czy chodziło Ci o:",
                    value: suggestions.slice(0, 5).map(cmd => `</${cmd.name}:${cmd.id}> - ${cmd.description}`).join('\n'),
                    inline: false
                });
            }

            return interaction.reply({embeds: [errorEmbed], ephemeral: true});
        }

        const detailEmbed = this.createDetailedCommandEmbed(foundCommand, categoryData, interaction);
        const components = this.createCommandDetailComponents(foundCommand, categoryData);

        return interaction.reply({embeds: [detailEmbed], components: components, ephemeral: true});
    },

    findSimilarCommands(commandsByCategory, searchName) {
        const allCommands = [];
        for (const [categoryName, categoryData] of commandsByCategory) {
            allCommands.push(...categoryData.commands.filter(cmd => cmd.canUse));
        }

        return this.searchCommands(allCommands, searchName);
    },

    createDetailedCommandEmbed(command, categoryData, interaction) {
        const embed = new EmbedBuilder()
            .setTitle(`📋 ${command.name}`)
            .setDescription(command.description)
            .setColor(categoryData.info.color)
            .setTimestamp();

        embed.addFields(
            {name: "📁 Kategoria", value: categoryData.info.name, inline: true},
            {name: "🆔 ID", value: command.id, inline: true},
            {name: "⏱️ Cooldown", value: command.cooldown ? `${command.cooldown}s` : "Brak", inline: true}
        );

        if (command.usage) {
            embed.addFields({
                name: "📝 Składnia",
                value: `\`${command.usage}\``,
                inline: false,
            });
        }

        if (command.options && command.options.length > 0) {
            const optionsText = command.options.map(option => {
                const required = option.required ? "**[Wymagane]**" : "*[Opcjonalne]*";
                const type = this.getOptionTypeName(option.type);
                return `• **${option.name}** (${type}) ${required}\n  ${option.description}`;
            }).join('\n\n');

            embed.addFields({
                name: "⚙️ Parametry",
                value: optionsText.length > 1024 ? optionsText.substring(0, 1021) + "..." : optionsText,
                inline: false
            });
        }

        if (command.examples) {
            embed.addFields({
                name: "💡 Przykłady użycia",
                value: command.examples.map(ex => `\`${ex}\``).join('\n'),
                inline: false,
            });
        }

        if (command.permissions && command.permissions.length > 0) {
            const permissionStatus = command.canUse ? "✅ Masz uprawnienia" : "❌ Brak uprawnień";
            embed.addFields({
                name: "🔐 Wymagane uprawnienia",
                value: `${command.permissions.map(perm => `\`${perm}\``).join(', ')}\n${permissionStatus}`,
                inline: false,
            });
        }

        if (command.tags && command.tags.length > 0) {
            embed.addFields({
                name: "🏷️ Tagi",
                value: command.tags.map(tag => `\`${tag}\``).join(' '),
                inline: true
            });
        }

        const statusEmoji = command.canUse ? "✅" : "🔒";
        const statusText = command.canUse ? "Dostępna" : "Ograniczona";
        embed.addFields({
            name: "📊 Status",
            value: `${statusEmoji} ${statusText}`,
            inline: true
        });

        return embed;
    },

    getOptionTypeName(type) {
        const typeNames = {
            1: "Podkomenda",
            2: "Grupa podkomend",
            3: "Tekst",
            4: "Liczba całkowita",
            5: "Wartość logiczna",
            6: "Użytkownik",
            7: "Kanał",
            8: "Rola",
            9: "Wzmianka",
            10: "Liczba dziesiętna",
            11: "Załącznik"
        };
        return typeNames[type] || "Nieznany";
    },

    createCommandDetailComponents(command, categoryData) {
        const buttons = [
            new ButtonBuilder()
                .setCustomId(`help_category_${categoryData.folder}`)
                .setLabel(`Więcej z ${categoryData.info.name}`)
                .setStyle(ButtonStyle.Secondary)
                .setEmoji(categoryData.info.emoji)
        ];

        if (command.canUse) {
            buttons.unshift(
                new ButtonBuilder()
                    .setCustomId(`help_try_command_${command.name}`)
                    .setLabel("Wypróbuj komendę")
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji("🚀")
            );
        }

        return [new ActionRowBuilder().addComponents(...buttons)];
    },

    async showSearchInterface(interaction, commandsByCategory) {
        const embed = new EmbedBuilder()
            .setTitle("🔍 Wyszukiwanie komend")
            .setDescription("Użyj `/help wyszukaj:<zapytanie>` aby wyszukać komendy.")
            .setColor("#3498db")
            .addFields(
                {
                    name: "💡 Wskazówki wyszukiwania",
                    value: "• Wpisz nazwę komendy\n• Użyj słów kluczowych z opisu\n• Wyszukaj po kategorii (np. 'moderacja')\n• Użyj tagów (np. 'konfiguracja')",
                    inline: false
                },
                {
                    name: "🔥 Popularne wyszukiwania",
                    value: "`help`, `ban`, `hunt`, `profile`, `setup`, `ticket`",
                    inline: false
                }
            )
            .setTimestamp();

        const backButton = this.createBackButton();
        await interaction.update({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(backButton)]
        });
    },

    async showPopularCommands(interaction, commandsByCategory) {
        const popularCommands = this.getPopularCommands(commandsByCategory);

        const embed = new EmbedBuilder()
            .setTitle("⭐ Najpopularniejsze komendy")
            .setDescription("Najczęściej używane komendy na serwerze")
            .setColor("#f1c40f")
            .setTimestamp();

        if (popularCommands.length > 0) {
            const commandList = popularCommands.map((cmd, index) => {
                const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : "⭐";
                return `${medal} </${cmd.name}:${cmd.id}> - ${cmd.description}`;
            }).join('\n');

            embed.addFields({
                name: "🏆 Top komendy",
                value: commandList,
                inline: false
            });
        }

        const backButton = this.createBackButton();
        await interaction.update({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(backButton)]
        });
    },

    getPopularCommands(commandsByCategory) {
        const popularCommandNames = ['help', 'hunt', 'profile', 'daily', 'rank', 'shop', 'ping', 'ban', 'ticket-info'];
        const popularCommands = [];

        for (const cmdName of popularCommandNames) {
            for (const [categoryName, categoryData] of commandsByCategory) {
                const command = categoryData.commands.find(cmd => cmd.name === cmdName && cmd.canUse);
                if (command) {
                    popularCommands.push(command);
                    break;
                }
            }
        }

        return popularCommands.slice(0, 10);
    },

    async showUserCommands(interaction, commandsByCategory) {
        const userCommands = [];
        for (const [categoryName, categoryData] of commandsByCategory) {
            userCommands.push(...categoryData.commands.filter(cmd => cmd.canUse));
        }

        const embed = new EmbedBuilder()
            .setTitle("👤 Twoje dostępne komendy")
            .setDescription(`Masz dostęp do **${userCommands.length}** komend`)
            .setColor("#2ecc71")
            .setTimestamp();

        const categorizedCommands = new Map();
        for (const [categoryName, categoryData] of commandsByCategory) {
            const availableCommands = categoryData.commands.filter(cmd => cmd.canUse);
            if (availableCommands.length > 0) {
                categorizedCommands.set(categoryData.info.name, availableCommands.length);
            }
        }

        if (categorizedCommands.size > 0) {
            const categoryList = [...categorizedCommands.entries()]
                .map(([name, count]) => `${name}: **${count}** komend`)
                .join('\n');

            embed.addFields({
                name: "📊 Podział po kategoriach",
                value: categoryList,
                inline: false
            });
        }

        const isAdmin = interaction.member?.permissions.has(PermissionFlagsBits.Administrator);
        const isModerator = interaction.member?.permissions.has(PermissionFlagsBits.ModerateMembers);

        let roleInfo = "👤 **Zwykły użytkownik**";
        if (isAdmin) roleInfo = "👑 **Administrator** - pełny dostęp";
        else if (isModerator) roleInfo = "🛡️ **Moderator** - dostęp do moderacji";

        embed.addFields({
            name: "🎭 Twoja rola",
            value: roleInfo,
            inline: false
        });

        const backButton = this.createBackButton();
        await interaction.update({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(backButton)]
        });
    },

    async showQuickGuide(interaction) {
        const embed = new EmbedBuilder()
            .setTitle("📖 Szybki przewodnik po bocie")
            .setDescription("Poznaj podstawowe funkcje DCS Bot")
            .setColor("#9b59b6")
            .addFields(
                {
                    name: "🎮 Gry i rozrywka",
                    value: "• `/hunt` - Polowania na duchy\n• `/daily` - Codzienne wyzwania\n• `/profile` - Twój profil gracza",
                    inline: true
                },
                {
                    name: "💰 Ekonomia",
                    value: "• `/shop` - Sklep z przedmiotami\n• `/buy` - Kupowanie przedmiotów\n• `/leaderboard` - Ranking graczy",
                    inline: true
                },
                {
                    name: "📊 Progresja",
                    value: "• `/rank` - Twój poziom\n• `/achievements` - Osiągnięcia\n• `/prestige` - System prestiżu",
                    inline: true
                },
                {
                    name: "🎫 Wsparcie",
                    value: "• `/ticket-info` - Informacje o ticketach\n• Użyj reakcji 🎫 aby utworzyć ticket\n• Moderatorzy pomogą Ci w problemach",
                    inline: true
                },
                {
                    name: "👻 Phasmophobia",
                    value: "• `/ghost` - Informacje o duchach\n• `/item` - Przedmioty do polowań\n• `/map-info` - Mapy do gry",
                    inline: true
                },
                {
                    name: "🔧 Narzędzia",
                    value: "• `/ping` - Sprawdź połączenie\n• `/help` - To menu pomocy\n• `/verification-test` - Test weryfikacji",
                    inline: true
                }
            )
            .setFooter({text: "Użyj /help komenda:<nazwa> aby dowiedzieć się więcej o konkretnej komendzie"})
            .setTimestamp();

        const backButton = this.createBackButton();
        await interaction.update({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(backButton)]
        });
    },
};
