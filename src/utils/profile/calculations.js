const {GHOST_HUNTER_RANKS, ACHIEVEMENTS} = require("./constants");

const createProgressBar = (value, maxValue, size = 15, style = "default") => {
    const percentage = Math.min(Math.max(value / maxValue, 0), 1);
    const progress = Math.round(size * percentage);
    const emptyProgress = size - progress;

    switch (style) {
        case "gradient":
            const gradientChars = ["▰", "▰", "▱"];
            return (
                gradientChars[0].repeat(progress) +
                gradientChars[2].repeat(emptyProgress)
            );
        case "modern":
            return "▓".repeat(progress) + "░".repeat(emptyProgress);
        case "dots":
            return "●".repeat(progress) + "○".repeat(emptyProgress);
        case "blocks":
            return "■".repeat(progress) + "□".repeat(emptyProgress);
        default:
            return "█".repeat(progress) + "░".repeat(emptyProgress);
    }
};

const createAdvancedProgressBar = (value, maxValue, size = 20) => {
    const percentage = Math.min(Math.max(value / maxValue, 0), 1);
    const progress = Math.round(size * percentage);
    const emptyProgress = size - progress;

    let color = "";
    if (percentage >= 0.8) color = "🟢";
    else if (percentage >= 0.6) color = "🟡";
    else if (percentage >= 0.4) color = "🟠";
    else color = "🔴";

    const bar = "▓".repeat(progress) + "░".repeat(emptyProgress);
    return `${color} \`${bar}\` ${(percentage * 100).toFixed(1)}%`;
};

const calculateRank = (totalHunts) => {
    const ranks = Object.values(GHOST_HUNTER_RANKS).reverse();
    for (const rank of ranks) {
        if (totalHunts >= rank.minHunts) {
            return rank;
        }
    }
    return GHOST_HUNTER_RANKS[1];
};

const getNextRank = (currentRank) => {
    const currentRankNum = Object.keys(GHOST_HUNTER_RANKS).find(
        (key) => GHOST_HUNTER_RANKS[key].name === currentRank.name
    );
    const nextRankNum = parseInt(currentRankNum) + 1;
    return GHOST_HUNTER_RANKS[nextRankNum] || null;
};

const checkAchievements = (profile) => {
    const unlockedAchievements = [];
    const lockedAchievements = [];

    for (const [key, achievement] of Object.entries(ACHIEVEMENTS)) {
        try {
            if (achievement.condition(profile)) {
                unlockedAchievements.push({key, ...achievement});
            } else {
                lockedAchievements.push({key, ...achievement});
            }
        } catch (error) {
            console.error(`Error checking achievement ${key}:`, error);
            lockedAchievements.push({key, ...achievement});
        }
    }

    return {unlockedAchievements, lockedAchievements};
};

const getSanityStatus = (sanity) => {
    const sanityValue = sanity || 0;
    if (sanityValue >= 80)
        return {emoji: "🧠", status: "Doskonały", color: "#2ecc71"};
    if (sanityValue >= 60)
        return {emoji: "😐", status: "Stabilny", color: "#f39c12"};
    if (sanityValue >= 40)
        return {emoji: "😟", status: "Niepokojący", color: "#e67e22"};
    if (sanityValue >= 20)
        return {emoji: "😰", status: "Krytyczny", color: "#e74c3c"};
    return {emoji: "😱", status: "Zagrożony", color: "#8e44ad"};
};

const calculateAdvancedStats = (profile) => {
    const totalHunts = profile.totalHunts || 0;
    const successfulHunts = profile.successfulHunts || 0;
    const balance = profile.balance || 0;
    const totalEarnings = profile.totalEarnings || 0;
    const playtime = profile.playtime || 0;

    return {
        winRate:
            totalHunts > 0
                ? ((successfulHunts / totalHunts) * 100).toFixed(1)
                : "0.0",
        failRate:
            totalHunts > 0
                ? (((totalHunts - successfulHunts) / totalHunts) * 100).toFixed(1)
                : "0.0",
        avgEarningsPerHunt:
            totalHunts > 0 ? Math.round(totalEarnings / totalHunts) : 0,
        avgPlaytimePerHunt: totalHunts > 0 ? Math.round(playtime / totalHunts) : 0,
        huntsPerHour:
            playtime > 0 ? (totalHunts / (playtime / 60)).toFixed(1) : "0.0",
        earningsPerHour:
            playtime > 0 ? Math.round(totalEarnings / (playtime / 60)) : 0,
        survivalRate:
            totalHunts > 0
                ? (((totalHunts - (profile.deaths || 0)) / totalHunts) * 100).toFixed(1)
                : "100.0",
        efficiency:
            totalHunts > 0 && playtime > 0
                ? ((successfulHunts / (playtime / 60)) * 100).toFixed(1)
                : "0.0",
    };
};

const getPerformanceRating = (profile) => {
    const stats = calculateAdvancedStats(profile);
    const winRate = parseFloat(stats.winRate);
    const efficiency = parseFloat(stats.efficiency);
    const totalHunts = profile.totalHunts || 0;

    let rating = 0;
    let ratingText = "";
    let ratingEmoji = "";

    if (winRate >= 90) rating += 30;
    else if (winRate >= 75) rating += 25;
    else if (winRate >= 60) rating += 20;
    else if (winRate >= 45) rating += 15;
    else if (winRate >= 30) rating += 10;
    else rating += 5;

    if (totalHunts >= 100) rating += 25;
    else if (totalHunts >= 50) rating += 20;
    else if (totalHunts >= 25) rating += 15;
    else if (totalHunts >= 10) rating += 10;
    else rating += 5;

    if (efficiency >= 50) rating += 20;
    else if (efficiency >= 30) rating += 15;
    else if (efficiency >= 20) rating += 10;
    else rating += 5;

    const achievements = checkAchievements(profile);
    rating += achievements.unlockedAchievements.length * 2;

    if (rating >= 85) {
        ratingText = "Legendarny";
        ratingEmoji = "🏆";
    } else if (rating >= 70) {
        ratingText = "Ekspert";
        ratingEmoji = "⭐";
    } else if (rating >= 55) {
        ratingText = "Zaawansowany";
        ratingEmoji = "🎯";
    } else if (rating >= 40) {
        ratingText = "Średniozaawansowany";
        ratingEmoji = "📈";
    } else if (rating >= 25) {
        ratingText = "Początkujący";
        ratingEmoji = "🔰";
    } else {
        ratingText = "Nowicjusz";
        ratingEmoji = "🌱";
    }

    return {rating, ratingText, ratingEmoji};
};

const formatPlaytime = (minutes) => {
    const totalMinutes = minutes || 0;
    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;

    if (days > 0) {
        return `${days}d ${remainingHours}h ${mins}m`;
    } else if (hours > 0) {
        return `${hours}h ${mins}m`;
    } else {
        return `${mins}m`;
    }
};

const sanitizeFieldValue = (value, maxLength = 1024) => {
    if (!value || value.toString().trim().length === 0) {
        return "Brak danych";
    }

    const stringValue = value.toString();
    if (stringValue.length > maxLength) {
        return stringValue.substring(0, maxLength - 3) + "...";
    }

    return stringValue;
};

module.exports = {
    createProgressBar,
    createAdvancedProgressBar,
    calculateRank,
    getNextRank,
    checkAchievements,
    getSanityStatus,
    calculateAdvancedStats,
    getPerformanceRating,
    formatPlaytime,
    sanitizeFieldValue,
};
