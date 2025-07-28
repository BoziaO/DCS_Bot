/**
 * Parse duration string to milliseconds
 * @param {string} duration - Duration string (e.g., '1h', '30m', '24h')
 * @returns {number} Duration in milliseconds
 */
const parseDuration = (duration) => {
  if (!duration || typeof duration !== "string") {
    return 0;
  }

  const timeUnits = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };

  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) {
    return 0;
  }

  const [, amount, unit] = match;
  return parseInt(amount) * (timeUnits[unit] || 0);
};

/**
 * Format duration from milliseconds to human readable string
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration string
 */
const formatDuration = (ms) => {
  if (!ms || ms <= 0) {
    return "0 sekund";
  }

  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    const remainingHours = hours % 24;
    const remainingMinutes = minutes % 60;

    let result = `${days} ${days === 1 ? "dzień" : "dni"}`;
    if (remainingHours > 0) {
      result += ` ${remainingHours} ${
        remainingHours === 1 ? "godzina" : "godzin"
      }`;
    }
    if (remainingMinutes > 0) {
      result += ` ${remainingMinutes} ${
        remainingMinutes === 1 ? "minuta" : "minut"
      }`;
    }
    return result;
  }

  if (hours > 0) {
    const remainingMinutes = minutes % 60;
    const remainingSeconds = seconds % 60;

    let result = `${hours} ${hours === 1 ? "godzina" : "godzin"}`;
    if (remainingMinutes > 0) {
      result += ` ${remainingMinutes} ${
        remainingMinutes === 1 ? "minuta" : "minut"
      }`;
    }
    if (remainingSeconds > 0 && remainingMinutes === 0) {
      result += ` ${remainingSeconds} ${
        remainingSeconds === 1 ? "sekunda" : "sekund"
      }`;
    }
    return result;
  }

  if (minutes > 0) {
    const remainingSeconds = seconds % 60;

    let result = `${minutes} ${minutes === 1 ? "minuta" : "minut"}`;
    if (remainingSeconds > 0) {
      result += ` ${remainingSeconds} ${
        remainingSeconds === 1 ? "sekunda" : "sekund"
      }`;
    }
    return result;
  }

  return `${seconds} ${seconds === 1 ? "sekunda" : "sekund"}`;
};

/**
 * Get time until next occurrence of specific hour (in UTC)
 * @param {number} hour - Hour (0-23)
 * @returns {number} Milliseconds until next occurrence
 */
const getTimeUntilHour = (hour) => {
  const now = new Date();
  const target = new Date();
  target.setUTCHours(hour, 0, 0, 0);

  if (target <= now) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return target.getTime() - now.getTime();
};

/**
 * Check if enough time has passed since last action
 * @param {Date|number} lastTime - Last action time
 * @param {number} cooldownMs - Cooldown in milliseconds
 * @returns {boolean} True if cooldown has passed
 */
const hasCooldownPassed = (lastTime, cooldownMs) => {
  if (!lastTime) return true;

  const lastTimeMs = lastTime instanceof Date ? lastTime.getTime() : lastTime;
  return Date.now() - lastTimeMs >= cooldownMs;
};

/**
 * Get remaining cooldown time
 * @param {Date|number} lastTime - Last action time
 * @param {number} cooldownMs - Cooldown in milliseconds
 * @returns {number} Remaining cooldown in milliseconds (0 if no cooldown)
 */
const getRemainingCooldown = (lastTime, cooldownMs) => {
  if (!lastTime) return 0;

  const lastTimeMs = lastTime instanceof Date ? lastTime.getTime() : lastTime;
  const remaining = cooldownMs - (Date.now() - lastTimeMs);
  return Math.max(0, remaining);
};

module.exports = {
  parseDuration,
  formatDuration,
  getTimeUntilHour,
  hasCooldownPassed,
  getRemainingCooldown,
};
