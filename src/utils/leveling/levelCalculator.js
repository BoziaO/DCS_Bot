class LevelCalculator {
    static calculateLevel(xp) {
        return Math.floor(0.1 * Math.sqrt(xp || 0));
    }

    static calculateXpForLevel(level) {
        return Math.pow((level || 0) / 0.1, 2);
    }

    static getLevelProgress(xp) {
        const currentLevel = this.calculateLevel(xp);
        const xpForCurrentLevel = this.calculateXpForLevel(currentLevel);
        const xpForNextLevel = this.calculateXpForLevel(currentLevel + 1);
        const progressXp = xp - xpForCurrentLevel;
        const neededXp = xpForNextLevel - xpForCurrentLevel;
        const progressPercentage = (progressXp / neededXp) * 100;

        return {
            currentLevel,
            xpForCurrentLevel,
            xpForNextLevel,
            progressXp,
            neededXp,
            progressPercentage: Math.min(100, Math.max(0, progressPercentage)),
        };
    }

    static getXpNeededForLevel(currentXp, targetLevel) {
        const targetXp = this.calculateXpForLevel(targetLevel);
        return Math.max(0, targetXp - currentXp);
    }

    static checkLevelUp(oldXp, newXp) {
        const oldLevel = this.calculateLevel(oldXp);
        const newLevel = this.calculateLevel(newXp);

        return {
            leveledUp: newLevel > oldLevel,
            oldLevel,
            newLevel,
            levelsGained: newLevel - oldLevel,
        };
    }

    static getAverageXpPerMessage(totalXp, messageCount) {
        return messageCount > 0 ? totalXp / messageCount : 0;
    }

    static estimateTimeToLevel(currentXp, targetLevel, avgXpPerDay) {
        const neededXp = this.getXpNeededForLevel(currentXp, targetLevel);

        if (avgXpPerDay <= 0) {
            return {days: Infinity, readable: "Nieskończoność"};
        }

        const days = Math.ceil(neededXp / avgXpPerDay);

        if (days < 1) {
            return {days: 0, readable: "Mniej niż dzień"};
        } else if (days < 7) {
            return {days, readable: `${days} dni`};
        } else if (days < 30) {
            const weeks = Math.ceil(days / 7);
            return {days, readable: `${weeks} tygodni`};
        } else if (days < 365) {
            const months = Math.ceil(days / 30);
            return {days, readable: `${months} miesięcy`};
        } else {
            const years = Math.ceil(days / 365);
            return {days, readable: `${years} lat`};
        }
    }
}

module.exports = LevelCalculator;
