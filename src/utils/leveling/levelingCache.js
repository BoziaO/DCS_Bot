const NodeCache = require("node-cache");

class LevelingCache {
  constructor() {
    this.profileCache = new NodeCache({
      stdTTL: 300,
      checkperiod: 60,
      useClones: false,
    });

    this.leaderboardCache = new NodeCache({
      stdTTL: 600,
      checkperiod: 120,
      useClones: false,
    });

    this.configCache = new NodeCache({
      stdTTL: 1800,
      checkperiod: 300,
      useClones: false,
    });

    this.statsCache = new NodeCache({
      stdTTL: 120,
      checkperiod: 60,
      useClones: false,
    });

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };

    this.setupEventListeners();
  }

  /**
   * Konfiguruje nasłuchiwanie zdarzeń cache
   */
  setupEventListeners() {
    this.profileCache.on("hit", () => this.stats.hits++);
    this.profileCache.on("miss", () => this.stats.misses++);
    this.profileCache.on("set", () => this.stats.sets++);
    this.profileCache.on("del", () => this.stats.deletes++);

    this.leaderboardCache.on("hit", () => this.stats.hits++);
    this.leaderboardCache.on("miss", () => this.stats.misses++);
    this.leaderboardCache.on("set", () => this.stats.sets++);
    this.leaderboardCache.on("del", () => this.stats.deletes++);

    this.configCache.on("hit", () => this.stats.hits++);
    this.configCache.on("miss", () => this.stats.misses++);
    this.configCache.on("set", () => this.stats.sets++);
    this.configCache.on("del", () => this.stats.deletes++);

    this.statsCache.on("hit", () => this.stats.hits++);
    this.statsCache.on("miss", () => this.stats.misses++);
    this.statsCache.on("set", () => this.stats.sets++);
    this.statsCache.on("del", () => this.stats.deletes++);
  }

  /**
   * Pobiera profil z cache
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @returns {Object|null} Profil użytkownika
   */
  getProfile(userId, guildId) {
    const key = `profile:${guildId}:${userId}`;
    return this.profileCache.get(key);
  }

  /**
   * Zapisuje profil do cache
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   * @param {Object} profile - Profil użytkownika
   * @param {number} ttl - Czas życia w sekundach (opcjonalny)
   */
  setProfile(userId, guildId, profile, ttl = null) {
    const key = `profile:${guildId}:${userId}`;
    if (ttl) {
      this.profileCache.set(key, profile, ttl);
    } else {
      this.profileCache.set(key, profile);
    }
  }

  /**
   * Usuwa profil z cache
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   */
  deleteProfile(userId, guildId) {
    const key = `profile:${guildId}:${userId}`;
    this.profileCache.del(key);
  }

  /**
   * Pobiera ranking z cache
   * @param {string} guildId - ID serwera
   * @param {string} type - Typ rankingu (xp, level, prestige)
   * @returns {Array|null} Ranking
   */
  getLeaderboard(guildId, type = "xp") {
    const key = `leaderboard:${guildId}:${type}`;
    return this.leaderboardCache.get(key);
  }

  /**
   * Zapisuje ranking do cache
   * @param {string} guildId - ID serwera
   * @param {string} type - Typ rankingu
   * @param {Array} leaderboard - Ranking
   * @param {number} ttl - Czas życia w sekundach (opcjonalny)
   */
  setLeaderboard(guildId, type, leaderboard, ttl = null) {
    const key = `leaderboard:${guildId}:${type}`;
    if (ttl) {
      this.leaderboardCache.set(key, leaderboard, ttl);
    } else {
      this.leaderboardCache.set(key, leaderboard);
    }
  }

  /**
   * Usuwa ranking z cache
   * @param {string} guildId - ID serwera
   * @param {string} type - Typ rankingu
   */
  deleteLeaderboard(guildId, type = null) {
    if (type) {
      const key = `leaderboard:${guildId}:${type}`;
      this.leaderboardCache.del(key);
    } else {
      const keys = this.leaderboardCache
        .keys()
        .filter((key) => key.startsWith(`leaderboard:${guildId}:`));
      this.leaderboardCache.del(keys);
    }
  }

  /**
   * Pobiera konfigurację z cache
   * @param {string} guildId - ID serwera
   * @param {string} type - Typ konfiguracji
   * @returns {Object|null} Konfiguracja
   */
  getConfig(guildId, type) {
    const key = `config:${guildId}:${type}`;
    return this.configCache.get(key);
  }

  /**
   * Zapisuje konfigurację do cache
   * @param {string} guildId - ID serwera
   * @param {string} type - Typ konfiguracji
   * @param {Object} config - Konfiguracja
   * @param {number} ttl - Czas życia w sekundach (opcjonalny)
   */
  setConfig(guildId, type, config, ttl = null) {
    const key = `config:${guildId}:${type}`;
    if (ttl) {
      this.configCache.set(key, config, ttl);
    } else {
      this.configCache.set(key, config);
    }
  }

  /**
   * Usuwa konfigurację z cache
   * @param {string} guildId - ID serwera
   * @param {string} type - Typ konfiguracji
   */
  deleteConfig(guildId, type) {
    const key = `config:${guildId}:${type}`;
    this.configCache.del(key);
  }

  /**
   * Pobiera statystyki z cache
   * @param {string} key - Klucz statystyk
   * @returns {Object|null} Statystyki
   */
  getStats(key) {
    return this.statsCache.get(key);
  }

  /**
   * Zapisuje statystyki do cache
   * @param {string} key - Klucz statystyk
   * @param {Object} stats - Statystyki
   * @param {number} ttl - Czas życia w sekundach (opcjonalny)
   */
  setStats(key, stats, ttl = null) {
    if (ttl) {
      this.statsCache.set(key, stats, ttl);
    } else {
      this.statsCache.set(key, stats);
    }
  }

  /**
   * Usuwa statystyki z cache
   * @param {string} key - Klucz statystyk
   */
  deleteStats(key) {
    this.statsCache.del(key);
  }

  /**
   * Invaliduje cache dla użytkownika (usuwa wszystkie powiązane dane)
   * @param {string} userId - ID użytkownika
   * @param {string} guildId - ID serwera
   */
  invalidateUser(userId, guildId) {
    this.deleteProfile(userId, guildId);

    this.deleteLeaderboard(guildId);

    const userStatsKeys = this.statsCache
      .keys()
      .filter((key) => key.includes(userId) || key.includes(`user:${userId}`));
    this.statsCache.del(userStatsKeys);
  }

  /**
   * Invaliduje cache dla całego serwera
   * @param {string} guildId - ID serwera
   */
  invalidateGuild(guildId) {
    const profileKeys = this.profileCache
      .keys()
      .filter((key) => key.startsWith(`profile:${guildId}:`));
    this.profileCache.del(profileKeys);

    this.deleteLeaderboard(guildId);

    const configKeys = this.configCache
      .keys()
      .filter((key) => key.startsWith(`config:${guildId}:`));
    this.configCache.del(configKeys);

    const statsKeys = this.statsCache
      .keys()
      .filter(
        (key) => key.includes(guildId) || key.includes(`guild:${guildId}`)
      );
    this.statsCache.del(statsKeys);
  }

  /**
   * Pobiera statystyki cache
   * @returns {Object} Statystyki cache
   */
  getCacheStats() {
    const hitRate =
      this.stats.hits + this.stats.misses > 0
        ? (
            (this.stats.hits / (this.stats.hits + this.stats.misses)) *
            100
          ).toFixed(2)
        : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      profileCache: {
        keys: this.profileCache.keys().length,
        stats: this.profileCache.getStats(),
      },
      leaderboardCache: {
        keys: this.leaderboardCache.keys().length,
        stats: this.leaderboardCache.getStats(),
      },
      configCache: {
        keys: this.configCache.keys().length,
        stats: this.configCache.getStats(),
      },
      statsCache: {
        keys: this.statsCache.keys().length,
        stats: this.statsCache.getStats(),
      },
    };
  }

  /**
   * Czyści wszystkie cache
   */
  clearAll() {
    this.profileCache.flushAll();
    this.leaderboardCache.flushAll();
    this.configCache.flushAll();
    this.statsCache.flushAll();

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };
  }

  /**
   * Optymalizuje cache (usuwa wygasłe klucze)
   */
  optimize() {
    this.profileCache.keys();
    this.leaderboardCache.keys();
    this.configCache.keys();
    this.statsCache.keys();
  }
  /**
   * Pobiera informacje o pamięci używanej przez cache
   * @returns {Object} Informacje o pamięci
   */
  getMemoryUsage() {
    const process = require("process");
    const memUsage = process.memoryUsage();

    return {
      rss: `${Math.round((memUsage.rss / 1024 / 1024) * 100) / 100} MB`,
      heapTotal: `${
        Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100
      } MB`,
      heapUsed: `${
        Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100
      } MB`,
      external: `${
        Math.round((memUsage.external / 1024 / 1024) * 100) / 100
      } MB`,
    };
  }

  /**
   * Inicjalizuje cache - preładowuje często używane dane
   * @returns {Promise<void>}
   */
  async initialize() {
    console.log("[LevelingCache] Initializing cache...");

    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };

    console.log("[LevelingCache] Initialization complete");
  }
}

const levelingCache = new LevelingCache();

module.exports = levelingCache;
