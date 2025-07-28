const {
  SlashCommandBuilder,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
} = require("discord.js");
const WelcomeConfig = require("../../models/WelcomeConfig");
const welcomeCache = require("../../utils/welcome/welcomeCache");
const embedBuilder = require("../../utils/welcome/embedBuilder");
const placeholderManager = require("../../utils/welcome/placeholderManager");
const welcomeManager = require("../../utils/welcome/welcomeManager");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("welcome-system")
    .setDescription("Zaawansowane zarządzanie systemem powitań")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommandGroup((group) =>
      group
        .setName("setup")
        .setDescription("Konfiguracja systemu powitań")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("welcome")
            .setDescription("Skonfiguruj wiadomości powitalne")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("Kanał dla wiadomości powitalnych")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("farewell")
            .setDescription("Skonfiguruj wiadomości pożegnalne")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("Kanał dla wiadomości pożegnalnych")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("autoroles")
            .setDescription("Skonfiguruj automatyczne role")
            .addRoleOption((option) =>
              option
                .setName("role1")
                .setDescription("Pierwsza rola do nadania")
                .setRequired(true)
            )
            .addRoleOption((option) =>
              option
                .setName("role2")
                .setDescription("Druga rola do nadania")
                .setRequired(false)
            )
            .addRoleOption((option) =>
              option
                .setName("role3")
                .setDescription("Trzecia rola do nadania")
                .setRequired(false)
            )
            .addIntegerOption((option) =>
              option
                .setName("delay")
                .setDescription("Opóźnienie w sekundach (0 = natychmiast)")
                .setMinValue(0)
                .setMaxValue(3600)
                .setRequired(false)
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("config")
        .setDescription("Konfiguracja wiadomości")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("embed")
            .setDescription("Skonfiguruj wygląd embeda")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("Kanał do konfiguracji")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
            .addStringOption((option) =>
              option
                .setName("title")
                .setDescription("Tytuł embeda")
                .setRequired(false)
            )
            .addStringOption((option) =>
              option
                .setName("description")
                .setDescription("Opis embeda")
                .setRequired(false)
            )
            .addStringOption((option) =>
              option
                .setName("color")
                .setDescription("Kolor embeda (hex lub nazwa)")
                .setRequired(false)
            )
            .addStringOption((option) =>
              option
                .setName("footer")
                .setDescription("Stopka embeda")
                .setRequired(false)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("filters")
            .setDescription("Skonfiguruj filtry powitań")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("Kanał do konfiguracji")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
            .addIntegerOption((option) =>
              option
                .setName("min_account_age")
                .setDescription("Minimalny wiek konta w dniach")
                .setMinValue(0)
                .setMaxValue(365)
                .setRequired(false)
            )
            .addIntegerOption((option) =>
              option
                .setName("cooldown")
                .setDescription("Cooldown między powitaniami w sekundach")
                .setMinValue(0)
                .setMaxValue(3600)
                .setRequired(false)
            )
            .addBooleanOption((option) =>
              option
                .setName("ignore_bots")
                .setDescription("Ignoruj boty")
                .setRequired(false)
            )
        )
    )
    .addSubcommandGroup((group) =>
      group
        .setName("manage")
        .setDescription("Zarządzanie systemem")
        .addSubcommand((subcommand) =>
          subcommand
            .setName("list")
            .setDescription("Lista konfiguracji powitań")
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("test")
            .setDescription("Testuj konfigurację powitania")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("Kanał do przetestowania")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("remove")
            .setDescription("Usuń konfigurację powitania")
            .addChannelOption((option) =>
              option
                .setName("channel")
                .setDescription("Kanał do usunięcia")
                .addChannelTypes(ChannelType.GuildText)
                .setRequired(true)
            )
        )
        .addSubcommand((subcommand) =>
          subcommand
            .setName("stats")
            .setDescription("Statystyki systemu powitań")
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("placeholders")
        .setDescription("Lista dostępnych placeholderów")
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const group = interaction.options.getSubcommandGroup();
    const subcommand = interaction.options.getSubcommand();

    try {
      if (group === "setup") {
        await this.handleSetup(interaction, subcommand);
      } else if (group === "config") {
        await this.handleConfig(interaction, subcommand);
      } else if (group === "manage") {
        await this.handleManage(interaction, subcommand);
      } else if (subcommand === "placeholders") {
        await this.handlePlaceholders(interaction);
      }
    } catch (error) {
      console.error("Błąd w welcome-system:", error);

      const errorEmbed = new EmbedBuilder()
        .setTitle("❌ Błąd")
        .setDescription(
          `Wystąpił błąd podczas wykonywania komendy: ${error.message}`
        )
        .setColor("#e74c3c")
        .setTimestamp();

      await interaction.editReply({ embeds: [errorEmbed] });
    }
  },

  async handleSetup(interaction, subcommand) {
    if (subcommand === "welcome") {
      const channel = interaction.options.getChannel("channel");

      if (
        !channel
          .permissionsFor(interaction.guild.members.me)
          .has(["ViewChannel", "SendMessages", "EmbedLinks"])
      ) {
        return interaction.editReply(
          "❌ Bot nie ma wystarczających uprawnień do tego kanału!"
        );
      }

      const config = await WelcomeConfig.findOneAndUpdate(
        { guildId: interaction.guild.id, channelId: channel.id },
        {
          guildId: interaction.guild.id,
          channelId: channel.id,
          enabled: true,
          "welcomeMessage.enabled": true,
        },
        { upsert: true, new: true }
      );

      welcomeCache.invalidateChannel(interaction.guild.id, channel.id);

      const previewEmbed = await embedBuilder.buildWelcomeEmbed(
        config,
        interaction.member
      );

      const embed = new EmbedBuilder()
        .setTitle("✅ Konfiguracja powitań")
        .setDescription(
          `Pomyślnie skonfigurowano powitania dla kanału ${channel}`
        )
        .addFields([
          { name: "📍 Kanał", value: channel.toString(), inline: true },
          { name: "🎯 Status", value: "Włączone", inline: true },
          {
            name: "⚙️ Następne kroki",
            value: "Użyj `/welcome-system config embed` aby dostosować wygląd",
            inline: false,
          },
        ])
        .setColor("#27ae60")
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed, previewEmbed],
        content: "**Podgląd wiadomości powitalnej:**",
      });
    } else if (subcommand === "farewell") {
      const channel = interaction.options.getChannel("channel");

      if (
        !channel
          .permissionsFor(interaction.guild.members.me)
          .has(["ViewChannel", "SendMessages", "EmbedLinks"])
      ) {
        return interaction.editReply(
          "❌ Bot nie ma wystarczających uprawnień do tego kanału!"
        );
      }

      const config = await WelcomeConfig.findOneAndUpdate(
        { guildId: interaction.guild.id, channelId: channel.id },
        {
          guildId: interaction.guild.id,
          channelId: channel.id,
          enabled: true,
          "farewellMessage.enabled": true,
          "farewellMessage.channelId": channel.id,
        },
        { upsert: true, new: true }
      );

      welcomeCache.invalidateChannel(interaction.guild.id, channel.id);

      const embed = new EmbedBuilder()
        .setTitle("✅ Konfiguracja pożegnań")
        .setDescription(
          `Pomyślnie skonfigurowano pożegnania dla kanału ${channel}`
        )
        .setColor("#e67e22")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === "autoroles") {
      const roles = [
        interaction.options.getRole("role1"),
        interaction.options.getRole("role2"),
        interaction.options.getRole("role3"),
      ].filter((role) => role);

      const delay = interaction.options.getInteger("delay") || 0;

      const botHighestRole = interaction.guild.members.me.roles.highest;
      const invalidRoles = roles.filter(
        (role) => role.position >= botHighestRole.position
      );

      if (invalidRoles.length > 0) {
        return interaction.editReply(
          `❌ Nie mogę nadać następujących ról (za wysokie): ${invalidRoles
            .map((r) => r.name)
            .join(", ")}`
        );
      }

      let config = await WelcomeConfig.findOne({
        guildId: interaction.guild.id,
      });

      if (!config) {
        return interaction.editReply(
          "❌ Najpierw skonfiguruj kanał powitań używając `/welcome-system setup welcome`"
        );
      }

      config.autoRoles = {
        enabled: true,
        roles: roles.map((role) => role.id),
        delay: delay,
      };

      await config.save();
      welcomeCache.invalidateGuild(interaction.guild.id);

      const embed = new EmbedBuilder()
        .setTitle("✅ Automatyczne role")
        .setDescription("Pomyślnie skonfigurowano automatyczne role")
        .addFields([
          {
            name: "🎭 Role",
            value: roles.map((role) => role.toString()).join("\n"),
            inline: true,
          },
          {
            name: "⏱️ Opóźnienie",
            value: delay > 0 ? `${delay} sekund` : "Natychmiast",
            inline: true,
          },
        ])
        .setColor("#9b59b6")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },

  async handleConfig(interaction, subcommand) {
    const channel = interaction.options.getChannel("channel");

    const config = await WelcomeConfig.findOne({
      guildId: interaction.guild.id,
      channelId: channel.id,
    });

    if (!config) {
      return interaction.editReply(
        `❌ Brak konfiguracji dla kanału ${channel}. Użyj najpierw \`/welcome-system setup welcome\``
      );
    }

    if (subcommand === "embed") {
      const title = interaction.options.getString("title");
      const description = interaction.options.getString("description");
      const color = interaction.options.getString("color");
      const footer = interaction.options.getString("footer");

      if (title) config.welcomeMessage.embed.title = title;
      if (description) config.welcomeMessage.embed.description = description;
      if (color) config.welcomeMessage.embed.color = color;
      if (footer) config.welcomeMessage.embed.footer.text = footer;

      await config.save();
      welcomeCache.invalidateChannel(interaction.guild.id, channel.id);

      const previewEmbed = await embedBuilder.buildWelcomeEmbed(
        config,
        interaction.member
      );

      const embed = new EmbedBuilder()
        .setTitle("✅ Konfiguracja embeda")
        .setDescription(`Pomyślnie zaktualizowano embed dla kanału ${channel}`)
        .setColor("#3498db")
        .setTimestamp();

      await interaction.editReply({
        embeds: [embed, previewEmbed],
        content: "**Podgląd zaktualizowanego embeda:**",
      });
    } else if (subcommand === "filters") {
      const minAccountAge = interaction.options.getInteger("min_account_age");
      const cooldown = interaction.options.getInteger("cooldown");
      const ignoreBots = interaction.options.getBoolean("ignore_bots");

      if (minAccountAge !== null) config.filters.minAccountAge = minAccountAge;
      if (cooldown !== null) config.filters.cooldown = cooldown;
      if (ignoreBots !== null) config.filters.ignoreBots = ignoreBots;

      await config.save();
      welcomeCache.invalidateChannel(interaction.guild.id, channel.id);

      const embed = new EmbedBuilder()
        .setTitle("✅ Filtry powitań")
        .setDescription(`Pomyślnie zaktualizowano filtry dla kanału ${channel}`)
        .addFields([
          {
            name: "📅 Min. wiek konta",
            value: `${config.filters.minAccountAge} dni`,
            inline: true,
          },
          {
            name: "⏱️ Cooldown",
            value: `${config.filters.cooldown} sekund`,
            inline: true,
          },
          {
            name: "🤖 Ignoruj boty",
            value: config.filters.ignoreBots ? "Tak" : "Nie",
            inline: true,
          },
        ])
        .setColor("#f39c12")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    }
  },

  async handleManage(interaction, subcommand) {
    if (subcommand === "list") {
      const configs = await WelcomeConfig.find({
        guildId: interaction.guild.id,
      });

      if (configs.length === 0) {
        return interaction.editReply(
          "❌ Brak skonfigurowanych kanałów powitalnych"
        );
      }

      const embed = new EmbedBuilder()
        .setTitle("📋 Konfiguracje powitań")
        .setDescription(`Znaleziono ${configs.length} konfiguracji`)
        .setColor("#3498db")
        .setTimestamp();

      for (const config of configs) {
        const channel = interaction.guild.channels.cache.get(config.channelId);
        const channelName = channel ? channel.name : "Usunięty kanał";

        embed.addFields({
          name: `#${channelName}`,
          value: [
            `**Status:** ${config.enabled ? "✅ Włączone" : "❌ Wyłączone"}`,
            `**Powitania:** ${config.welcomeMessage.enabled ? "✅" : "❌"}`,
            `**Pożegnania:** ${config.farewellMessage.enabled ? "✅" : "❌"}`,
            `**Auto-role:** ${config.autoRoles.enabled ? "✅" : "❌"}`,
            `**Statystyki:** ${config.statistics.totalWelcomes} powitań, ${config.statistics.totalFarewells} pożegnań`,
          ].join("\n"),
          inline: true,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === "test") {
      const channel = interaction.options.getChannel("channel");

      const config = await WelcomeConfig.findOne({
        guildId: interaction.guild.id,
        channelId: channel.id,
      });

      if (!config) {
        return interaction.editReply(
          `❌ Brak konfiguracji dla kanału ${channel}`
        );
      }

      const testResult = await welcomeManager.testConfig(
        config,
        interaction.member
      );

      if (testResult.success) {
        const embed = new EmbedBuilder()
          .setTitle("✅ Test konfiguracji")
          .setDescription(`Konfiguracja dla kanału ${channel} jest prawidłowa`)
          .setColor("#27ae60")
          .setTimestamp();

        await interaction.editReply({
          embeds: [embed, testResult.embed],
          content: "**Podgląd wiadomości powitalnej:**",
        });
      } else {
        const embed = new EmbedBuilder()
          .setTitle("❌ Błąd konfiguracji")
          .setDescription(`Znaleziono błąd w konfiguracji: ${testResult.error}`)
          .setColor("#e74c3c")
          .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
      }
    } else if (subcommand === "remove") {
      const channel = interaction.options.getChannel("channel");

      const result = await WelcomeConfig.findOneAndDelete({
        guildId: interaction.guild.id,
        channelId: channel.id,
      });

      if (!result) {
        return interaction.editReply(
          `❌ Brak konfiguracji dla kanału ${channel}`
        );
      }

      welcomeCache.invalidateChannel(interaction.guild.id, channel.id);

      const embed = new EmbedBuilder()
        .setTitle("✅ Konfiguracja usunięta")
        .setDescription(`Pomyślnie usunięto konfigurację dla kanału ${channel}`)
        .setColor("#e67e22")
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } else if (subcommand === "stats") {
      const configs = await WelcomeConfig.find({
        guildId: interaction.guild.id,
      });
      const managerStats = welcomeManager.getStatistics();
      const cacheStats = welcomeCache.getStats();

      const totalWelcomes = configs.reduce(
        (sum, config) => sum + config.statistics.totalWelcomes,
        0
      );
      const totalFarewells = configs.reduce(
        (sum, config) => sum + config.statistics.totalFarewells,
        0
      );

      const embed = new EmbedBuilder()
        .setTitle("📊 Statystyki systemu powitań")
        .addFields([
          {
            name: "📋 Konfiguracje",
            value: configs.length.toString(),
            inline: true,
          },
          {
            name: "👋 Łączne powitania",
            value: totalWelcomes.toString(),
            inline: true,
          },
          {
            name: "👋 Łączne pożegnania",
            value: totalFarewells.toString(),
            inline: true,
          },
          {
            name: "📨 Wiadomości prywatne",
            value: managerStats.totalDMs.toString(),
            inline: true,
          },
          {
            name: "❌ Błędy",
            value: managerStats.errors.toString(),
            inline: true,
          },
          {
            name: "⚡ Cache Hit Rate",
            value: cacheStats.hitRate,
            inline: true,
          },
          {
            name: "🔄 Przetwarzane",
            value: managerStats.processingQueue.toString(),
            inline: true,
          },
          {
            name: "⏱️ Cooldowny",
            value: managerStats.activeCooldowns.toString(),
            inline: true,
          },
          {
            name: "💾 Pamięć",
            value: cacheStats.memoryUsage.heapUsed,
            inline: true,
          },
        ])
        .setColor("#9b59b6")
        .setTimestamp();

      if (managerStats.lastProcessed) {
        embed.setFooter({
          text: `Ostatnie przetwarzanie: ${managerStats.lastProcessed.toLocaleString(
            "pl-PL"
          )}`,
        });
      }

      await interaction.editReply({ embeds: [embed] });
    }
  },

  async handlePlaceholders(interaction) {
    const placeholders = placeholderManager.getAvailablePlaceholders();
    const documentation = placeholderManager.generateDocumentation();

    const embed = new EmbedBuilder()
      .setTitle("📝 Dostępne placeholdery")
      .setDescription(
        "Lista wszystkich dostępnych placeholderów do użycia w wiadomościach powitalnych"
      )
      .setColor("#3498db")
      .setTimestamp();

    for (const [category, placeholderList] of Object.entries(documentation)) {
      if (placeholderList.length > 0) {
        const value = placeholderList.map((p) => `\`${p}\``).join(", ");
        embed.addFields({
          name: category,
          value: value.length > 1024 ? value.substring(0, 1021) + "..." : value,
          inline: false,
        });
      }
    }

    embed.addFields({
      name: "💡 Przykłady użycia",
      value: [
        "`Witaj {mention-member} na {server-name}!`",
        "`Jesteś {member-count-ordinal} członkiem!`",
        "`Twoje konto zostało utworzone: {user-created}`",
      ].join("\n"),
      inline: false,
    });

    await interaction.editReply({ embeds: [embed] });
  },
};
