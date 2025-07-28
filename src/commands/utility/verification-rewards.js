const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require("discord.js");
const VerificationConfig = require("../../models/VerificationConfig");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("verification-rewards")
    .setDescription("Zarządzaj rolami nagród weryfikacji")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((subcommand) =>
      subcommand
        .setName("set")
        .setDescription("Ustaw rolę nagrody")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Typ nagrody")
            .setRequired(true)
            .addChoices(
              { name: "🏆 Challenge Master", value: "challenge_master" },
              { name: "⚡ Speed Runner", value: "speed_runner" },
              { name: "🧠 Ghost Expert", value: "ghost_expert" }
            )
        )
        .addRoleOption((option) =>
          option
            .setName("role")
            .setDescription("Rola do nadania")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("remove")
        .setDescription("Usuń rolę nagrody")
        .addStringOption((option) =>
          option
            .setName("type")
            .setDescription("Typ nagrody do usunięcia")
            .setRequired(true)
            .addChoices(
              { name: "🏆 Challenge Master", value: "challenge_master" },
              { name: "⚡ Speed Runner", value: "speed_runner" },
              { name: "🧠 Ghost Expert", value: "ghost_expert" }
            )
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("list")
        .setDescription("Wyświetl skonfigurowane role nagród")
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case "set":
          await this.handleSet(interaction);
          break;
        case "remove":
          await this.handleRemove(interaction);
          break;
        case "list":
          await this.handleList(interaction);
          break;
      }
    } catch (error) {
      console.error("Błąd podczas zarządzania rolami nagród:", error);
      await interaction.editReply(
        "❌ Wystąpił błąd podczas wykonywania operacji."
      );
    }
  },

  async handleSet(interaction) {
    const type = interaction.options.getString("type");
    const role = interaction.options.getRole("role");

    if (role.managed) {
      return interaction.editReply(
        "❌ Nie możesz użyć roli zarządzanej przez integrację."
      );
    }
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.editReply(
        "❌ Ta rola jest wyżej lub na tym samym poziomie co moja. Przesuń moją rolę wyżej."
      );
    }

    const config = await VerificationConfig.findOne({
      guildId: interaction.guild.id,
    });
    if (!config) {
      return interaction.editReply(
        "❌ System weryfikacji nie jest skonfigurowany. Użyj `/setup-verification` najpierw."
      );
    }

    config.rewardRoles = config.rewardRoles.filter((r) => r.type !== type);

    config.rewardRoles.push({
      type: type,
      roleId: role.id,
    });

    await config.save();

    const typeNames = {
      challenge_master: "🏆 Challenge Master",
      speed_runner: "⚡ Speed Runner",
      ghost_expert: "🧠 Ghost Expert",
    };

    const embed = new EmbedBuilder()
      .setTitle("✅ Rola Nagrody Skonfigurowana")
      .setDescription(`**${typeNames[type]}** została ustawiona na ${role}`)
      .setColor("#00FF00")
      .addFields({
        name: "📋 Kiedy jest nadawana",
        value: this.getRewardDescription(type),
        inline: false,
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },

  async handleRemove(interaction) {
    const type = interaction.options.getString("type");

    const config = await VerificationConfig.findOne({
      guildId: interaction.guild.id,
    });
    if (!config) {
      return interaction.editReply(
        "❌ System weryfikacji nie jest skonfigurowany."
      );
    }

    const existingRole = config.rewardRoles.find((r) => r.type === type);
    if (!existingRole) {
      return interaction.editReply(
        "❌ Ta rola nagrody nie jest skonfigurowana."
      );
    }

    config.rewardRoles = config.rewardRoles.filter((r) => r.type !== type);
    await config.save();

    const typeNames = {
      challenge_master: "🏆 Challenge Master",
      speed_runner: "⚡ Speed Runner",
      ghost_expert: "🧠 Ghost Expert",
    };

    const embed = new EmbedBuilder()
      .setTitle("✅ Rola Nagrody Usunięta")
      .setDescription(
        `**${typeNames[type]}** została usunięta z systemu nagród`
      )
      .setColor("#FFA500")
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },

  async handleList(interaction) {
    const config = await VerificationConfig.findOne({
      guildId: interaction.guild.id,
    });
    if (!config) {
      return interaction.editReply(
        "❌ System weryfikacji nie jest skonfigurowany."
      );
    }

    const embed = new EmbedBuilder()
      .setTitle("🎁 Skonfigurowane Role Nagród")
      .setDescription("Lista ról nadawanych za różne typy weryfikacji")
      .setColor("#4A90E2")
      .setTimestamp();

    const typeNames = {
      challenge_master: "🏆 Challenge Master",
      speed_runner: "⚡ Speed Runner",
      ghost_expert: "🧠 Ghost Expert",
    };

    if (config.rewardRoles.length === 0) {
      embed.addFields({
        name: "📭 Brak Skonfigurowanych Ról",
        value: "Użyj `/verification-rewards set` aby dodać role nagród.",
        inline: false,
      });
    } else {
      for (const rewardRole of config.rewardRoles) {
        const role = await interaction.guild.roles
          .fetch(rewardRole.roleId)
          .catch(() => null);
        const roleMention = role ? role.toString() : "❌ Rola nie istnieje";

        embed.addFields({
          name: typeNames[rewardRole.type],
          value: `**Rola:** ${roleMention}\n**Opis:** ${this.getRewardDescription(
            rewardRole.type
          )}`,
          inline: true,
        });
      }
    }

    await interaction.editReply({ embeds: [embed] });
  },

  getRewardDescription(type) {
    const descriptions = {
      challenge_master: "Nadawana za ukończenie wyzwania weryfikacyjnego",
      speed_runner: "Nadawana za weryfikację w czasie poniżej 10 sekund",
      ghost_expert:
        "Nadawana za perfekcyjny wynik w wyzwaniu (wszystkie odpowiedzi poprawne)",
    };
    return descriptions[type] || "Nieznany typ nagrody";
  },
};
