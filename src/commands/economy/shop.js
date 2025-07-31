const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    StringSelectMenuBuilder,
    ComponentType,
} = require("discord.js");
const {equipment} = require("../../data/phasmophobiaData");
const ShopRole = require("../../models/ShopRole");
const seasonalEventManager = require("../../utils/events/seasonalEventManager");

const ITEMS_PER_PAGE = 4;

const createItemsEmbed = (items, page, categoryName) => {
    const totalPages = Math.ceil(items.length / ITEMS_PER_PAGE) || 1;
    const startIndex = page * ITEMS_PER_PAGE;
    const pageItems = items.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    const embed = new EmbedBuilder()
        .setTitle(`🏪 Sklep - ${categoryName}`)
        .setColor("#9b59b6")
        .setFooter({text: `Strona ${page + 1} z ${totalPages}`});

    if (pageItems.length === 0) {
        embed.setDescription(
            "W tej kategorii nie ma obecnie żadnych przedmiotów na sprzedaż."
        );
    } else {
        embed.setDescription(
            "Przeglądaj dostępne przedmioty. Użyj `/buy`, aby dokonać zakupu."
        );
        pageItems.forEach((item) => {
            embed.addFields({
                name: `${item.emoji || "📦"} ${
                    item.name
                } - $${item.price.toLocaleString()}`,
                value: `${item.description} (*Typ: ${item.type}*)`,
            });
        });
    }

    return embed;
};

const createPaginationButtons = (page, maxPage) => {
    return new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("prev_page")
            .setLabel("◀")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page === 0),
        new ButtonBuilder()
            .setCustomId("next_page")
            .setLabel("▶")
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(page >= maxPage),
        new ButtonBuilder()
            .setCustomId("back_to_categories")
            .setLabel("Powrót do kategorii")
            .setStyle(ButtonStyle.Primary)
    );
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName("shop")
        .setDescription(
            "Wyświetla interaktywny sklep z kategoriami i ekwipunkiem."
        ),

    async execute(interaction) {
        const createCategoryEmbed = () =>
            new EmbedBuilder()
                .setTitle("🏪 Witaj w Sklepie!")
                .setDescription("Wybierz kategorię, którą chcesz przejrzeć.")
                .setColor("#3498db");

        const createCategoryMenu = async (disabled = false) => {
            const activeEvent = await seasonalEventManager.getCurrentEvent(interaction.guild.id);
            const options = [
                {
                    label: "Ekwipunek Stały",
                    description: "Narzędzia, które kupujesz raz.",
                    value: "permanent",
                    emoji: "🛠️",
                },
                {
                    label: "Przedmioty Zużywalne",
                    description: "Przedmioty jednorazowego użytku.",
                    value: "consumable",
                    emoji: "📦",
                },
                {
                    label: "Role Specjalne",
                    description: "Kup unikalne role na serwerze.",
                    value: "roles",
                    emoji: "✨",
                },
            ];

            if (activeEvent) {
                const eventInfo = seasonalEventManager.eventDates[activeEvent.eventType];
                options.push({
                    label: `Świąteczne - ${eventInfo.name}`,
                    description: `Specjalne przedmioty na ${eventInfo.name}!`,
                    value: `seasonal_${activeEvent.eventType}`,
                    emoji: eventInfo.emoji,
                });
            }

            return new ActionRowBuilder().addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId("category_select")
                    .setPlaceholder("Wybierz kategorię...")
                    .setDisabled(disabled)
                    .addOptions(options)
            );
        };

        const reply = await interaction.reply({
            embeds: [createCategoryEmbed()],
            components: [await createCategoryMenu()],
        });

        const collector = reply.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: 300000,
        });

        let currentPage = 0;
        let categoryItems = [];
        let categoryName = "";

        collector.on("collect", async (i) => {
            try {
                await i.deferUpdate();

                if (i.isStringSelectMenu()) {
                    currentPage = 0;
                    const selectedCategory = i.values[0];
                    categoryName =
                        i.component.options.find((opt) => opt.value === selectedCategory)
                            ?.label || "Nieznana Kategoria";

                    if (selectedCategory === "roles") {
                        const shopRoles = await ShopRole.find({guildId: i.guild.id});
                        categoryItems = shopRoles
                            .map((shopRole) => {
                                const role = i.guild.roles.cache.get(shopRole.roleId);
                                return {
                                    name: role ? role.name : null,
                                    price: shopRole.price,
                                    description: `Kup, aby otrzymać rolę ${
                                        role ? role.name : "Nieznana Rola"
                                    }.`,
                                    type: "role",
                                    emoji: "✨",
                                };
                            })
                            .filter((item) => item.name);
                    } else if (selectedCategory === "permanent") {
                        categoryItems = equipment.filter(
                            (item) => item.type !== "consumable" && !item.seasonal
                        );
                    } else if (selectedCategory === "consumable") {
                        categoryItems = equipment.filter(
                            (item) => item.type === "consumable" && !item.seasonal
                        );
                    } else if (selectedCategory.startsWith("seasonal_")) {
                        const eventType = selectedCategory.replace("seasonal_", "");
                        const activeEvent = await seasonalEventManager.getCurrentEvent(i.guild.id);

                        if (activeEvent && activeEvent.eventType === eventType) {
                            categoryItems = equipment.filter(
                                (item) => item.seasonal && item.eventType === eventType
                            );
                        } else {
                            categoryItems = [];
                        }
                    } else {
                        categoryItems = equipment.filter(
                            (item) => item.type === "consumable" && !item.seasonal
                        );
                    }

                    const maxPage = Math.ceil(categoryItems.length / ITEMS_PER_PAGE) - 1;
                    const itemsEmbed = createItemsEmbed(
                        categoryItems,
                        currentPage,
                        categoryName
                    );
                    const paginationButtons = createPaginationButtons(
                        currentPage,
                        maxPage
                    );
                    await i.editReply({
                        embeds: [itemsEmbed],
                        components: [paginationButtons],
                    });
                } else if (i.isButton()) {
                    if (i.customId === "back_to_categories") {
                        await i.editReply({
                            embeds: [createCategoryEmbed()],
                            components: [await createCategoryMenu()],
                        });
                        categoryItems = [];
                        return;
                    }

                    if (categoryItems.length > 0) {
                        const maxPage =
                            Math.ceil(categoryItems.length / ITEMS_PER_PAGE) - 1;
                        if (i.customId === "prev_page") {
                            currentPage = Math.max(0, currentPage - 1);
                        } else if (i.customId === "next_page") {
                            currentPage = Math.min(maxPage, currentPage + 1);
                        }

                        const itemsEmbed = createItemsEmbed(
                            categoryItems,
                            currentPage,
                            categoryName
                        );
                        const paginationButtons = createPaginationButtons(
                            currentPage,
                            maxPage
                        );
                        await i.editReply({
                            embeds: [itemsEmbed],
                            components: [paginationButtons],
                        });
                    }
                }
            } catch (error) {
                console.error("Błąd w kolektorze sklepu:", error);
                await i
                    .followUp({
                        content: "Wystąpił błąd. Spróbuj ponownie.",
                        ephemeral: true,
                    })
                    .catch(() => {
                    });
            }
        });

        collector.on("end", async () => {
            try {
                const lastMessage = await interaction.fetchReply();
                const disabledComponents = lastMessage.components.map((row) => {
                    const newRow = ActionRowBuilder.from(row);
                    newRow.components.forEach((comp) => comp.setDisabled(true));
                    return newRow;
                });
                await interaction.editReply({components: disabledComponents});
            } catch (e) {
            }
        });
    },
};
