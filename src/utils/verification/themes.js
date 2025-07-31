const {EmbedBuilder} = require("discord.js");

class VerificationThemes {
    static getThemes() {
        return {
            classic: {
                name: "👻 Klasyczny Phasmophobia",
                title: "👻 WERYFIKACJA INVESTIGATORA",
                description: (guild) =>
                    `**Witaj w ${guild.name}**\n\n🔍 *"Spirits are restless tonight..."*\n\nAby dołączyć do zespołu śledczych paranormalnych i uzyskać dostęp do:\n• 📋 Kanały misyjne\n• 🎤 Pokoje głosowe\n• 📊 Dzienniki dochodzeń\n• 👥 Społeczność investigatorów\n\n**Kliknij przycisk poniżej, aby rozpocząć swoją pierwszą misję.**`,
                color: "#2C2F33",
                footer: "Pamiętaj: Duchy nie śpią... Ty też nie powinieneś.",
                buttonLabel: "Rozpocznij Misję",
                buttonEmoji: "🔍",
                buttonStyle: "Success",
            },
            investigator: {
                name: "🔍 Paranormal Investigator",
                title: "🔍 REJESTRACJA INVESTIGATORA",
                description: (guild) =>
                    `**Centrum Badań Paranormalnych**\n\n*Dołącz do elitarnego zespołu śledczych!*\n\n📋 **Wymagania:**\n• Odwaga w obliczu nieznanych\n• Gotowość do pracy w zespole\n• Brak strachu przed ciemnością\n\n🎯 **Korzyści:**\n• Dostęp do sprzętu EMF\n• Szkolenia z ghost hunting\n• Premia za każdą udaną misję`,
                color: "#7289DA",
                thumbnail: null,
                footer: "Ghost Hunters Division - Established 2020",
                buttonLabel: "Dołącz do Zespołu",
                buttonEmoji: "🎯",
                buttonStyle: "Success",
            },
            dark: {
                name: "🌙 Darkness Rising",
                title: "🌙 DARKNESS RISING",
                description: (guild) =>
                    `**Mroczne Siły Wzywają...**\n\n*Cienie szepczą Twoje imię...*\n\n🕯️ Światło gaśnie, ale Ty musisz iść dalej\n👤 Dołącz do tych, którzy stawili czoła ciemności\n🔮 Odkryj tajemnice, które inni boją się poznać\n\n**Czy jesteś gotowy spojrzeć w otchłań?**`,
                color: "#1a1a1a",
                thumbnail: null,
                footer: "The darkness is calling... will you answer?",
                buttonLabel: "Wejdź w Ciemność",
                buttonEmoji: "🌙",
                buttonStyle: "Secondary",
            },
            haunted: {
                name: "🏚️ Haunted House",
                title: "🏚️ HAUNTED HOUSE INVESTIGATION",
                description: (guild) =>
                    `**Zapraszamy do Nawiedzonych Kwater**\n\n*Stary dom na wzgórzu czeka...*\n\n🚪 Drzwi skrzypią w pustym korytarzu\n🕸️ Pajęczyny oplątają zapomniane wspomnienia\n👻 Każdy pokój kryje swoją historię\n🔦 Tylko latarka oświetla drogę\n\n**Przekrocz próg, jeśli się odważysz...**`,
                color: "#8B4513",
                thumbnail: null,
                footer: "Welcome to the House... you may never leave.",
                buttonLabel: "Przekrocz Próg",
                buttonEmoji: "🚪",
                buttonStyle: "Success",
            },
            asylum: {
                name: "🏥 Asylum Investigation",
                title: "🏥 ASYLUM INVESTIGATION UNIT",
                description: (guild) =>
                    `**Opuszczony Szpital Psychiatryczny**\n\n*Korytarze pełne są wspomnień...*\n\n💉 Stare narzędzia medyczne wciąż leżą na stołach\n🛏️ Puste łóżka czekają na pacjentów\n📋 Karty medyczne rozrzucone po podłodze\n🔬 Laboratorium skrywa mroczne sekrety\n\n**Czy odważysz się zbadać to miejsce?**`,
                color: "#4A4A4A",
                thumbnail: null,
                footer: "Some patients never left... and they're waiting.",
                buttonLabel: "Wejdź do Asylum",
                buttonEmoji: "🏥",
                buttonStyle: "Danger",
            },
            school: {
                name: "🏫 Haunted School",
                title: "🏫 NAWIEDZIONA SZKOŁA",
                description: (guild) =>
                    `**Opuszczona Szkoła Podstawowa**\n\n*Dziecięce śmiechy wciąż echują...*\n\n📚 Podręczniki leżą otwarte na pustych ławkach\n🖍️ Kolorowe kredki rozrzucone po podłodze\n🎨 Rysunki dzieci wiszą na ścianach\n🔔 Dzwonek wciąż dzwoni o północy\n\n**Czy słyszysz te głosy z przeszłości?**`,
                color: "#FF6B6B",
                thumbnail: null,
                footer: "The children are still here... playing forever.",
                buttonLabel: "Wejdź do Szkoły",
                buttonEmoji: "🏫",
                buttonStyle: "Primary",
            },
        };
    }

    static createEmbed(themeKey, guild, additionalData = {}) {
        const themes = this.getThemes();
        const theme = themes[themeKey];

        if (!theme) {
            throw new Error(`Nieznany motyw: ${themeKey}`);
        }

        const embed = new EmbedBuilder()
            .setTitle(theme.title)
            .setDescription(theme.description(guild))
            .setColor(theme.color)
            .setFooter({text: theme.footer})
            .setTimestamp();

        if (theme.thumbnail) {
            embed.setThumbnail(theme.thumbnail);
        }

        if (themeKey === "classic" && additionalData.stats) {
            embed.addFields({
                name: "🎯 Aktualny Status",
                value: `📊 **Aktywnych Investigatorów:** ${
                    guild.memberCount - 1
                }\n🏆 **Ukończonych Misji:** ${
                    additionalData.stats.completedMissions ||
                    Math.floor(Math.random() * 1000) + 500
                }\n⚡ **Poziom Aktywności:** ${
                    additionalData.stats.activityLevel ||
                    (Math.random() > 0.5 ? "Wysoki" : "Umiarkowany")
                }`,
                inline: false,
            });
        }

        if (themeKey === "investigator" && additionalData.equipment) {
            embed.addFields({
                name: "🔧 Dostępny Sprzęt",
                value:
                    "• EMF Reader Level 5\n• Spirit Box\n• UV Flashlight\n• Thermometer\n• Video Camera\n• Motion Sensor",
                inline: true,
            });
        }

        return embed;
    }

    static getButtonConfig(themeKey) {
        const themes = this.getThemes();
        const theme = themes[themeKey];

        return {
            label: theme.buttonLabel,
            emoji: theme.buttonEmoji,
            style: theme.buttonStyle,
        };
    }
}

module.exports = VerificationThemes;
