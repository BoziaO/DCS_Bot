const { EmbedBuilder } = require("discord.js");
const placeholderManager = require("./placeholderManager");

class WelcomeEmbedBuilder {
  constructor() {
    this.maxTitleLength = 256;
    this.maxDescriptionLength = 4096;
    this.maxFooterLength = 2048;
    this.maxFieldNameLength = 256;
    this.maxFieldValueLength = 1024;
    this.maxFieldsCount = 25;
    this.maxEmbedLength = 6000;
  }

  /**
   * Buduje embed powitalny
   */
  async buildWelcomeEmbed(config, member, additionalData = {}) {
    if (!config.welcomeMessage.embed.enabled) {
      return null;
    }

    const embedConfig = config.welcomeMessage.embed;
    const embed = new EmbedBuilder();

    try {
      if (embedConfig.title) {
        const title = await placeholderManager.replacePlaceholders(
          embedConfig.title,
          member,
          config.advanced.customPlaceholders,
          additionalData
        );
        embed.setTitle(this.truncateText(title, this.maxTitleLength));
      }

      if (embedConfig.description) {
        const description = await placeholderManager.replacePlaceholders(
          embedConfig.description,
          member,
          config.advanced.customPlaceholders,
          additionalData
        );
        embed.setDescription(
          this.truncateText(description, this.maxDescriptionLength)
        );
      }

      if (embedConfig.color) {
        const color = await placeholderManager.replacePlaceholders(
          embedConfig.color,
          member,
          config.advanced.customPlaceholders,
          additionalData
        );
        embed.setColor(this.validateColor(color));
      }

      if (embedConfig.thumbnail.enabled) {
        const thumbnailUrl = await this.getThumbnailUrl(
          embedConfig.thumbnail,
          member
        );
        if (thumbnailUrl) {
          embed.setThumbnail(thumbnailUrl);
        }
      }

      if (embedConfig.image.enabled && embedConfig.image.url) {
        const imageUrl = await placeholderManager.replacePlaceholders(
          embedConfig.image.url,
          member,
          config.advanced.customPlaceholders,
          additionalData
        );
        if (this.isValidUrl(imageUrl)) {
          embed.setImage(imageUrl);
        }
      }

      if (embedConfig.author.enabled && embedConfig.author.name) {
        const authorName = await placeholderManager.replacePlaceholders(
          embedConfig.author.name,
          member,
          config.advanced.customPlaceholders,
          additionalData
        );

        const authorOptions = {
          name: this.truncateText(authorName, this.maxTitleLength),
        };

        if (embedConfig.author.iconUrl) {
          const iconUrl = await placeholderManager.replacePlaceholders(
            embedConfig.author.iconUrl,
            member,
            config.advanced.customPlaceholders,
            additionalData
          );
          if (this.isValidUrl(iconUrl)) {
            authorOptions.iconURL = iconUrl;
          }
        }

        if (embedConfig.author.url) {
          const url = await placeholderManager.replacePlaceholders(
            embedConfig.author.url,
            member,
            config.advanced.customPlaceholders,
            additionalData
          );
          if (this.isValidUrl(url)) {
            authorOptions.url = url;
          }
        }

        embed.setAuthor(authorOptions);
      }

      if (embedConfig.fields && embedConfig.fields.length > 0) {
        const fields = await this.buildFields(
          embedConfig.fields,
          member,
          config.advanced.customPlaceholders,
          additionalData
        );
        fields.forEach((field) => embed.addFields(field));
      }

      if (embedConfig.footer.enabled && embedConfig.footer.text) {
        const footerText = await placeholderManager.replacePlaceholders(
          embedConfig.footer.text,
          member,
          config.advanced.customPlaceholders,
          additionalData
        );

        const footerOptions = {
          text: this.truncateText(footerText, this.maxFooterLength),
        };

        if (embedConfig.footer.iconUrl) {
          const iconUrl = await placeholderManager.replacePlaceholders(
            embedConfig.footer.iconUrl,
            member,
            config.advanced.customPlaceholders,
            additionalData
          );
          if (this.isValidUrl(iconUrl)) {
            footerOptions.iconURL = iconUrl;
          }
        }

        embed.setFooter(footerOptions);
      }

      if (embedConfig.timestamp) {
        embed.setTimestamp();
      }

      if (this.getEmbedLength(embed) > this.maxEmbedLength) {
        console.warn(
          "[EmbedBuilder] Embed exceeds maximum length, truncating..."
        );
        return this.truncateEmbed(embed);
      }

      return embed;
    } catch (error) {
      console.error("[EmbedBuilder] Error building welcome embed:", error);
      return this.buildErrorEmbed(member);
    }
  }

  /**
   * Buduje embed pożegnalny
   */
  async buildFarewellEmbed(config, member, additionalData = {}) {
    if (!config.farewellMessage.embed.enabled) {
      return null;
    }

    const embedConfig = config.farewellMessage.embed;
    const embed = new EmbedBuilder();

    try {
      if (embedConfig.title) {
        const title = await placeholderManager.replacePlaceholders(
          embedConfig.title,
          member,
          config.advanced.customPlaceholders,
          additionalData
        );
        embed.setTitle(this.truncateText(title, this.maxTitleLength));
      }

      if (embedConfig.description) {
        const description = await placeholderManager.replacePlaceholders(
          embedConfig.description,
          member,
          config.advanced.customPlaceholders,
          additionalData
        );
        embed.setDescription(
          this.truncateText(description, this.maxDescriptionLength)
        );
      }

      if (embedConfig.color) {
        embed.setColor(this.validateColor(embedConfig.color));
      }

      if (embedConfig.thumbnail.enabled) {
        const thumbnailUrl = await this.getThumbnailUrl(
          embedConfig.thumbnail,
          member
        );
        if (thumbnailUrl) {
          embed.setThumbnail(thumbnailUrl);
        }
      }

      if (embedConfig.footer.enabled && embedConfig.footer.text) {
        const footerText = await placeholderManager.replacePlaceholders(
          embedConfig.footer.text,
          member,
          config.advanced.customPlaceholders,
          additionalData
        );
        embed.setFooter({
          text: this.truncateText(footerText, this.maxFooterLength),
        });
      }

      if (embedConfig.timestamp) {
        embed.setTimestamp();
      }

      return embed;
    } catch (error) {
      console.error("[EmbedBuilder] Error building farewell embed:", error);
      return this.buildErrorEmbed(member, "farewell");
    }
  }

  /**
   * Buduje embed wiadomości prywatnej
   */
  async buildDirectMessageEmbed(config, member, additionalData = {}) {
    if (!config.directMessage.embed.enabled) {
      return null;
    }

    const embedConfig = config.directMessage.embed;
    const embed = new EmbedBuilder();

    try {
      if (embedConfig.title) {
        const title = await placeholderManager.replacePlaceholders(
          embedConfig.title,
          member,
          config.advanced.customPlaceholders,
          additionalData
        );
        embed.setTitle(this.truncateText(title, this.maxTitleLength));
      }

      if (embedConfig.description) {
        const description = await placeholderManager.replacePlaceholders(
          embedConfig.description,
          member,
          config.advanced.customPlaceholders,
          additionalData
        );
        embed.setDescription(
          this.truncateText(description, this.maxDescriptionLength)
        );
      }

      if (embedConfig.color) {
        embed.setColor(this.validateColor(embedConfig.color));
      }

      if (embedConfig.thumbnail.enabled) {
        const thumbnailUrl = await this.getThumbnailUrl(
          embedConfig.thumbnail,
          member
        );
        if (thumbnailUrl) {
          embed.setThumbnail(thumbnailUrl);
        }
      }

      if (embedConfig.footer.enabled && embedConfig.footer.text) {
        const footerText = await placeholderManager.replacePlaceholders(
          embedConfig.footer.text,
          member,
          config.advanced.customPlaceholders,
          additionalData
        );
        embed.setFooter({
          text: this.truncateText(footerText, this.maxFooterLength),
        });
      }

      return embed;
    } catch (error) {
      console.error("[EmbedBuilder] Error building DM embed:", error);
      return this.buildErrorEmbed(member, "dm");
    }
  }

  /**
   * Pobiera URL miniaturki na podstawie konfiguracji
   */
  async getThumbnailUrl(thumbnailConfig, member) {
    switch (thumbnailConfig.type) {
      case "user-avatar":
        return member.user.displayAvatarURL({ size: 256 });

      case "server-icon":
        return member.guild.iconURL({ size: 256 });

      case "custom":
        if (thumbnailConfig.customUrl) {
          const url = await placeholderManager.replacePlaceholders(
            thumbnailConfig.customUrl,
            member
          );
          return this.isValidUrl(url) ? url : null;
        }
        return null;

      default:
        return member.user.displayAvatarURL({ size: 256 });
    }
  }

  /**
   * Buduje pola embeda
   */
  async buildFields(fieldsConfig, member, customPlaceholders, additionalData) {
    const fields = [];

    for (
      let i = 0;
      i < Math.min(fieldsConfig.length, this.maxFieldsCount);
      i++
    ) {
      const fieldConfig = fieldsConfig[i];

      if (!fieldConfig.name || !fieldConfig.value) continue;

      const name = await placeholderManager.replacePlaceholders(
        fieldConfig.name,
        member,
        customPlaceholders,
        additionalData
      );

      const value = await placeholderManager.replacePlaceholders(
        fieldConfig.value,
        member,
        customPlaceholders,
        additionalData
      );

      fields.push({
        name: this.truncateText(name, this.maxFieldNameLength),
        value: this.truncateText(value, this.maxFieldValueLength),
        inline: fieldConfig.inline || false,
      });
    }

    return fields;
  }

  /**
   * Buduje embed błędu
   */
  buildErrorEmbed(member, type = "welcome") {
    const embed = new EmbedBuilder()
      .setTitle("⚠️ Błąd konfiguracji")
      .setDescription(
        `Wystąpił błąd podczas generowania wiadomości ${
          type === "welcome"
            ? "powitalnej"
            : type === "farewell"
            ? "pożegnalnej"
            : "prywatnej"
        }.`
      )
      .setColor("#ff0000")
      .setTimestamp();

    if (type === "welcome") {
      embed.addFields({
        name: "Użytkownik",
        value: member.toString(),
        inline: true,
      });
    }

    return embed;
  }

  /**
   * Waliduje kolor
   */
  validateColor(color) {
    if (!color) return "#0099ff";

    if (/^#[0-9A-F]{6}$/i.test(color)) {
      return color;
    }

    const colorMap = {
      red: "#ff0000",
      green: "#00ff00",
      blue: "#0000ff",
      yellow: "#ffff00",
      purple: "#800080",
      orange: "#ffa500",
      pink: "#ffc0cb",
      cyan: "#00ffff",
      magenta: "#ff00ff",
      lime: "#00ff00",
      indigo: "#4b0082",
      violet: "#8a2be2",
      brown: "#a52a2a",
      black: "#000000",
      white: "#ffffff",
      gray: "#808080",
      grey: "#808080",
    };

    return colorMap[color.toLowerCase()] || "#0099ff";
  }

  /**
   * Sprawdza czy URL jest prawidłowy
   */
  isValidUrl(url) {
    try {
      new URL(url);
      return url.startsWith("http://") || url.startsWith("https://");
    } catch {
      return false;
    }
  }

  /**
   * Obcina tekst do określonej długości
   */
  truncateText(text, maxLength) {
    if (!text || text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + "...";
  }

  /**
   * Oblicza długość embeda
   */
  getEmbedLength(embed) {
    let length = 0;

    const data = embed.toJSON();

    if (data.title) length += data.title.length;
    if (data.description) length += data.description.length;
    if (data.footer?.text) length += data.footer.text.length;
    if (data.author?.name) length += data.author.name.length;

    if (data.fields) {
      data.fields.forEach((field) => {
        length += field.name.length + field.value.length;
      });
    }

    return length;
  }

  /**
   * Obcina embed jeśli jest za długi
   */
  truncateEmbed(embed) {
    const data = embed.toJSON();

    if (data.description && data.description.length > 2000) {
      embed.setDescription(this.truncateText(data.description, 2000));
    }

    if (data.fields && data.fields.length > 10) {
      const truncatedFields = data.fields.slice(0, 10);
      embed.setFields(truncatedFields);
    }

    return embed;
  }

  /**
   * Tworzy podgląd embeda
   */
  async createPreview(config, sampleMember, type = "welcome") {
    switch (type) {
      case "welcome":
        return await this.buildWelcomeEmbed(config, sampleMember);
      case "farewell":
        return await this.buildFarewellEmbed(config, sampleMember);
      case "dm":
        return await this.buildDirectMessageEmbed(config, sampleMember);
      default:
        return await this.buildWelcomeEmbed(config, sampleMember);
    }
  }
}

const welcomeEmbedBuilder = new WelcomeEmbedBuilder();

module.exports = welcomeEmbedBuilder;
