class PlaceholderManager {
  constructor() {
    this.basePlaceholders = {
      "{mention-member}": (member) => member.toString(),
      "{username}": (member) => member.user.username,
      "{user-tag}": (member) => member.user.tag,
      "{user-id}": (member) => member.user.id,
      "{user-discriminator}": (member) => member.user.discriminator,
      "{user-avatar}": (member) => member.user.displayAvatarURL({ size: 256 }),
      "{user-created}": (member) =>
        member.user.createdAt.toLocaleDateString("pl-PL"),
      "{user-joined}": (member) =>
        member.joinedAt
          ? member.joinedAt.toLocaleDateString("pl-PL")
          : "Nieznana",
      "{user-nickname}": (member) => member.nickname || member.user.username,
      "{user-display-name}": (member) => member.displayName,

      "{server-name}": (member) => member.guild.name,
      "{server-id}": (member) => member.guild.id,
      "{server-icon}": (member) => member.guild.iconURL({ size: 256 }) || "",
      "{server-owner}": (member) => member.guild.ownerId,
      "{server-created}": (member) =>
        member.guild.createdAt.toLocaleDateString("pl-PL"),
      "{server-boost-level}": (member) => member.guild.premiumTier,
      "{server-boost-count}": (member) =>
        member.guild.premiumSubscriptionCount || 0,
      "{server-verification}": (member) =>
        this.getVerificationLevel(member.guild.verificationLevel),

      "{member-count}": (member) => member.guild.memberCount.toString(),
      "{member-count-ordinal}": (member) =>
        this.getOrdinal(member.guild.memberCount),
      "{human-count}": (member) =>
        member.guild.members.cache.filter((m) => !m.user.bot).size.toString(),
      "{bot-count}": (member) =>
        member.guild.members.cache.filter((m) => m.user.bot).size.toString(),
      "{online-count}": (member) =>
        member.guild.members.cache
          .filter((m) => m.presence?.status === "online")
          .size.toString(),

      "{date}": () => new Date().toLocaleDateString("pl-PL"),
      "{time}": () => new Date().toLocaleTimeString("pl-PL"),
      "{datetime}": () => new Date().toLocaleString("pl-PL"),
      "{timestamp}": () => Math.floor(Date.now() / 1000).toString(),
      "{year}": () => new Date().getFullYear().toString(),
      "{month}": () => (new Date().getMonth() + 1).toString(),
      "{day}": () => new Date().getDate().toString(),
      "{weekday}": () => this.getWeekday(),

      "{total-channels}": (member) =>
        member.guild.channels.cache.size.toString(),
      "{text-channels}": (member) =>
        member.guild.channels.cache.filter((c) => c.type === 0).size.toString(),
      "{voice-channels}": (member) =>
        member.guild.channels.cache.filter((c) => c.type === 2).size.toString(),
      "{category-channels}": (member) =>
        member.guild.channels.cache.filter((c) => c.type === 4).size.toString(),

      "{total-roles}": (member) => member.guild.roles.cache.size.toString(),
      "{member-roles}": (member) =>
        member.roles.cache
          .filter((r) => r.id !== member.guild.id)
          .map((r) => r.name)
          .join(", ") || "Brak ról",
      "{member-role-count}": (member) =>
        (member.roles.cache.size - 1).toString(),
      "{highest-role}": (member) => member.roles.highest.name,
      "{highest-role-color}": (member) => member.roles.highest.hexColor,

      "{wave}": () => "👋",
      "{party}": () => "🎉",
      "{heart}": () => "❤️",
      "{star}": () => "⭐",
      "{fire}": () => "🔥",
      "{crown}": () => "👑",
      "{gem}": () => "💎",
      "{rocket}": () => "🚀",

      "{random-color}": () =>
        "#" + Math.floor(Math.random() * 16777215).toString(16),
      "{random-number}": () => Math.floor(Math.random() * 1000).toString(),
      "{random-emoji}": () => this.getRandomEmoji(),
    };

    this.advancedPlaceholders = {
      "{member-position}": async (member) => {
        const members = await member.guild.members.fetch();
        const sorted = members.sort((a, b) => a.joinedAt - b.joinedAt);
        const position = sorted.findIndex((m) => m.id === member.id) + 1;
        return position.toString();
      },
      "{invite-code}": async (member, guild, inviteCode) => {
        return inviteCode || "Nieznany";
      },
      "{inviter}": async (member, guild, inviteCode, inviter) => {
        return inviter ? inviter.username : "Nieznany";
      },
    };
  }

  /**
   * Zastępuje wszystkie placeholdery w tekście
   */
  async replacePlaceholders(
    text,
    member,
    customPlaceholders = [],
    additionalData = {}
  ) {
    if (!text || typeof text !== "string") return text;

    let result = text;

    for (const [placeholder, replacer] of Object.entries(
      this.basePlaceholders
    )) {
      if (result.includes(placeholder)) {
        try {
          const replacement =
            typeof replacer === "function" ? replacer(member) : replacer;
          result = result.replace(
            new RegExp(this.escapeRegex(placeholder), "g"),
            replacement
          );
        } catch (error) {
          console.error(`Error replacing placeholder ${placeholder}:`, error);
          result = result.replace(
            new RegExp(this.escapeRegex(placeholder), "g"),
            "Error"
          );
        }
      }
    }

    for (const [placeholder, replacer] of Object.entries(
      this.advancedPlaceholders
    )) {
      if (result.includes(placeholder)) {
        try {
          const replacement = await replacer(
            member,
            member.guild,
            additionalData.inviteCode,
            additionalData.inviter
          );
          result = result.replace(
            new RegExp(this.escapeRegex(placeholder), "g"),
            replacement
          );
        } catch (error) {
          console.error(
            `Error replacing advanced placeholder ${placeholder}:`,
            error
          );
          result = result.replace(
            new RegExp(this.escapeRegex(placeholder), "g"),
            "Error"
          );
        }
      }
    }

    if (customPlaceholders && customPlaceholders.length > 0) {
      for (const custom of customPlaceholders) {
        if (custom.name && custom.value && result.includes(custom.name)) {
          const customReplacement = await this.replacePlaceholders(
            custom.value,
            member,
            [],
            additionalData
          );
          result = result.replace(
            new RegExp(this.escapeRegex(custom.name), "g"),
            customReplacement
          );
        }
      }
    }

    return result;
  }

  /**
   * Pobiera listę dostępnych placeholderów
   */
  getAvailablePlaceholders() {
    const basic = Object.keys(this.basePlaceholders);
    const advanced = Object.keys(this.advancedPlaceholders);

    return {
      basic: basic.sort(),
      advanced: advanced.sort(),
      all: [...basic, ...advanced].sort(),
    };
  }

  /**
   * Sprawdza czy tekst zawiera placeholdery
   */
  hasPlaceholders(text) {
    if (!text || typeof text !== "string") return false;

    const allPlaceholders = [
      ...Object.keys(this.basePlaceholders),
      ...Object.keys(this.advancedPlaceholders),
    ];
    return allPlaceholders.some((placeholder) => text.includes(placeholder));
  }

  /**
   * Waliduje placeholdery w tekście
   */
  validatePlaceholders(text) {
    if (!text || typeof text !== "string") return { valid: true, errors: [] };

    const errors = [];
    const placeholderRegex = /\{[^}]+\}/g;
    const foundPlaceholders = text.match(placeholderRegex) || [];
    const validPlaceholders = [
      ...Object.keys(this.basePlaceholders),
      ...Object.keys(this.advancedPlaceholders),
    ];

    for (const placeholder of foundPlaceholders) {
      if (!validPlaceholders.includes(placeholder)) {
        errors.push(`Nieznany placeholder: ${placeholder}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors,
      foundPlaceholders: foundPlaceholders,
      validPlaceholders: foundPlaceholders.filter((p) =>
        validPlaceholders.includes(p)
      ),
    };
  }

  /**
   * Generuje podgląd z przykładowymi danymi
   */
  generatePreview(text, sampleMember) {
    if (!text || !sampleMember) return text;

    return this.replacePlaceholders(text, sampleMember);
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  getOrdinal(number) {
    const suffixes = ["ty", "szy", "gi", "ci"];
    const lastDigit = number % 10;
    const lastTwoDigits = number % 100;

    if (lastTwoDigits >= 11 && lastTwoDigits <= 13) {
      return number + "ty";
    }

    switch (lastDigit) {
      case 1:
        return number + "szy";
      case 2:
      case 3:
      case 4:
        return number + "ci";
      default:
        return number + "ty";
    }
  }

  getVerificationLevel(level) {
    const levels = {
      0: "Brak",
      1: "Niski",
      2: "Średni",
      3: "Wysoki",
      4: "Najwyższy",
    };
    return levels[level] || "Nieznany";
  }

  getWeekday() {
    const days = [
      "Niedziela",
      "Poniedziałek",
      "Wtorek",
      "Środa",
      "Czwartek",
      "Piątek",
      "Sobota",
    ];
    return days[new Date().getDay()];
  }

  getRandomEmoji() {
    const emojis = [
      "😀",
      "😃",
      "😄",
      "😁",
      "😆",
      "😅",
      "🤣",
      "😂",
      "🙂",
      "🙃",
      "😉",
      "😊",
      "😇",
      "🥰",
      "😍",
      "🤩",
      "😘",
      "😗",
      "😚",
      "😙",
      "😋",
      "😛",
      "😜",
      "🤪",
      "😝",
      "🤑",
      "🤗",
      "🤭",
      "🤫",
      "🤔",
      "🤐",
      "🤨",
      "😐",
      "😑",
      "😶",
      "😏",
      "😒",
      "🙄",
      "😬",
      "🤥",
      "😌",
      "😔",
      "😪",
      "🤤",
      "😴",
    ];
    return emojis[Math.floor(Math.random() * emojis.length)];
  }

  /**
   * Tworzy dokumentację placeholderów
   */
  generateDocumentation() {
    const categories = {
      Użytkownik: [
        "{mention-member}",
        "{username}",
        "{user-tag}",
        "{user-id}",
        "{user-discriminator}",
        "{user-avatar}",
        "{user-created}",
        "{user-joined}",
        "{user-nickname}",
        "{user-display-name}",
      ],
      Serwer: [
        "{server-name}",
        "{server-id}",
        "{server-icon}",
        "{server-owner}",
        "{server-created}",
        "{server-boost-level}",
        "{server-boost-count}",
        "{server-verification}",
      ],
      Członkowie: [
        "{member-count}",
        "{member-count-ordinal}",
        "{human-count}",
        "{bot-count}",
        "{online-count}",
      ],
      "Data i czas": [
        "{date}",
        "{time}",
        "{datetime}",
        "{timestamp}",
        "{year}",
        "{month}",
        "{day}",
        "{weekday}",
      ],
      Kanały: [
        "{total-channels}",
        "{text-channels}",
        "{voice-channels}",
        "{category-channels}",
      ],
      Role: [
        "{total-roles}",
        "{member-roles}",
        "{member-role-count}",
        "{highest-role}",
        "{highest-role-color}",
      ],
      Emoji: [
        "{wave}",
        "{party}",
        "{heart}",
        "{star}",
        "{fire}",
        "{crown}",
        "{gem}",
        "{rocket}",
      ],
      Losowe: ["{random-color}", "{random-number}", "{random-emoji}"],
      Zaawansowane: ["{member-position}", "{invite-code}", "{inviter}"],
    };

    return categories;
  }
}

const placeholderManager = new PlaceholderManager();

module.exports = placeholderManager;
