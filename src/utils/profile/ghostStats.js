/**
 * Ghost Statistics Utilities
 * Contains functions for analyzing ghost encounters and statistics
 */

const { GHOST_TYPES } = require("./constants");
const { createProgressBar } = require("./calculations");

/**
 * Gets detailed ghost statistics for a profile
 */
const getDetailedGhostStats = (profile) => {
  const ghostStats = profile.ghostEncounters || {};
  const totalEncounters = Object.values(ghostStats).reduce(
    (sum, count) => sum + count,
    0
  );

  if (totalEncounters === 0) {
    return {
      text: "Brak danych - nie napotkano jeszcze żadnych duchów",
      mostCommon: null,
      rarest: null,
      totalTypes: 0,
      totalEncounters: 0,
    };
  }

  const sortedGhosts = Object.entries(ghostStats)
    .filter(([ghost, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  if (sortedGhosts.length === 0) {
    return {
      text: "Brak danych - nie napotkano jeszcze żadnych duchów",
      mostCommon: null,
      rarest: null,
      totalTypes: 0,
      totalEncounters: 0,
    };
  }

  const mostCommon = sortedGhosts[0];
  const rarest = sortedGhosts[sortedGhosts.length - 1];

  const topGhosts = sortedGhosts
    .slice(0, 5)
    .map(([ghost, count]) => {
      const percentage = ((count / totalEncounters) * 100).toFixed(1);
      const emoji = GHOST_TYPES[ghost] || "👻";
      const progressBar = createProgressBar(count, mostCommon[1], 8);
      return `${emoji} **${ghost}**: ${count}x (${percentage}%)\n\`${progressBar}\``;
    })
    .join("\n\n");

  const remainingGhosts = sortedGhosts.length > 5 ? sortedGhosts.slice(5) : [];
  const remainingText =
    remainingGhosts.length > 0
      ? `\n\n**Pozostałe duchy (${remainingGhosts.length}):**\n${remainingGhosts
          .map(
            ([ghost, count]) =>
              `${GHOST_TYPES[ghost] || "👻"} ${ghost}: ${count}x`
          )
          .join(", ")}`
      : "";

  return {
    text: topGhosts + remainingText,
    mostCommon: mostCommon
      ? { name: mostCommon[0], count: mostCommon[1] }
      : null,
    rarest: rarest ? { name: rarest[0], count: rarest[1] } : null,
    totalTypes: sortedGhosts.length,
    totalEncounters: totalEncounters,
  };
};

/**
 * Gets ghost category statistics
 */
const getGhostCategoryStats = (profile) => {
  const ghostStats = profile.ghostEncounters || {};

  const ghostCategories = {
    Podstawowe: ["Spirit", "Wraith", "Phantom", "Poltergeist"],
    Średnie: ["Banshee", "Jinn", "Mare", "Revenant", "Shade"],
    Zaawansowane: ["Demon", "Yurei", "Oni", "Yokai", "Hantu"],
    Rzadkie: ["Goryo", "Myling", "Onryo", "The Twins", "Raiju"],
    "Bardzo rzadkie": ["Obake", "The Mimic", "Moroi", "Deogen", "Thaye"],
  };

  const categoryStats = {};

  Object.entries(ghostCategories).forEach(([category, ghosts]) => {
    const encountered = ghosts.filter((ghost) => (ghostStats[ghost] || 0) > 0);
    const totalEncounters = ghosts.reduce(
      (sum, ghost) => sum + (ghostStats[ghost] || 0),
      0
    );

    categoryStats[category] = {
      encountered: encountered.length,
      total: ghosts.length,
      totalEncounters: totalEncounters,
      percentage: ((encountered.length / ghosts.length) * 100).toFixed(1),
    };
  });

  return categoryStats;
};

module.exports = {
  getDetailedGhostStats,
  getGhostCategoryStats,
};
