const {
    SlashCommandBuilder,
    EmbedBuilder,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
} = require("discord.js");
const Profile = require("../../models/Profile");
const XpMultiplier = require("../../utils/leveling/xpMultiplier");

module.exports = {
    data: new SlashCommandBuilder()
        .setName("boosters")
        .setDescription("Zarządzaj boosterami XP")
        .addSubcommand((subcommand) =>
            subcommand.setName("list").setDescription("Sprawdź aktywne boostery XP")
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("buy")
                .setDescription("Kup booster XP")
                .addStringOption((option) =>
                    option
                        .setName("type")
                        .setDescription("Typ boostera")
                        .addChoices(
                            {name: "🚀 Szybki (x1.5, 1h) - 500💰", value: "fast"},
                            {name: "⚡ Mocny (x2.0, 30min) - 750💰", value: "strong"},
                            {name: "🔥 Mega (x3.0, 15min) - 1000💰", value: "mega"},
                            {name: "💫 Ultra (x5.0, 5min) - 1500💰", value: "ultra"}
                        )
                        .setRequired(true)
                )
        )
        .addSubcommand((subcommand) =>
            subcommand
                .setName("multiplier")
                .setDescription("Sprawdź aktualny mnożnik XP")
        ),

    async execute(interaction) {
        await interaction.deferReply();

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === "list") {
            await this.handleList(interaction);
        } else if (subcommand === "buy") {
            await this.handleBuy(interaction);
        } else if (subcommand === "multiplier") {
            await this.handleMultiplier(interaction);
        }
    },

    async handleList(interaction) {
        const profile = await Profile.findOne({
            userId: interaction.user.id,
            guildId: interaction.guild.id,
        });

        if (!profile) {
            const noProfileEmbed = new EmbedBuilder()
                .setTitle("❌ Brak profilu")
                .setDescription(
                    "Nie masz jeszcze profilu! Napisz kilka wiadomości aby go utworzyć."
                )
                .setColor("#e74c3c")
                .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}));

            return interaction.editReply({embeds: [noProfileEmbed]});
        }

        const activeBoosters = await XpMultiplier.getActiveBoosters(
            interaction.user.id,
            interaction.guild.id
        );

        const embed = new EmbedBuilder()
            .setTitle("🚀 Aktywne Boostery XP")
            .setColor("#3498db")
            .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}))
            .setFooter({text: `Profil • ${interaction.guild.name}`})
            .setTimestamp();

        if (activeBoosters.length === 0) {
            embed.setDescription(
                "Nie masz aktywnych boosterów XP.\n\nUżyj `/boosters buy` aby kupić booster!"
            );
        } else {
            const boosterText = activeBoosters
                .map((booster) => {
                    const expiresAt = new Date(booster.expiresAt);
                    const timeLeft = this.getTimeLeft(expiresAt);

                    return (
                        `🔥 **${booster.name}**\n` +
                        `📈 Mnożnik: **x${booster.multiplier}**\n` +
                        `⏰ Pozostały czas: **${timeLeft}**\n` +
                        `📝 ${booster.description}`
                    );
                })
                .join("\n\n");

            embed.setDescription(
                `Masz **${activeBoosters.length}** aktywnych boosterów:\n\n${boosterText}`
            );

            const totalMultiplier = activeBoosters.reduce(
                (total, booster) => total * booster.multiplier,
                1
            );
            if (totalMultiplier > 1) {
                embed.addFields([
                    {
                        name: "🎯 Łączny mnożnik z boosterów",
                        value: `**x${totalMultiplier.toFixed(2)}** (+${Math.round(
                            (totalMultiplier - 1) * 100
                        )}%)`,
                        inline: true,
                    },
                ]);
            }
        }

        const buyButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("boosters_buy_menu")
                .setLabel("🛒 Kup Booster")
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId("boosters_multiplier")
                .setLabel("📊 Pełny Mnożnik")
                .setStyle(ButtonStyle.Primary)
        );

        await interaction.editReply({
            embeds: [embed],
            components: [buyButton],
        });

        const collector = interaction.channel.createMessageComponentCollector({
            filter: (i) => i.user.id === interaction.user.id,
            time: 120000,
        });

        collector.on("collect", async (buttonInteraction) => {
            try {
                if (!buttonInteraction.isRepliable()) {
                    console.warn("Interaction is no longer repliable");
                    return;
                }

                if (buttonInteraction.customId === "boosters_buy_menu") {
                    await buttonInteraction.deferReply({ephemeral: true});
                    await this.showBuyMenu(buttonInteraction);
                } else if (buttonInteraction.customId === "boosters_multiplier") {
                    await buttonInteraction.deferReply({ephemeral: true});
                    await this.showFullMultiplier(buttonInteraction, profile);
                }
            } catch (error) {
                console.error("Błąd w kolektorze boosterów:", error);

                try {
                    if (!buttonInteraction.replied && !buttonInteraction.deferred) {
                        await buttonInteraction.reply({
                            content: "❌ Wystąpił błąd podczas przetwarzania żądania.",
                            ephemeral: true,
                        });
                    }
                } catch (replyError) {
                    console.error("Could not send error reply:", replyError);
                }
            }
        });

        collector.on("end", async (collected, reason) => {
            try {
                if (reason === "time" && interaction.channel) {
                    const disabledButtons = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId("boosters_buy_disabled")
                            .setLabel("🛒 Kup Booster")
                            .setStyle(ButtonStyle.Success)
                            .setDisabled(true),
                        new ButtonBuilder()
                            .setCustomId("boosters_multiplier_disabled")
                            .setLabel("📊 Pełny Mnożnik")
                            .setStyle(ButtonStyle.Primary)
                            .setDisabled(true)
                    );

                    await interaction.editReply({components: [disabledButtons]});
                }
            } catch (error) {
                console.warn("Could not disable buttons:", error.message);
            }
        });
    },

    async handleBuy(interaction) {
        const boosterType = interaction.options.getString("type");

        const profile = await Profile.findOne({
            userId: interaction.user.id,
            guildId: interaction.guild.id,
        });

        if (!profile) {
            const noProfileEmbed = new EmbedBuilder()
                .setTitle("❌ Brak profilu")
                .setDescription(
                    "Nie masz jeszcze profilu! Napisz kilka wiadomości aby go utworzyć."
                )
                .setColor("#e74c3c")
                .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}));

            return interaction.editReply({embeds: [noProfileEmbed]});
        }

        const boosterConfig = this.getBoosterConfig(boosterType);
        if (!boosterConfig) {
            return interaction.editReply({content: "Nieprawidłowy typ boostera!"});
        }

        if (profile.balance < boosterConfig.cost) {
            const insufficientEmbed = new EmbedBuilder()
                .setTitle("💸 Niewystarczające środki")
                .setDescription(
                    `Potrzebujesz **${boosterConfig.cost}💰** aby kupić ten booster.\nMasz tylko **${profile.balance}💰**.`
                )
                .setColor("#e74c3c")
                .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}));

            return interaction.editReply({embeds: [insufficientEmbed]});
        }

        const expiresAt = new Date();
        expiresAt.setMinutes(expiresAt.getMinutes() + boosterConfig.duration);

        const success = await XpMultiplier.addXpBooster(
            interaction.user.id,
            interaction.guild.id,
            {
                name: boosterConfig.name,
                description: boosterConfig.description,
                multiplier: boosterConfig.multiplier,
                expiresAt: expiresAt,
            }
        );

        if (!success) {
            return interaction.editReply({
                content: "Wystąpił błąd podczas kupowania boostera!",
            });
        }

        profile.balance -= boosterConfig.cost;
        profile.moneySpent = (profile.moneySpent || 0) + boosterConfig.cost;
        await profile.save();

        const successEmbed = new EmbedBuilder()
            .setTitle("🎉 Booster kupiony!")
            .setDescription(`Pomyślnie kupiłeś **${boosterConfig.name}**!`)
            .setColor("#27ae60")
            .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}))
            .addFields([
                {
                    name: "🚀 Booster",
                    value: boosterConfig.name,
                    inline: true,
                },
                {
                    name: "📈 Mnożnik",
                    value: `x${boosterConfig.multiplier}`,
                    inline: true,
                },
                {
                    name: "⏰ Czas trwania",
                    value: `${boosterConfig.duration} minut`,
                    inline: true,
                },
                {
                    name: "💰 Koszt",
                    value: `${boosterConfig.cost}💰`,
                    inline: true,
                },
                {
                    name: "💳 Pozostały balans",
                    value: `${profile.balance}💰`,
                    inline: true,
                },
                {
                    name: "⏰ Wygasa",
                    value: expiresAt.toLocaleString("pl-PL"),
                    inline: true,
                },
            ])
            .setFooter({text: "Booster jest już aktywny!"})
            .setTimestamp();

        await interaction.editReply({embeds: [successEmbed]});
    },

    async handleMultiplier(interaction) {
        const profile = await Profile.findOne({
            userId: interaction.user.id,
            guildId: interaction.guild.id,
        });

        if (!profile) {
            const noProfileEmbed = new EmbedBuilder()
                .setTitle("❌ Brak profilu")
                .setDescription(
                    "Nie masz jeszcze profilu! Napisz kilka wiadomości aby go utworzyć."
                )
                .setColor("#e74c3c")
                .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}));

            return interaction.editReply({embeds: [noProfileEmbed]});
        }

        await this.showFullMultiplier(interaction, profile);
    },

    async showFullMultiplier(interaction, profile) {
        const multiplierInfo = await XpMultiplier.calculateMultiplier(profile);

        const embed = new EmbedBuilder()
            .setTitle("📊 Pełny Mnożnik XP")
            .setDescription(
                `Twój aktualny mnożnik XP: **x${multiplierInfo.totalMultiplier}** (+${multiplierInfo.bonusPercentage}%)`
            )
            .setColor("#9b59b6")
            .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}))
            .setFooter({text: "Mnożniki XP • Aktualne"})
            .setTimestamp();

        const multiplierText = multiplierInfo.activeMultipliers
            .map((multiplier) => {
                const bonus = Math.round((multiplier.value - 1) * 100);
                const bonusText =
                    bonus > 0 ? ` (+${bonus}%)` : bonus < 0 ? ` (${bonus}%)` : "";

                return `🔸 **${multiplier.name}**: x${multiplier.value}${bonusText}${
                    multiplier.description ? `\n   *${multiplier.description}*` : ""
                }`;
            })
            .join("\n\n");

        embed.addFields([
            {
                name: "🎯 Aktywne mnożniki",
                value: multiplierText,
                inline: false,
            },
        ]);

        const baseXp = 20;
        const finalXp = Math.floor(baseXp * multiplierInfo.totalMultiplier);

        embed.addFields([
            {
                name: "💡 Przykład",
                value: `Bazowe XP: **${baseXp}** → Końcowe XP: **${finalXp}** (różnica: +${
                    finalXp - baseXp
                })`,
                inline: false,
            },
        ]);

        try {
            if (interaction.deferred) {
                await interaction.editReply({embeds: [embed]});
            } else if (!interaction.replied) {
                await interaction.reply({embeds: [embed], ephemeral: true});
            }
        } catch (error) {
            console.error("Error responding to interaction:", error);
        }
    },

    async showBuyMenu(interaction) {
        const profile = await Profile.findOne({
            userId: interaction.user.id,
            guildId: interaction.guild.id,
        });

        const embed = new EmbedBuilder()
            .setTitle("🛒 Sklep z Boosterami XP")
            .setDescription(
                `Twój balans: **${profile.balance}💰**\n\nWybierz booster do kupienia:`
            )
            .setColor("#e67e22")
            .setThumbnail(interaction.user.displayAvatarURL({dynamic: true}))
            .addFields([
                {
                    name: "🚀 Szybki Booster",
                    value: "**x1.5 XP** przez **1 godzinę**\nKoszt: **500💰**",
                    inline: true,
                },
                {
                    name: "⚡ Mocny Booster",
                    value: "**x2.0 XP** przez **30 minut**\nKoszt: **750💰**",
                    inline: true,
                },
                {
                    name: "🔥 Mega Booster",
                    value: "**x3.0 XP** przez **15 minut**\nKoszt: **1000💰**",
                    inline: true,
                },
                {
                    name: "💫 Ultra Booster",
                    value: "**x5.0 XP** przez **5 minut**\nKoszt: **1500💰**",
                    inline: true,
                },
            ])
            .setFooter({text: "Boostery można łączyć dla większego efektu!"});

        try {
            if (interaction.deferred) {
                await interaction.editReply({embeds: [embed]});
            } else if (!interaction.replied) {
                await interaction.reply({embeds: [embed], ephemeral: true});
            }
        } catch (error) {
            console.error("Error responding to buy menu interaction:", error);
        }
    },

    getBoosterConfig(type) {
        const configs = {
            fast: {
                name: "Szybki Booster",
                description: "Zwiększa XP o 50% przez godzinę",
                multiplier: 1.5,
                duration: 60,
                cost: 500,
            },
            strong: {
                name: "Mocny Booster",
                description: "Podwaja XP przez pół godziny",
                multiplier: 2.0,
                duration: 30,
                cost: 750,
            },
            mega: {
                name: "Mega Booster",
                description: "Potraja XP przez 15 minut",
                multiplier: 3.0,
                duration: 15,
                cost: 1000,
            },
            ultra: {
                name: "Ultra Booster",
                description: "Zwiększa XP 5x przez 5 minut",
                multiplier: 5.0,
                duration: 5,
                cost: 1500,
            },
        };

        return configs[type];
    },

    getTimeLeft(endDate) {
        const now = new Date();
        const diff = endDate - now;

        if (diff <= 0) return "Wygasło";

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        if (hours > 0) return `${hours}h ${minutes}m`;
        if (minutes > 0) return `${minutes}m ${seconds}s`;
        return `${seconds}s`;
    },
};
