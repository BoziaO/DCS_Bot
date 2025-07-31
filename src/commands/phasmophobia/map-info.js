const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ComponentType,
} = require("discord.js");
const {maps} = require("../../data/phasmophobiaData");

const createMapListEmbed = () => {
    const embed = new EmbedBuilder()
        .setTitle("🗺️ **MAPY PHASMOPHOBII**")
        .setDescription(
            "Wybierz mapę z menu poniżej, aby zobaczyć szczegółowe informacje!\n\n" +
            "**Legenda trudności:**\n" +
            "🟢 **Easy** - Idealne dla początkujących\n" +
            "🟡 **Medium** - Dla doświadczonych graczy\n" +
            "🔴 **Hard** - Dla ekspertów\n" +
            "⚫ **Nightmare** - Tylko dla najodważniejszych!"
        )
        .setColor("#2F3136");

    const smallMaps = maps.filter((m) => m.size === "small");
    const mediumMaps = maps.filter((m) => m.size === "medium");
    const largeMaps = maps.filter((m) => m.size === "large");

    if (smallMaps.length > 0) {
        embed.addFields({
            name: "🏠 **MAŁE MAPY**",
            value: smallMaps
                .map((map) => {
                    const difficultyEmoji = map.difficulty === "easy" ? "🟢" : "🟡";
                    return `${difficultyEmoji} ${map.emoji} **${map.name}**`;
                })
                .join("\n"),
            inline: true,
        });
    }

    if (mediumMaps.length > 0) {
        embed.addFields({
            name: "🏢 **ŚREDNIE MAPY**",
            value: mediumMaps
                .map((map) => {
                    const difficultyEmoji = map.difficulty === "medium" ? "🟡" : "🔴";
                    return `${difficultyEmoji} ${map.emoji} **${map.name}**`;
                })
                .join("\n"),
            inline: true,
        });
    }

    if (largeMaps.length > 0) {
        embed.addFields({
            name: "🏭 **DUŻE MAPY**",
            value: largeMaps
                .map((map) => {
                    const difficultyEmoji = map.difficulty === "hard" ? "🔴" : "⚫";
                    return `${difficultyEmoji} ${map.emoji} **${map.name}**`;
                })
                .join("\n"),
            inline: true,
        });
    }

    embed.addFields({
        name: "📊 **STATYSTYKI**",
        value:
            `**Łącznie map:** ${maps.length}\n` +
            `**Małe:** ${smallMaps.length} | **Średnie:** ${mediumMaps.length} | **Duże:** ${largeMaps.length}`,
        inline: false,
    });

    return embed;
};

const createMapDetailEmbed = (map) => {
    const difficultyColors = {
        easy: "#00FF00",
        medium: "#FFFF00",
        hard: "#FF0000",
        nightmare: "#800080",
    };

    const difficultyEmojis = {
        easy: "🟢",
        medium: "🟡",
        hard: "🔴",
        nightmare: "⚫",
    };

    const embed = new EmbedBuilder()
        .setTitle(`${map.emoji} **${map.name.toUpperCase()}**`)
        .setDescription(`*${map.description}*`)
        .setColor(difficultyColors[map.difficulty]);

    embed.addFields({
        name: "📋 **PODSTAWOWE INFORMACJE**",
        value:
            `**Rozmiar:** ${map.size.charAt(0).toUpperCase() + map.size.slice(1)}\n` +
            `**Trudność:** ${difficultyEmojis[map.difficulty]} ${
                map.difficulty.charAt(0).toUpperCase() + map.difficulty.slice(1)
            }\n` +
            `**Nagroda bazowa:** $${map.baseReward}\n` +
            `**Utrata poczytalności:** ${map.sanityDrain}x`,
        inline: true,
    });

    if (map.rooms && map.rooms.length > 0) {
        const roomsText =
            map.rooms.length > 8
                ? map.rooms.slice(0, 8).join(", ") +
                `... (+${map.rooms.length - 8} więcej)`
                : map.rooms.join(", ");

        embed.addFields({
            name: `🏠 **POKOJE (${map.rooms.length})**`,
            value: roomsText,
            inline: false,
        });
    }

    if (map.specialFeatures && map.specialFeatures.length > 0) {
        embed.addFields({
            name: "⭐ **SPECJALNE CECHY**",
            value: map.specialFeatures.map((feature) => `• ${feature}`).join("\n"),
            inline: false,
        });
    }

    if (map.tips) {
        embed.addFields({
            name: "💡 **WSKAZÓWKI**",
            value: map.tips,
            inline: false,
        });
    }

    const riskLevel =
        map.sanityDrain <= 1
            ? "Niskie"
            : map.sanityDrain <= 2
                ? "Średnie"
                : map.sanityDrain <= 2.5
                    ? "Wysokie"
                    : "Ekstremalne";

    embed.addFields({
        name: "📊 **ANALIZA RYZYKA**",
        value:
            `**Poziom ryzyka:** ${riskLevel}\n` +
            `**Potencjalna nagroda:** $${map.baseReward} - $${Math.floor(
                map.baseReward * 1.5
            )}\n` +
            `**Zalecany poziom:** ${
                map.difficulty === "easy"
                    ? "Początkujący"
                    : map.difficulty === "medium"
                        ? "Średniozaawansowany"
                        : map.difficulty === "hard"
                            ? "Zaawansowany"
                            : "Ekspert"
            }`,
        inline: false,
    });

    embed.setFooter({
        text: `Mapa ${maps.indexOf(map) + 1} z ${
            maps.length
        } • Użyj menu aby zobaczyć inne mapy`,
    });

    return embed;
};

const createMapSelectMenu = () => {
    const options = maps.map((map, index) => {
        const difficultyEmoji = {
            easy: "🟢",
            medium: "🟡",
            hard: "🔴",
            nightmare: "⚫",
        }[map.difficulty];

        return {
            label: map.name,
            description: `${map.size.charAt(0).toUpperCase() + map.size.slice(1)} • ${
                map.difficulty
            } • $${map.baseReward}`,
            value: index.toString(),
            emoji: map.emoji,
        };
    });

    const chunkedOptions = [];
    for (let i = 0; i < options.length; i += 25) {
        chunkedOptions.push(options.slice(i, i + 25));
    }

    return chunkedOptions.map((chunk, chunkIndex) =>
        new StringSelectMenuBuilder()
            .setCustomId(`map_select_${chunkIndex}`)
            .setPlaceholder(
                `Wybierz mapę ${chunkIndex > 0 ? `(część ${chunkIndex + 1})` : ""}`
            )
            .addOptions(chunk)
    );
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("map")
        .setDescription("Wyświetla informacje o mapach Phasmophobii")
        .addSubcommand((subcommand) =>
            subcommand
                .setName("info")
                .setDescription("Szczegółowe informacje o mapach")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("list")
                .setDescription("Lista wszystkich dostępnych map")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("search")
                .setDescription("Wyszukaj mapę po nazwie")
                .addStringOption((option) =>
                    option
                        .setName("nazwa")
                        .setDescription("Nazwa mapy do wyszukania")
                        .setRequired(true)
                        .setAutocomplete(true)
                )
        ),

    async autocomplete(interaction) {
        const focusedValue = interaction.options.getFocused().toLowerCase();
        const filtered = maps
            .filter((map) => map.name.toLowerCase().includes(focusedValue))
            .slice(0, 25)
            .map((map) => ({
                name: `${map.emoji} ${map.name} (${map.difficulty})`,
                value: map.name,
            }));

        await interaction.respond(filtered);
    },

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            if (subcommand === "search") {
                const mapName = interaction.options.getString("nazwa");
                const map = maps.find(
                    (m) => m.name.toLowerCase() === mapName.toLowerCase()
                );

                if (!map) {
                    return interaction.reply({
                        content: `❌ Nie znaleziono mapy o nazwie: **${mapName}**`,
                        ephemeral: true,
                    });
                }

                const embed = createMapDetailEmbed(map);
                return interaction.reply({embeds: [embed]});
            }

            const embed = createMapListEmbed();
            const selectMenus = createMapSelectMenu();

            const rows = selectMenus.map((menu) =>
                new ActionRowBuilder().addComponents(menu)
            );

            const response = await interaction.reply({
                embeds: [embed],
                components: rows,
                ephemeral: false,
            });

            const collector = response.createMessageComponentCollector({
                componentType: ComponentType.StringSelect,
                time: 300000,
            });

            collector.on("collect", async (selectInteraction) => {
                if (selectInteraction.user.id !== interaction.user.id) {
                    return selectInteraction.reply({
                        content: "❌ Tylko osoba, która użyła komendy może wybierać mapy!",
                        ephemeral: true,
                    });
                }

                const mapIndex = parseInt(selectInteraction.values[0]);
                const selectedMap = maps[mapIndex];

                if (!selectedMap) {
                    return selectInteraction.reply({
                        content: "❌ Wystąpił błąd podczas ładowania mapy.",
                        ephemeral: true,
                    });
                }

                const detailEmbed = createMapDetailEmbed(selectedMap);

                await selectInteraction.update({
                    embeds: [detailEmbed],
                    components: rows,
                });
            });

            collector.on("end", async () => {
                try {
                    const disabledRows = rows.map((row) => {
                        const newRow = ActionRowBuilder.from(row);
                        newRow.components.forEach((component) =>
                            component.setDisabled(true)
                        );
                        return newRow;
                    });

                    await response.edit({
                        components: disabledRows,
                    });
                } catch (error) {
                }
            });
        } catch (error) {
            console.error("Map info command error:", error);

            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ **BŁĄD**")
                .setDescription("Wystąpił błąd podczas ładowania informacji o mapach.")
                .setColor("#FF0000");

            if (interaction.replied || interaction.deferred) {
                await interaction.editReply({embeds: [errorEmbed], components: []});
            } else {
                await interaction.reply({embeds: [errorEmbed], ephemeral: true});
            }
        }
    },
};
