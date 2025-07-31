const cron = require("node-cron");
const {EmbedBuilder} = require("discord.js");
const DailyChallengeConfig = require("../../models/DailyChallengeConfig");
const {ghosts, challenges} = require("../../data/phasmophobiaData");

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

class DailyChallengeScheduler {
    constructor() {
        this.tasks = new Map();
        this.isInitialized = false;
        this.client = null;
        this.usedChallenges = new Map();
    }

    initialize(client) {
        if (this.isInitialized) {
            console.log("Daily Challenge Scheduler już zainicjalizowany");
            return;
        }

        this.client = client;
        console.log("Inicjalizacja Daily Challenge Scheduler...");

        const schedules = {
            hourly: "0 * * * *",
            every3hours: "0 */3 * * *",
            every6hours: "0 */6 * * *",
            every12hours: "0 */12 * * *",
            daily: "0 8 * * *",
        };

        for (const [frequency, schedule] of Object.entries(schedules)) {
            const task = cron.schedule(
                schedule,
                async () => {
                    console.log(
                        `${colors.yellow}[DAILY CHALLENGES] Uruchamianie zadania: ${frequency}${colors.reset}`
                    );
                    await this.processChallengeRenewal(frequency);
                },
                {
                    scheduled: false,
                    timezone: "Europe/Warsaw",
                }
            );

            this.tasks.set(frequency, task);
        }

        const cleanupTask = cron.schedule(
            "0 0 * * *",
            async () => {
                console.log(
                    `${colors.cyan}[DAILY CHALLENGES] Czyszczenie starych wyzwań...${colors.reset}`
                );
                await this.cleanupOldChallenges();
            },
            {
                scheduled: false,
                timezone: "Europe/Warsaw",
            }
        );

        this.tasks.set("cleanup", cleanupTask);

        this.isInitialized = true;
        console.log(
            `${colors.green}Daily Challenge Scheduler zainicjalizowany pomyślnie${colors.reset}`
        );
    }

    start() {
        if (!this.isInitialized) {
            throw new Error("Scheduler nie został zainicjalizowany");
        }

        console.log(
            `${colors.green}Uruchamianie Daily Challenge Scheduler...${colors.reset}`
        );

        for (const [name, task] of this.tasks) {
            task.start();
            console.log(
                `${colors.green}✅ Zadanie ${name} uruchomione${colors.reset}`
            );
        }

        console.log(
            `${colors.green}Daily Challenge Scheduler uruchomiony pomyślnie${colors.reset}`
        );
    }

    stop() {
        console.log(
            `${colors.yellow}Zatrzymywanie Daily Challenge Scheduler...${colors.reset}`
        );

        for (const [name, task] of this.tasks) {
            task.stop();
            console.log(
                `${colors.yellow}⏹️ Zadanie ${name} zatrzymane${colors.reset}`
            );
        }

        console.log(
            `${colors.yellow}Daily Challenge Scheduler zatrzymany${colors.reset}`
        );
    }

    async processChallengeRenewal(frequency) {
        try {
            const configs = await DailyChallengeConfig.find({
                renewalFrequency: frequency,
                enabled: true,
            });

            if (configs.length === 0) {
                console.log(
                    `${colors.dim}[DAILY CHALLENGES] Brak konfiguracji dla częstotliwości: ${frequency}${colors.reset}`
                );
                return;
            }

            let successCount = 0;
            let errorCount = 0;

            for (const config of configs) {
                try {
                    if (await this.shouldRenewChallenge(config, frequency)) {
                        await this.sendNewChallenge(config);
                        successCount++;
                    }
                } catch (error) {
                    console.error(
                        `${colors.red}[ERROR] Błąd podczas wysyłania wyzwania dla serwera ${config.guildId}:${colors.reset}`,
                        error.message
                    );
                    errorCount++;
                }
            }

            console.log(
                `${colors.green}[DAILY CHALLENGES] Wysłano ${successCount} wyzwań, ${errorCount} błędów (${frequency})${colors.reset}`
            );
        } catch (error) {
            console.error(
                `${colors.red}[ERROR] Błąd podczas przetwarzania odnowienia wyzwań:${colors.reset}`,
                error
            );
        }
    }

    async shouldRenewChallenge(config, frequency) {
        const now = new Date();

        if (!config.lastRenewal) {
            return true;
        }

        const lastRenewal = new Date(config.lastRenewal);
        const timeDiff = now - lastRenewal;

        const intervals = {
            hourly: 60 * 60 * 1000,
            every3hours: 3 * 60 * 60 * 1000,
            every6hours: 6 * 60 * 60 * 1000,
            every12hours: 12 * 60 * 60 * 1000,
            daily: 24 * 60 * 60 * 1000,
        };

        const requiredInterval = intervals[frequency] || intervals.daily;

        if (frequency === "daily") {
            const currentHour = now.getHours();
            const configHour = config.customHour || 8;

            if (currentHour !== configHour) {
                return false;
            }

            const today = new Date(now);
            today.setHours(0, 0, 0, 0);
            const lastRenewalDate = new Date(lastRenewal);
            lastRenewalDate.setHours(0, 0, 0, 0);

            return today > lastRenewalDate;
        }

        return timeDiff >= requiredInterval;
    }

    async sendNewChallenge(config) {
        const channel = await this.client.channels.fetch(config.channelId);
        if (!channel || !channel.isTextBased()) {
            throw new Error(`Nie można znaleźć kanału: ${config.channelId}`);
        }

        const {challenge, category, challengeId} = this.getRandomChallenge(
            config.guildId,
            config.lastChallengeId
        );

        const embed = this.createChallengeEmbed(challenge, category, config);

        await channel.send({embeds: [embed]});

        await DailyChallengeConfig.findByIdAndUpdate(config._id, {
            lastChallengeId: challengeId,
            lastRenewal: new Date(),
        });

        console.log(
            `${colors.green}[DAILY CHALLENGES] Wysłano wyzwanie do ${channel.name} (${config.guildId})${colors.reset}`
        );
    }

    getRandomChallenge(guildId, lastChallengeId) {
        const challengeKeys = Object.keys(challenges);
        let availableCategories = [...challengeKeys];

        if (!this.usedChallenges.has(guildId)) {
            this.usedChallenges.set(guildId, new Set());
        }

        const usedInGuild = this.usedChallenges.get(guildId);

        if (usedInGuild.size >= challengeKeys.length) {
            usedInGuild.clear();
        }

        availableCategories = challengeKeys.filter(
            (key) => !usedInGuild.has(key) && key !== lastChallengeId
        );

        if (availableCategories.length === 0) {
            availableCategories = challengeKeys;
        }

        const randomCategoryKey =
            availableCategories[
                Math.floor(Math.random() * availableCategories.length)
                ];
        const category = challenges[randomCategoryKey];
        const baseChallenge =
            category.tasks[Math.floor(Math.random() * category.tasks.length)];

        usedInGuild.add(randomCategoryKey);

        let finalChallenge = baseChallenge;
        let challengeId = `${randomCategoryKey}_${Date.now()}`;

        if (Math.random() < 0.33 && ghosts && ghosts.length > 0) {
            const randomGhost = ghosts[Math.floor(Math.random() * ghosts.length)];
            finalChallenge = `${baseChallenge}\n\n**🎯 Bonus Challenge:**\nZnajdź ducha typu **${randomGhost.name}** 👻\n*+50% więcej XP za ukończenie!*`;
            challengeId += "_bonus";
        }

        return {
            challenge: finalChallenge,
            category,
            challengeId,
        };
    }

    createChallengeEmbed(challenge, category, config) {
        const now = new Date();
        const renewalTexts = {
            hourly: "Co godzinę",
            every3hours: "Co 3 godziny",
            every6hours: "Co 6 godzin",
            every12hours: "Co 12 godzin",
            daily: "Codziennie",
        };

        const nextRenewal = this.getNextRenewalTime(config);

        const embed = new EmbedBuilder()
            .setTitle("🎯 Wyzwanie Phasmophobia!")
            .setDescription(
                `**Kategoria:** ${category.emoji} ${category.name}\n\n**Wyzwanie:**\n> ${challenge}`
            )
            .setColor("#ff6b35")
            .setTimestamp()
            .addFields([
                {
                    name: "⏰ Częstotliwość odnowienia",
                    value: renewalTexts[config.renewalFrequency] || "Codziennie",
                    inline: true,
                },
                {
                    name: "🔄 Następne odnowienie",
                    value: nextRenewal,
                    inline: true,
                },
                {
                    name: "💡 Wskazówka",
                    value:
                        "Wyzwania odnawiają się automatycznie! Sprawdzaj regularnie nowe zadania.",
                    inline: false,
                },
            ])
            .setFooter({text: "Powodzenia, łowcy duchów! 🎯"});

        return embed;
    }

    getNextRenewalTime(config) {
        const now = new Date();
        const frequency = config.renewalFrequency;

        switch (frequency) {
            case "hourly":
                const nextHour = new Date(now);
                nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);
                return `<t:${Math.floor(nextHour.getTime() / 1000)}:R>`;

            case "every3hours":
                const next3Hours = new Date(now);
                next3Hours.setHours(next3Hours.getHours() + 3, 0, 0, 0);
                return `<t:${Math.floor(next3Hours.getTime() / 1000)}:R>`;

            case "every6hours":
                const next6Hours = new Date(now);
                next6Hours.setHours(next6Hours.getHours() + 6, 0, 0, 0);
                return `<t:${Math.floor(next6Hours.getTime() / 1000)}:R>`;

            case "every12hours":
                const next12Hours = new Date(now);
                next12Hours.setHours(next12Hours.getHours() + 12, 0, 0, 0);
                return `<t:${Math.floor(next12Hours.getTime() / 1000)}:R>`;

            case "daily":
            default:
                const nextDay = new Date(now);
                nextDay.setDate(nextDay.getDate() + 1);
                nextDay.setHours(config.customHour || 8, 0, 0, 0);
                return `<t:${Math.floor(nextDay.getTime() / 1000)}:R>`;
        }
    }

    async cleanupOldChallenges() {
        try {
            const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

            for (const [guildId, usedSet] of this.usedChallenges.entries()) {
                const config = await DailyChallengeConfig.findOne({guildId});
                if (
                    !config ||
                    !config.lastRenewal ||
                    new Date(config.lastRenewal).getTime() < weekAgo
                ) {
                    usedSet.clear();
                    console.log(
                        `${colors.dim}[CLEANUP] Wyczyszczono historię wyzwań dla serwera: ${guildId}${colors.reset}`
                    );
                }
            }

            console.log(
                `${colors.green}[CLEANUP] Zakończono czyszczenie starych wyzwań${colors.reset}`
            );
        } catch (error) {
            console.error(
                `${colors.red}[ERROR] Błąd podczas czyszczenia starych wyzwań:${colors.reset}`,
                error
            );
        }
    }

    async manualRenewal(guildId) {
        try {
            const config = await DailyChallengeConfig.findOne({guildId});
            if (!config) {
                throw new Error("Brak konfiguracji wyzwań dla tego serwera");
            }

            await this.sendNewChallenge(config);
            return true;
        } catch (error) {
            console.error(
                `${colors.red}[ERROR] Błąd podczas ręcznego odnowienia:${colors.reset}`,
                error
            );
            throw error;
        }
    }

    getStatus() {
        const status = {
            initialized: this.isInitialized,
            tasks: {},
            activeGuilds: this.usedChallenges.size,
        };

        for (const [name, task] of this.tasks) {
            status.tasks[name] = {
                running: task.running || false,
                scheduled: task.scheduled || false,
            };
        }

        return status;
    }
}

const dailyChallengeScheduler = new DailyChallengeScheduler();

module.exports = dailyChallengeScheduler;
