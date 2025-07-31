const SeasonalEvent = require("../../models/SeasonalEvent");
const Profile = require("../../models/Profile");
const XpMultiplier = require("../leveling/xpMultiplier");

class SeasonalEventManager {
    constructor() {
        this.eventDates = {
            christmas: {
                month: 12,
                day: 25,
                name: "Boże Narodzenie",
                emoji: "🎄",
                color: "#ff0000",
                description: "Świąteczny czas pełen magii i duchów!",
            },
            easter: {
                month: 4,
                day: 15,
                name: "Wielkanoc",
                emoji: "🐰",
                color: "#ffeb3b",
                description: "Czas odrodzenia i nowych początków!",
            },
            halloween: {
                month: 10,
                day: 31,
                name: "Halloween",
                emoji: "🎃",
                color: "#ff6600",
                description: "Najstraszniejsza noc w roku!",
            },
        };
    }

    async getCurrentEvent(guildId) {
        const now = new Date();
        const activeEvent = await SeasonalEvent.findOne({
            guildId,
            isActive: true,
            startDate: {$lte: now},
            endDate: {$gte: now},
        });

        return activeEvent;
    }

    shouldEventBeActive(eventType, currentDate = new Date()) {
        const eventInfo = this.eventDates[eventType];
        if (!eventInfo) return false;

        const currentYear = currentDate.getFullYear();
        const eventDate = new Date(currentYear, eventInfo.month - 1, eventInfo.day);

        const startDate = new Date(eventDate);
        startDate.setDate(startDate.getDate() - 14);

        const endDate = new Date(eventDate);
        endDate.setDate(endDate.getDate() + 14);

        return currentDate >= startDate && currentDate <= endDate;
    }

    async updateEventStatus(guildId) {
        const currentDate = new Date();
        const results = [];

        for (const [eventType, eventInfo] of Object.entries(this.eventDates)) {
            const shouldBeActive = this.shouldEventBeActive(eventType, currentDate);
            const existingEvent = await SeasonalEvent.findOne({
                guildId,
                eventType,
            });

            if (shouldBeActive && (!existingEvent || !existingEvent.isActive)) {
                const eventDate = new Date(currentDate.getFullYear(), eventInfo.month - 1, eventInfo.day);
                const startDate = new Date(eventDate);
                startDate.setDate(startDate.getDate() - 14);
                const endDate = new Date(eventDate);
                endDate.setDate(endDate.getDate() + 14);

                const eventData = {
                    guildId,
                    eventType,
                    isActive: true,
                    startDate,
                    endDate,
                    xpMultiplier: 2.0,
                    moneyMultiplier: 2.0,
                    config: {
                        specialHuntChance: 0.15,
                        specialFindChance: 0.1,
                        bonusRewardMultiplier: 1.5,
                        specialItems: this.getSpecialItems(eventType),
                    },
                };

                if (existingEvent) {
                    await SeasonalEvent.findByIdAndUpdate(existingEvent._id, eventData);
                } else {
                    await SeasonalEvent.create(eventData);
                }

                results.push({eventType, action: "activated", eventInfo});
            } else if (!shouldBeActive && existingEvent && existingEvent.isActive) {
                await SeasonalEvent.findByIdAndUpdate(existingEvent._id, {
                    isActive: false,
                });
                results.push({eventType, action: "deactivated", eventInfo});
            }
        }

        return results;
    }

    getSpecialItems(eventType) {
        const items = {
            christmas: [
                "Świąteczny EMF Reader",
                "Świąteczna Latarka",
                "Świąteczne Światełka",
                "Choinka Ochronna",
                "Świąteczne Dzwoneczki",
            ],
            easter: [
                "Wielkanocny EMF Reader",
                "Wielkanocna Latarka",
                "Wielkanocne Jajko Ochronne",
                "Królicze Uszy Detektora",
                "Świąteczny Koszyk",
            ],
            halloween: [
                "Halloweenowy EMF Reader",
                "Dyniowa Latarka",
                "Straszna Maska",
                "Halloweenowy Krucyfiks",
                "Cukierek Odwagi",
            ],
        };

        return items[eventType] || [];
    }

    async addParticipant(guildId, userId) {
        const activeEvent = await this.getCurrentEvent(guildId);
        if (!activeEvent) return null;

        const existingParticipant = activeEvent.participants.find(
            (p) => p.userId === userId
        );

        if (!existingParticipant) {
            activeEvent.participants.push({
                userId,
                joinedAt: new Date(),
                specialHunts: 0,
                specialFinds: 0,
                totalEventXp: 0,
                totalEventMoney: 0,
            });
            activeEvent.participantsCount = activeEvent.participants.length;
            await activeEvent.save();
        }

        return activeEvent;
    }

    async checkSpecialHunt(guildId, userId) {
        const activeEvent = await this.getCurrentEvent(guildId);
        if (!activeEvent) return {isSpecial: false};

        await this.addParticipant(guildId, userId);

        const isSpecial = Math.random() < activeEvent.config.specialHuntChance;

        if (isSpecial) {
            const participant = activeEvent.participants.find(p => p.userId === userId);
            if (participant) {
                participant.specialHunts += 1;
                await activeEvent.save();
            }
        }

        return {
            isSpecial,
            eventType: activeEvent.eventType,
            eventInfo: this.eventDates[activeEvent.eventType],
            bonusMultiplier: activeEvent.config.bonusRewardMultiplier,
        };
    }

    async checkSpecialFind(guildId, userId) {
        const activeEvent = await this.getCurrentEvent(guildId);
        if (!activeEvent) return {isSpecial: false};

        await this.addParticipant(guildId, userId);

        const isSpecial = Math.random() < activeEvent.config.specialFindChance;

        if (isSpecial) {
            const specialItem = activeEvent.config.specialItems[
                Math.floor(Math.random() * activeEvent.config.specialItems.length)
                ];

            const participant = activeEvent.participants.find(p => p.userId === userId);
            if (participant) {
                participant.specialFinds += 1;
                await activeEvent.save();
            }

            activeEvent.specialItemsFound += 1;
            await activeEvent.save();

            return {
                isSpecial: true,
                item: specialItem,
                eventType: activeEvent.eventType,
                eventInfo: this.eventDates[activeEvent.eventType],
            };
        }

        return {isSpecial: false};
    }

    async applyEventBoosters(guildId, userId, baseXp, baseMoney) {
        const activeEvent = await this.getCurrentEvent(guildId);
        if (!activeEvent) return {xp: baseXp, money: baseMoney};

        await this.addParticipant(guildId, userId);

        const eventXp = Math.floor(baseXp * activeEvent.xpMultiplier);
        const eventMoney = Math.floor(baseMoney * activeEvent.moneyMultiplier);

        const participant = activeEvent.participants.find(p => p.userId === userId);
        if (participant) {
            participant.totalEventXp += (eventXp - baseXp);
            participant.totalEventMoney += (eventMoney - baseMoney);
            await activeEvent.save();
        }

        activeEvent.totalRewardsGiven += (eventXp - baseXp) + (eventMoney - baseMoney);
        await activeEvent.save();

        return {
            xp: eventXp,
            money: eventMoney,
            multipliers: {
                xp: activeEvent.xpMultiplier,
                money: activeEvent.moneyMultiplier,
            },
            eventInfo: this.eventDates[activeEvent.eventType],
        };
    }

    async getEventStats(guildId, eventType = null) {
        const query = {guildId};
        if (eventType) query.eventType = eventType;

        const events = await SeasonalEvent.find(query).sort({createdAt: -1});

        if (events.length === 0) return null;

        const activeEvent = events.find(e => e.isActive);
        const stats = {
            activeEvent: activeEvent ? {
                type: activeEvent.eventType,
                info: this.eventDates[activeEvent.eventType],
                participants: activeEvent.participantsCount,
                specialHunts: activeEvent.participants.reduce((sum, p) => sum + p.specialHunts, 0),
                specialFinds: activeEvent.specialItemsFound,
                totalRewards: activeEvent.totalRewardsGiven,
                timeLeft: activeEvent.endDate - new Date(),
            } : null,
            pastEvents: events.filter(e => !e.isActive).slice(0, 5),
        };

        return stats;
    }

    async getEventLeaderboard(guildId, eventType = null) {
        const activeEvent = await this.getCurrentEvent(guildId);
        if (!activeEvent) return null;

        const leaderboard = activeEvent.participants
            .sort((a, b) => (b.totalEventXp + b.totalEventMoney) - (a.totalEventXp + a.totalEventMoney))
            .slice(0, 10)
            .map((participant, index) => ({
                rank: index + 1,
                userId: participant.userId,
                specialHunts: participant.specialHunts,
                specialFinds: participant.specialFinds,
                totalEventXp: participant.totalEventXp,
                totalEventMoney: participant.totalEventMoney,
                totalScore: participant.totalEventXp + participant.totalEventMoney,
            }));

        return {
            eventType: activeEvent.eventType,
            eventInfo: this.eventDates[activeEvent.eventType],
            leaderboard,
        };
    }
}

module.exports = new SeasonalEventManager();