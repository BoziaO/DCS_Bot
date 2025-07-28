const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const AutoModConfig = require("../../models/AutoModConfig");
const Warning = require("../../models/Warning");
const { parseDuration } = require("../../utils/time");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("automod")
    .setDescription("Zarządza systemem automatycznej moderacji.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .setDMPermission(false)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("add-rule")
        .setDescription("Dodaje lub aktualizuje regułę AutoMod.")
        .addIntegerOption((option) =>
          option
            .setName("ostrzezenia")
            .setDescription("Liczba ostrzeżeń do aktywacji reguły.")
            .setRequired(true)
            .setMinValue(1)
        )
        .addStringOption((option) =>
          option
            .setName("akcja")
            .setDescription("Akcja do wykonania.")
            .setRequired(true)
            .addChoices(
              { name: "Wycisz (Mute)", value: "mute" },
              { name: "Wyrzuć (Kick)", value: "kick" },
              { name: "Zbanuj (Ban)", value: "ban" }
            )
        )
        .addStringOption((option) =>
          option
            .setName("czas")
            .setDescription("Czas trwania (tylko dla Mute, np. 1h, 30m).")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove-rule")
        .setDescription("Usuwa regułę AutoMod.")
        .addIntegerOption((option) =>
          option
            .setName("ostrzezenia")
            .setDescription("Liczba ostrzeżeń w regule do usunięcia.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list-rules")
        .setDescription("Wyświetla wszystkie aktywne reguły AutoMod.")
    ),

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();
    const guildId = interaction.guild.id;

    if (subcommand === "add-rule") {
      await this.handleAddRule(interaction, guildId);
    } else if (subcommand === "remove-rule") {
      await this.handleRemoveRule(interaction, guildId);
    } else if (subcommand === "list-rules") {
      await this.handleListRules(interaction, guildId);
    }
  },

  async handleAddRule(interaction, guildId) {
    const warnings = interaction.options.getInteger("ostrzezenia");
    const action = interaction.options.getString("akcja");
    const duration = interaction.options.getString("czas");

    if (action === "mute") {
      if (!duration || !parseDuration(duration)) {
        return interaction.reply({
          content:
            'Dla akcji "Wycisz" musisz podać prawidłowy czas trwania (np. 10m, 1h).',
          ephemeral: true,
        });
      }
      if (parseDuration(duration) > parseDuration("28d")) {
        return interaction.reply({
          content: "Czas wyciszenia nie może przekraczać 28 dni.",
          ephemeral: true,
        });
      }
    }

    const newRule = {
      warnings,
      action,
      duration: action === "mute" ? duration : undefined,
    };

    await AutoModConfig.findOneAndUpdate(
      { guildId },
      { $pull: { rules: { warnings: warnings } } }
    );

    await AutoModConfig.findOneAndUpdate(
      { guildId },
      { $push: { rules: newRule } },
      { upsert: true, new: true }
    );

    const embed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("✅ Dodano/Zaktualizowano Regułę AutoMod")
      .setDescription(
        `Pomyślnie ustawiono nową regułę: **Po ${warnings} ostrzeżeniach → ${action.toUpperCase()}** ${
          duration ? `na ${duration}` : ""
        }.`
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },

  async handleRemoveRule(interaction, guildId) {
    const warnings = interaction.options.getInteger("ostrzezenia");

    const result = await AutoModConfig.findOneAndUpdate(
      { guildId },
      { $pull: { rules: { warnings: warnings } } }
    );

    if (!result || !result.rules.some((r) => r.warnings === warnings)) {
      return interaction.reply({
        content: `Nie znaleziono reguły dla **${warnings}** ostrzeżeń.`,
        ephemeral: true,
      });
    }

    await interaction.reply({
      content: `✅ Pomyślnie usunięto regułę dla **${warnings}** ostrzeżeń.`,
      ephemeral: true,
    });
  },

  async handleListRules(interaction, guildId) {
    const config = await AutoModConfig.findOne({ guildId });

    if (!config || config.rules.length === 0) {
      return interaction.reply({
        content: "Na tym serwerze nie skonfigurowano żadnych reguł AutoMod.",
        ephemeral: true,
      });
    }

    const sortedRules = config.rules.sort((a, b) => a.warnings - b.warnings);

    const description = sortedRules
      .map((rule) => {
        let actionText = `→ **${rule.action.toUpperCase()}**`;
        if (rule.action === "mute") {
          actionText += ` na **${rule.duration}**`;
        }
        return `Po **${rule.warnings}** ostrzeżeniach ${actionText}`;
      })
      .join("\n");

    const embed = new EmbedBuilder()
      .setTitle("📜 Reguły Automoderacji")
      .setDescription(description)
      .setColor("#3498db")
      .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
  },
};
