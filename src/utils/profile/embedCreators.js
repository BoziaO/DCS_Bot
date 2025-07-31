const {
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const {GHOST_TYPES, ACHIEVEMENTS, VIEW_NAMES} = require("./constants");
const {
    createProgressBar,
    createAdvancedProgressBar,
    getPerformanceRating,
    formatPlaytime,
    sanitizeFieldValue,
    getSanityStatus,
    calculateAdvancedStats,
} = require("./calculations");
const {
    getDetailedGhostStats,
    getGhostCategoryStats,
} = require("./ghostStats");

const createNavigationRow = (currentView) => {
    const buttons = [
        {
            id: "main",
            label: "Profil",
            emoji: "👤",
            description: "Główny widok profilu",
        },
        {
            id: "stats",
            label: "Analiza",
            emoji: "📊",
            description: "Szczegółowe statystyki",
        },
        {
            id: "achievements",
            label: "Osiągnięcia",
            emoji: "🏆",
            description: "Kolekcja nagród",
        },
        {
            id: "inventory",
            label: "Arsenał",
            emoji: "🎒",
            description: "Ekwipunek łowcy",
        },
    ];

    return new ActionRowBuilder().addComponents(
        buttons.map((button) => {
            const isActive = currentView === button.id;
            return new ButtonBuilder()
                .setCustomId(button.id)
                .setLabel(button.label)
                .setStyle(isActive ? ButtonStyle.Primary : ButtonStyle.Secondary)
                .setEmoji(button.emoji);
        })
    );
};

const createMainEmbed = (
    targetUser,
    userProfile,
    currentRank,
    nextRank,
    sanityStatus,
    winRate,
    unlockedAchievements
) => {
    const sanityBar = createAdvancedProgressBar(userProfile.sanity || 0, 100, 18);
    const rankProgress = nextRank
        ? createProgressBar(
            Math.max(0, userProfile.totalHunts - currentRank.minHunts),
            nextRank.minHunts - currentRank.minHunts,
            16,
            "modern"
        )
        : "▓".repeat(16);

    const performance = getPerformanceRating(userProfile);
    const totalEarnings = userProfile.totalEarnings || 0;
    const playtimeHours = Math.floor((userProfile.playtime || 0) / 60);

    const avgEarningsPerHunt =
        userProfile.totalHunts > 0
            ? Math.round(totalEarnings / userProfile.totalHunts)
            : 0;
    const survivalRate =
        userProfile.totalHunts > 0
            ? (
                ((userProfile.totalHunts - (userProfile.deaths || 0)) /
                    userProfile.totalHunts) *
                100
            ).toFixed(1)
            : "100.0";

    return new EmbedBuilder()
        .setTitle(
            `${currentRank.icon} ${targetUser.displayName || targetUser.username}`
        )
        .setColor(currentRank.color)
        .setThumbnail(targetUser.displayAvatarURL({dynamic: true, size: 256}))
        .setDescription(
            `╭─────────────────────────────────────╮\n` +
            `│ **${performance.ratingEmoji} ${performance.ratingText} Hunter** │ **${currentRank.name}** │\n` +
            `│ ${userProfile.totalHunts || 0} polowań • ${
                unlockedAchievements.length
            }/${Object.keys(ACHIEVEMENTS).length} osiągnięć │\n` +
            `╰─────────────────────────────────────╯`
        )
        .addFields([
            {
                name: "💎 **Status Finansowy**",
                value:
                    `┌ **Saldo:** $${(userProfile.balance || 0).toLocaleString()}\n` +
                    `├ **Łączne zarobki:** $${totalEarnings.toLocaleString()}\n` +
                    `└ **Średnio/polowanie:** $${avgEarningsPerHunt.toLocaleString()}`,
                inline: true,
            },
            {
                name: "🎯 **Wydajność Polowań**",
                value:
                    `┌ **Skuteczność:** ${winRate}%\n` +
                    `├ **Sukcesy:** ${userProfile.successfulHunts || 0}/${
                        userProfile.totalHunts || 0
                    }\n` +
                    `└ **Przeżywalność:** ${survivalRate}%`,
                inline: true,
            },
            {
                name: "🔥 **Aktualna Forma**",
                value:
                    `┌ **Passa:** ${userProfile.huntStreak || 0} sukcesów\n` +
                    `├ **Rekord:** ${userProfile.maxStreak || 0} z rzędu\n` +
                    `└ **Koszmar:** ${userProfile.nightmareHunts || 0} polowań`,
                inline: true,
            },
            {
                name: `${sanityStatus.emoji} **Stan Psychiczny**`,
                value:
                    `**${userProfile.sanity || 0}%** - *${sanityStatus.status}*\n` +
                    `${sanityBar}\n` +
                    `*Najniższa: ${userProfile.minSanity || 100}% • Tabletki: ${
                        userProfile.pillsUsed || 0
                    }*`,
                inline: false,
            },
            {
                name: `${currentRank.icon} **Postęp Rangi**`,
                value: nextRank
                    ? `**${nextRank.name}** - ${userProfile.totalHunts || 0}/${
                        nextRank.minHunts
                    }\n` +
                    `\`${rankProgress}\`\n` +
                    `*${
                        nextRank.minHunts - (userProfile.totalHunts || 0)
                    } polowań do awansu*`
                    : `\`${rankProgress}\`\n` + `🏆 **MAKSYMALNY POZIOM OSIĄGNIĘTY**`,
                inline: false,
            },
            {
                name: "📊 **Statystyki Ogólne**",
                value:
                    `┌ **Czas gry:** ${formatPlaytime(userProfile.playtime || 0)}\n` +
                    `├ **Duchy spotkane:** ${
                        Object.keys(userProfile.ghostEncounters || {}).length
                    }/24\n` +
                    `└ **Zespołowe:** ${userProfile.teamHunts || 0} polowań`,
                inline: true,
            },
            {
                name: "🏆 **Osiągnięcia**",
                value:
                    `┌ **Odblokowane:** ${unlockedAchievements.length}/${
                        Object.keys(ACHIEVEMENTS).length
                    }\n` +
                    `├ **Postęp:** ${(
                        (unlockedAchievements.length / Object.keys(ACHIEVEMENTS).length) *
                        100
                    ).toFixed(1)}%\n` +
                    `└ **Nagrody:** $${unlockedAchievements
                        .reduce((sum, a) => sum + a.reward, 0)
                        .toLocaleString()}`,
                inline: true,
            },
            {
                name: "📅 **Aktywność**",
                value:
                    `┌ **Ostatnie polowanie:** ${
                        userProfile.lastHunt
                            ? `<t:${Math.floor(userProfile.lastHunt.getTime() / 1000)}:R>`
                            : "Nigdy"
                    }\n` +
                    `├ **Pierwsze polowanie:** ${
                        userProfile.firstHunt
                            ? `<t:${Math.floor(userProfile.firstHunt.getTime() / 1000)}:d>`
                            : "Brak danych"
                    }\n` +
                    `└ **Ostatnia aktywność:** <t:${Math.floor(Date.now() / 1000)}:R>`,
                inline: true,
            },
        ])
        .setFooter({
            text: `🎖️ Rating: ${performance.rating}/100 • 🆔 ${targetUser.id} • 🕐 Aktualizacja`,
            iconURL: targetUser.displayAvatarURL({dynamic: true, size: 32}),
        })
        .setTimestamp();
};

const createStatsEmbed = (targetUser, userProfile, currentRank) => {
    const ghostStats = getDetailedGhostStats(userProfile);
    const ghostCategories = getGhostCategoryStats(userProfile);
    const advancedStats = calculateAdvancedStats(userProfile);
    const performance = getPerformanceRating(userProfile);
    const favoriteEquipment = userProfile.favoriteEquipment?.slice(0, 5) || [];

    const winRateBar = createAdvancedProgressBar(
        parseFloat(advancedStats.winRate),
        100,
        12
    );
    const efficiencyBar = createAdvancedProgressBar(
        parseFloat(advancedStats.efficiency),
        100,
        12
    );
    const survivalBar = createAdvancedProgressBar(
        parseFloat(advancedStats.survivalRate),
        100,
        12
    );

    const categoryStatsText = Object.entries(ghostCategories)
        .map(([category, stats]) => {
            const progressBar = createProgressBar(
                stats.encountered,
                stats.total,
                8,
                "modern"
            );
            const completionEmoji =
                stats.percentage == 100
                    ? "✅"
                    : stats.percentage >= 75
                        ? "🟡"
                        : stats.percentage >= 50
                            ? "�"
                            : "🔴";
            return `${completionEmoji} **${category}**: ${stats.encountered}/${stats.total} (${stats.percentage}%)\n\`${progressBar}\` *${stats.totalEncounters} spotkań*`;
        })
        .join("\n\n");

    const fields = [
        {
            name: "🎯 **Statystyki Polowań**",
            value: sanitizeFieldValue(
                `╭─ **Łączne polowania:** ${userProfile.totalHunts || 0}\n` +
                `├─ **Sukcesy:** ${userProfile.successfulHunts || 0} 🏆\n` +
                `├─ **Porażki:** ${Math.max(
                    0,
                    (userProfile.totalHunts || 0) - (userProfile.successfulHunts || 0)
                )} ❌\n` +
                `├─ **Najdłuższa passa:** ${userProfile.maxStreak || 0} 🔥\n` +
                `├─ **Perfekcyjne polowania:** ${
                    userProfile.perfectHunts || 0
                } ⭐\n` +
                `├─ **Polowania Koszmar:** ${userProfile.nightmareHunts || 0} 😈\n` +
                `╰─ **Polowania zespołowe:** ${userProfile.teamHunts || 0} 👥`
            ),
            inline: true,
        },
        {
            name: "📈 **Wskaźniki Wydajności**",
            value: sanitizeFieldValue(
                `**🎯 Skuteczność**\n${winRateBar}\n\n` +
                `**⚡ Efektywność**\n${efficiencyBar}\n\n` +
                `**🛡️ Przeżywalność**\n${survivalBar}\n\n` +
                `**⏱️ Polowania/godz:** ${advancedStats.huntsPerHour}`
            ),
            inline: true,
        },
        {
            name: "🧠 **Statystyki Psychiczne**",
            value: sanitizeFieldValue(
                `╭─ **Aktualna:** ${userProfile.sanity || 0}% ${
                    getSanityStatus(userProfile.sanity).emoji
                }\n` +
                `├─ **Najwyższa w polowaniu:** ${
                    userProfile.maxSanityHunt || 0
                }% 🧠\n` +
                `├─ **Najniższa:** ${userProfile.minSanity || 100}% 😱\n` +
                `├─ **Średnia utrata:** ${userProfile.avgSanityLoss || 0}% 📉\n` +
                `├─ **Użyte tabletki:** ${userProfile.pillsUsed || 0} 💊\n` +
                `├─ **Śmierci:** ${userProfile.deaths || 0} ☠️\n` +
                `╰─ **Ożywienia:** ${userProfile.revivals || 0} ❤️‍🩹`
            ),
            inline: false,
        },
        {
            name: "💰 **Statystyki Ekonomiczne**",
            value: sanitizeFieldValue(
                `╭─ **Obecny balans:** $${(
                    userProfile.balance || 0
                ).toLocaleString()} 💎\n` +
                `├─ **Łączne zarobki:** $${(
                    userProfile.totalEarnings || 0
                ).toLocaleString()} 📈\n` +
                `├─ **Wydane pieniądze:** $${(
                    userProfile.moneySpent || 0
                ).toLocaleString()} 💸\n` +
                `├─ **Rekord za polowanie:** $${
                    userProfile.maxEarningsPerHunt || 0
                } 🏆\n` +
                `├─ **Średnio/polowanie:** $${advancedStats.avgEarningsPerHunt} ⚖️\n` +
                `╰─ **Zarobki/godz:** $${advancedStats.earningsPerHour}/h ⏰`
            ),
            inline: true,
        },
        {
            name: "⏱️ **Statystyki Czasowe**",
            value: sanitizeFieldValue(
                `╭─ **Całkowity czas gry:** ${formatPlaytime(
                    userProfile.playtime || 0
                )} 🕐\n` +
                `├─ **Średnio/polowanie:** ${advancedStats.avgPlaytimePerHunt}min ⏱️\n` +
                `├─ **Pierwsze polowanie:** ${
                    userProfile.firstHunt
                        ? `<t:${Math.floor(userProfile.firstHunt.getTime() / 1000)}:d>`
                        : "Brak danych"
                } 🎯\n` +
                `├─ **Najszybsze:** ${
                    userProfile.bestHuntTime
                        ? `${userProfile.bestHuntTime}min`
                        : "Brak danych"
                } ⚡\n` +
                `╰─ **Najdłuższe:** ${
                    userProfile.worstHuntTime
                        ? `${userProfile.worstHuntTime}min`
                        : "Brak danych"
                } 🐌`
            ),
            inline: true,
        },
        {
            name: `👻 **Encyklopedia Duchów** (${ghostStats.totalTypes}/24 odkrytych)`,
            value: sanitizeFieldValue(
                ghostStats.text +
                (ghostStats.mostCommon
                    ? `\n\n🏆 **Najczęstszy:** ${
                        GHOST_TYPES[ghostStats.mostCommon.name] || "👻"
                    } **${ghostStats.mostCommon.name}** (${
                        ghostStats.mostCommon.count
                    }x)`
                    : "") +
                (ghostStats.rarest && ghostStats.totalTypes > 1
                    ? `\n🔍 **Najrzadszy:** ${
                        GHOST_TYPES[ghostStats.rarest.name] || "👻"
                    } **${ghostStats.rarest.name}** (${ghostStats.rarest.count}x)`
                    : "") +
                `\n\n📊 **Łączne spotkania:** ${
                    ghostStats.totalEncounters
                } | **Postęp:** ${((ghostStats.totalTypes / 24) * 100).toFixed(1)}%`
            ),
            inline: false,
        },
        {
            name: "📋 **Kategorie Duchów - Postęp Odkryć**",
            value: sanitizeFieldValue(categoryStatsText),
            inline: false,
        },
        {
            name: "🔧 **Ulubiony Sprzęt - Top 5**",
            value: sanitizeFieldValue(
                favoriteEquipment.length > 0
                    ? favoriteEquipment
                        .map((item, index) => {
                            const medal =
                                index === 0
                                    ? "🥇"
                                    : index === 1
                                        ? "🥈"
                                        : index === 2
                                            ? "🥉"
                                            : index === 3
                                                ? "🏅"
                                                : "🔹";
                            return `${medal} **${item.name}** - *${item.uses} użyć*`;
                        })
                        .join("\n")
                    : "🚫 *Brak danych o ulubionym sprzęcie*"
            ),
            inline: true,
        },
        {
            name: "🎲 **Dodatkowe Statystyki**",
            value: sanitizeFieldValue(
                `╭─ **Przedmioty użyte:** ${userProfile.itemsUsed || 0} 🛠️\n` +
                `├─ **Dowody znalezione:** ${userProfile.evidenceFound || 0} 🔍\n` +
                `├─ **Zdjęcia zrobione:** ${userProfile.photosTaken || 0} 📸\n` +
                `├─ **Duchy wypędzone:** ${userProfile.ghostsExorcised || 0} ✨\n` +
                `├─ **Przeklęte obiekty:** ${
                    userProfile.cursedObjectsUsed || 0
                } 🔮\n` +
                `╰─ **Najszybsza ID:** ${
                    userProfile.fastestId ? `${userProfile.fastestId}s` : "Brak"
                } ⚡`
            ),
            inline: true,
        },
        {
            name: `${performance.ratingEmoji} **Ocena Wydajności - System Rankingowy**`,
            value: sanitizeFieldValue(
                `🎖️ **Rating:** ${performance.rating}/100 (**${performance.ratingText}**)\n` +
                `${createAdvancedProgressBar(performance.rating, 100, 16)}\n\n` +
                `📈 **Status:** ${
                    performance.rating >= 85
                        ? "🏆 **MAKSYMALNY POZIOM OSIĄGNIĘTY!**"
                        : "⬆️ *Kontynuuj polowania aby awansować*"
                }\n` +
                `🎯 **Następny cel:** ${
                    performance.rating >= 85
                        ? "Utrzymaj poziom legendy!"
                        : `${85 - performance.rating} punktów do Legendy`
                }`
            ),
            inline: false,
        },
    ];

    return new EmbedBuilder()
        .setTitle(
            `📊 ${targetUser.displayName || targetUser.username} - Analiza Wydajności`
        )
        .setColor("#2c3e50")
        .setThumbnail(targetUser.displayAvatarURL({dynamic: true, size: 256}))
        .setDescription(
            `╔══════════════════════════════════════╗\n` +
            `║ ${performance.ratingEmoji} **${performance.ratingText} Hunter** • ${currentRank.icon} **${currentRank.name}** ║\n` +
            `║ 👻 Duchy: **${ghostStats.totalTypes}/24** • 🎯 Polowania: **${
                userProfile.totalHunts || 0
            }** ║\n` +
            `╚══════════════════════════════════════╝`
        )
        .addFields(fields)
        .setFooter({
            text: `🎖️ Rating: ${performance.rating}/100 • 📊 Szczegółowa analiza • 🕐 Ostatnia aktualizacja`,
            iconURL: targetUser.displayAvatarURL({dynamic: true, size: 32}),
        })
        .setTimestamp();
};

const createAchievementsEmbed = (
    targetUser,
    unlockedAchievements,
    lockedAchievements
) => {
    const unlockedList =
        unlockedAchievements.length > 0
            ? unlockedAchievements
                .map(
                    (a) =>
                        `${a.icon} **${a.name}**\n` +
                        `┌─ *${a.description}*\n` +
                        `└─ 💰 **Nagroda:** $${a.reward.toLocaleString()}`
                )
                .join("\n\n")
            : "🚫 *Brak odblokowanych osiągnięć - rozpocznij polowania!*";

    const lockedList = lockedAchievements
        .slice(0, 6)
        .map(
            (a) =>
                `🔒 **${a.name}**\n` +
                `┌─ *${a.description}*\n` +
                `└─ 💎 **Nagroda:** $${a.reward.toLocaleString()}`
        )
        .join("\n\n");

    const totalRewards = unlockedAchievements.reduce(
        (sum, a) => sum + a.reward,
        0
    );
    const totalPossibleRewards = Object.values(ACHIEVEMENTS).reduce(
        (sum, a) => sum + a.reward,
        0
    );
    const progressPercentage = (
        (unlockedAchievements.length / Object.keys(ACHIEVEMENTS).length) *
        100
    ).toFixed(1);
    const progressBar = createAdvancedProgressBar(
        unlockedAchievements.length,
        Object.keys(ACHIEVEMENTS).length,
        18
    );

    const fields = [
        {
            name: `✅ **Odblokowane Osiągnięcia** (${unlockedAchievements.length}/${
                Object.keys(ACHIEVEMENTS).length
            })`,
            value: sanitizeFieldValue(unlockedList, 900),
            inline: false,
        },
        {
            name: `🎯 **Następne Cele** (${Math.min(
                6,
                lockedAchievements.length
            )} z ${lockedAchievements.length})`,
            value: sanitizeFieldValue(
                lockedList.length > 0
                    ? lockedList
                    : "🎉 **Wszystkie osiągnięcia odblokowane!**\n*Gratulacje, jesteś prawdziwym mistrzem!*"
            ),
            inline: false,
        },
        {
            name: "📈 **Postęp Osiągnięć**",
            value:
                `${progressBar}\n\n` +
                `╭─ **Ukończone:** ${unlockedAchievements.length}/${
                    Object.keys(ACHIEVEMENTS).length
                } (${progressPercentage}%)\n` +
                `├─ **Pozostałe:** ${lockedAchievements.length} osiągnięć\n` +
                `├─ **Zdobyte nagrody:** $${totalRewards.toLocaleString()}\n` +
                `╰─ **Możliwe nagrody:** $${(
                    totalPossibleRewards - totalRewards
                ).toLocaleString()}`,
            inline: false,
        },
    ];

    return new EmbedBuilder()
        .setTitle(
            `🏆 ${targetUser.displayName || targetUser.username} - Kolekcja Osiągnięć`
        )
        .setColor("#f39c12")
        .setThumbnail(targetUser.displayAvatarURL({dynamic: true, size: 256}))
        .setDescription(
            `╔═══════════════════════════════════════╗\n` +
            `║ 📊 **Postęp:** ${progressPercentage}% • 💰 **Nagrody:** $${totalRewards.toLocaleString()} ║\n` +
            `║ 🎖️ **Status:** ${
                progressPercentage == 100
                    ? "Mistrz Osiągnięć"
                    : progressPercentage >= 75
                        ? "Zaawansowany Kolekcjoner"
                        : progressPercentage >= 50
                            ? "Aktywny Łowca"
                            : "Początkujący"
            } ║\n` +
            `╚═══════════════════════════════════════╝`
        )
        .addFields(fields)
        .setFooter({
            text: `💎 Łączna wartość nagród: $${totalRewards.toLocaleString()}/${totalPossibleRewards.toLocaleString()} • 🏆 Kolekcja osiągnięć`,
            iconURL: targetUser.displayAvatarURL({dynamic: true, size: 32}),
        })
        .setTimestamp();
};

const createInventoryEmbed = (targetUser, userProfile) => {
    const {equipment} = require("../../data/phasmophobiaData");

    let inventoryItems = [];

    if (!userProfile.inventory) {
        inventoryItems = [];
    } else if (Array.isArray(userProfile.inventory)) {
        inventoryItems = userProfile.inventory;
    } else if (userProfile.inventory instanceof Map) {
        inventoryItems = Array.from(userProfile.inventory.entries()).map(
            ([name, quantity]) => ({
                name,
                quantity,
            })
        );
    } else if (typeof userProfile.inventory === "object") {
        inventoryItems = Object.entries(userProfile.inventory).map(
            ([name, quantity]) => ({
                name,
                quantity,
            })
        );
    }

    const detailedInventory = inventoryItems.map((item) => {
        const equipmentData = equipment.find((eq) => eq.name === item.name) || {};
        return {
            ...item,
            price: equipmentData.price || 0,
            category: equipmentData.category || "Inne",
        };
    });

    const totalItems = inventoryItems.reduce(
        (sum, item) => sum + (item.quantity || 1),
        0
    );
    const totalValue = detailedInventory.reduce(
        (sum, item) => sum + item.price * (item.quantity || 1),
        0
    );

    const evidenceItems = detailedInventory.filter((item) =>
        [
            "EMF Reader",
            "Spirit Box",
            "UV Light",
            "Thermometer",
            "Video Camera",
            "Photo Camera",
        ].includes(item.name)
    );
    const protectionItems = detailedInventory.filter((item) =>
        ["Crucifix", "Smudge Sticks", "Salt", "Lighter"].includes(item.name)
    );
    const consumableItems = detailedInventory.filter((item) =>
        ["Sanity Pills", "Flashlight Battery", "Candle"].includes(item.name)
    );
    const toolItems = detailedInventory.filter(
        (item) =>
            !evidenceItems.includes(item) &&
            !protectionItems.includes(item) &&
            !consumableItems.includes(item)
    );

    const equipmentList =
        detailedInventory.length > 0
            ? detailedInventory
                .sort(
                    (a, b) => b.price * (b.quantity || 1) - a.price * (a.quantity || 1)
                )
                .map((item) => {
                    const value = item.price * (item.quantity || 1);
                    const rarity =
                        item.price >= 1000
                            ? "💎"
                            : item.price >= 500
                                ? "🟡"
                                : item.price >= 200
                                    ? "🟠"
                                    : "⚪";
                    return `${rarity} **${item.name}** x${
                        item.quantity || 1
                    } - *$${value.toLocaleString()}*`;
                })
                .join("\n")
            : "🚫 *Ekwipunek jest pusty - odwiedź sklep!*";

    const findMostValuable = () => {
        if (detailedInventory.length === 0) return "Brak";
        return detailedInventory.reduce((max, item) =>
            item.price > (max.price || 0) ? item : max
        ).name;
    };

    const fields = [
        {
            name: "📦 **Przegląd Arsenału**",
            value: sanitizeFieldValue(
                `╭─ **Całkowita liczba:** ${totalItems} przedmiotów 📊\n` +
                `├─ **Unikalne typy:** ${detailedInventory.length} różnych 🎯\n` +
                `├─ **Szacowana wartość:** $${totalValue.toLocaleString()} 💰\n` +
                `├─ **Najcenniejszy:** ${findMostValuable()} 💎\n` +
                `╰─ **Wykorzystanie:** ${((totalItems / 100) * 100).toFixed(
                    1
                )}% pojemności 📈`
            ),
            inline: false,
        },
        {
            name: "🎒 **Kompletny Ekwipunek**",
            value: sanitizeFieldValue(equipmentList, 900),
            inline: false,
        },
        {
            name: "🔍 **Sprzęt Detektywistyczny**",
            value: sanitizeFieldValue(
                evidenceItems.length > 0
                    ? evidenceItems
                        .map((item) => `🔹 **${item.name}** - *${item.quantity || 0}x*`)
                        .join("\n")
                    : "🚫 *Brak sprzętu do dowodów*"
            ),
            inline: true,
        },
        {
            name: "🛡️ **Ochrona Osobista**",
            value: sanitizeFieldValue(
                protectionItems.length > 0
                    ? protectionItems
                        .map((item) => `🔹 **${item.name}** - *${item.quantity || 0}x*`)
                        .join("\n")
                    : "🚫 *Brak sprzętu ochronnego*"
            ),
            inline: true,
        },
        {
            name: "💊 **Przedmioty Jednorazowe**",
            value: sanitizeFieldValue(
                consumableItems.length > 0
                    ? consumableItems
                        .map((item) => `🔹 **${item.name}** - *${item.quantity || 0}x*`)
                        .join("\n")
                    : "🚫 *Brak przedmiotów jednorazowych*"
            ),
            inline: true,
        },
        {
            name: "🛠️ **Narzędzia Specjalne**",
            value: sanitizeFieldValue(
                toolItems.length > 0
                    ? toolItems
                        .map((item) => `🔹 **${item.name}** - *${item.quantity || 0}x*`)
                        .join("\n")
                    : "🚫 *Brak specjalnych narzędzi*"
            ),
            inline: true,
        },
        {
            name: "📊 **Najczęściej Używane - Top 3**",
            value: sanitizeFieldValue(
                userProfile.favoriteEquipment
                    ?.sort((a, b) => b.uses - a.uses)
                    .slice(0, 3)
                    .map((item, index) => {
                        const medal = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
                        return `${medal} **${item.name}** - *${item.uses} użyć*`;
                    })
                    .join("\n") || "🚫 *Brak danych o użyciu sprzętu*"
            ),
            inline: true,
        },
        {
            name: "💡 **Profesjonalne Wskazówki**",
            value:
                `🛒 **Zakupy:** Używaj \`/shop\` przed każdym polowaniem\n` +
                `⚡ **Strategia:** Planuj ekwipunek według typu ducha\n` +
                `💎 **Jakość:** Rzadsze przedmioty = większe bonusy\n` +
                `🔧 **Konserwacja:** Dbaj o kondycję swojego sprzętu\n` +
                `👥 **Zespół:** Koordynuj ekwipunek z drużyną\n` +
                `📈 **Efektywność:** Używaj przedmiotów strategicznie`,
            inline: false,
        },
    ];

    const inventoryStatus =
        totalItems > 75
            ? "🔴 Przepełniony"
            : totalItems > 50
                ? "🟡 Dobrze zaopatrzony"
                : totalItems > 25
                    ? "🟢 Średnio wyposażony"
                    : totalItems > 10
                        ? "🔵 Podstawowy"
                        : "⚪ Minimalny";

    return new EmbedBuilder()
        .setTitle(
            `🎒 ${targetUser.displayName || targetUser.username} - Arsenał Łowcy`
        )
        .setColor("#9b59b6")
        .setThumbnail(targetUser.displayAvatarURL({dynamic: true, size: 256}))
        .setDescription(
            `╔═══════════════════════════════════════╗\n` +
            `║ 💼 **Status:** ${inventoryStatus} • 📦 **Przedmioty:** ${totalItems}/100 ║\n` +
            `║ 💰 **Wartość:** $${totalValue.toLocaleString()} • 🎯 **Unikalne:** ${
                detailedInventory.length
            } ║\n` +
            `╚═══════════════════════════════════════╝`
        )
        .addFields(fields)
        .setFooter({
            text: `💎 Całkowita wartość: $${totalValue.toLocaleString()} • 📦 Zajęte miejsca: ${totalItems}/100 • 🎒 Ekwipunek`,
            iconURL: targetUser.displayAvatarURL({dynamic: true, size: 32}),
        })
        .setTimestamp();
};

const createLoadingEmbed = (selectedMessage, targetUser) => {
    return new EmbedBuilder()
        .setTitle("🔍 **System Analizy Profilu**")
        .setDescription(selectedMessage)
        .setColor("#3498db")
        .addFields([
            {
                name: "⏳ Status",
                value: "`████████████████████` 100%",
                inline: true,
            },
            {
                name: "🎯 Cel",
                value: `Profil: ${targetUser.displayName || targetUser.username}`,
                inline: true,
            },
        ])
        .setFooter({text: "Przetwarzanie danych może potrwać kilka sekund..."})
        .setTimestamp();
};

const createSwitchingEmbed = (newView) => {
    return new EmbedBuilder()
        .setTitle("🔄 **Przełączanie Widoku**")
        .setDescription(
            `⚡ **Ładowanie:** ${
                VIEW_NAMES[newView] || "Nieznany widok"
            }\n*Przygotowywanie danych...*`
        )
        .setColor("#3498db")
        .addFields([
            {
                name: "📊 Status",
                value: "`██████████████████▓▓` 90%",
                inline: true,
            },
            {
                name: "🎯 Widok",
                value: VIEW_NAMES[newView] || "Nieznany",
                inline: true,
            },
        ])
        .setFooter({text: "Optymalizacja interfejsu..."});
};

const createErrorEmbed = (targetUser, interaction) => {
    return new EmbedBuilder()
        .setColor("#e74c3c")
        .setTitle("⚠️ **System Error - Profile Analysis Failed**")
        .setDescription(
            "🔴 **Błąd krytyczny systemu profilu**\n" +
            "*Nie udało się załadować danych łowcy duchów*\n\n" +
            "📋 **Kod błędu:** `PROFILE_LOAD_FAILED`\n" +
            "🕐 **Czas wystąpienia:** <t:" +
            Math.floor(Date.now() / 1000) +
            ":F>"
        )
        .addFields([
            {
                name: "🔧 **Rozwiązywanie Problemów**",
                value:
                    "╭─ 🌐 **Sprawdź połączenie internetowe**\n" +
                    "├─ ⏳ **Odczekaj 30 sekund i spróbuj ponownie**\n" +
                    "├─ 🔄 **Zrestartuj aplikację Discord**\n" +
                    "├─ 🛠️ **Skontaktuj się z administratorem**\n" +
                    "╰─ 📞 **Zgłoś problem na serwerze wsparcia**",
                inline: false,
            },
            {
                name: "📊 **Informacje Techniczne**",
                value:
                    `╭─ **Użytkownik:** ${
                        targetUser.displayName || targetUser.username
                    }\n` +
                    `├─ **ID:** ${targetUser.id}\n` +
                    `├─ **Serwer:** ${interaction.guild.name}\n` +
                    `╰─ **Komenda:** \`/profile\``,
                inline: true,
            },
            {
                name: "🆘 **Wsparcie Techniczne**",
                value:
                    "╭─ **Status:** 🔴 Błąd systemu\n" +
                    "├─ **Priorytet:** Wysoki\n" +
                    "├─ **ETA naprawy:** ~5 minut\n" +
                    "╰─ **Alternatywa:** Spróbuj `/balance`",
                inline: true,
            },
        ])
        .setFooter({
            text: "🛡️ System Diagnostyczny • Jeśli problem się powtarza, skontaktuj się z administratorem",
            iconURL: interaction.client.user.displayAvatarURL({
                dynamic: true,
                size: 32,
            }),
        })
        .setTimestamp();
};

module.exports = {
    createNavigationRow,
    createMainEmbed,
    createStatsEmbed,
    createAchievementsEmbed,
    createInventoryEmbed,
    createLoadingEmbed,
    createSwitchingEmbed,
    createErrorEmbed,
};
