const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
} = require("discord.js");
const VerificationConfig = require("../../models/VerificationConfig");
const { VerificationThemes } = require("../../utils/verification");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("setup-verification")
    .setDescription("Konfiguruje system weryfikacji w stylu Phasmophobia.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addRoleOption((option) =>
      option
        .setName("role")
        .setDescription('Rola "Investigator" nadawana po weryfikacji.')
        .setRequired(true)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Kanał recepcji, gdzie pojawi się panel weryfikacyjny.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option
        .setName("theme")
        .setDescription("Motyw weryfikacji")
        .setRequired(false)
        .addChoices(
          { name: "👻 Klasyczny Phasmophobia", value: "classic" },
          { name: "🔍 Paranormal Investigator", value: "investigator" },
          { name: "🌙 Darkness Rising", value: "dark" },
          { name: "🏚️ Haunted House", value: "haunted" },
          { name: "🏥 Asylum Investigation", value: "asylum" },
          { name: "🏫 Haunted School", value: "school" }
        )
    )
    .addBooleanOption((option) =>
      option
        .setName("auto-delete")
        .setDescription("Automatycznie usuń poprzednie panele weryfikacyjne")
        .setRequired(false)
    )
    .addBooleanOption((option) =>
      option
        .setName("challenge-mode")
        .setDescription("Włącz tryb wyzwań (quiz przed weryfikacją)")
        .setRequired(false)
    )
    .addStringOption((option) =>
      option
        .setName("challenge-type")
        .setDescription("Typ wyzwania weryfikacyjnego")
        .setRequired(false)
        .addChoices(
          { name: "🎲 Losowe wyzwanie", value: "random" },
          { name: "👻 Quiz o duchach", value: "ghost_quiz" },
          { name: "🔧 Test sprzętu", value: "equipment_test" },
          { name: "🛡️ Wskazówki przetrwania", value: "survival_tips" }
        )
    )
    .addChannelOption((option) =>
      option
        .setName("welcome-channel")
        .setDescription("Kanał powitalny dla nowych investigatorów")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    const role = interaction.options.getRole("role");
    const channel = interaction.options.getChannel("channel");
    const theme = interaction.options.getString("theme") || "classic";
    const autoDelete = interaction.options.getBoolean("auto-delete") ?? true;
    const challengeMode =
      interaction.options.getBoolean("challenge-mode") ?? false;
    const challengeType =
      interaction.options.getString("challenge-type") || "random";
    const welcomeChannel = interaction.options.getChannel("welcome-channel");

    if (role.managed) {
      return interaction.editReply(
        "❌ Nie możesz użyć roli zarządzanej przez integrację (np. rolę bota)."
      );
    }
    if (role.position >= interaction.guild.members.me.roles.highest.position) {
      return interaction.editReply(
        "❌ Ta rola jest wyżej lub na tym samym poziomie co moja. Nie będę w stanie jej nadać. Przesuń moją rolę wyżej w hierarchii."
      );
    }

    const botPermissions = channel.permissionsFor(interaction.guild.members.me);
    if (
      !botPermissions ||
      !botPermissions.has([
        "ViewChannel",
        "SendMessages",
        "EmbedLinks",
        "ManageMessages",
      ])
    ) {
      return interaction.editReply(
        "❌ Bot nie ma wystarczających uprawnień do tego kanału. Potrzebne: Wyświetlanie kanału, Wysyłanie wiadomości, Osadzanie linków, Zarządzanie wiadomościami."
      );
    }

    if (autoDelete) {
      try {
        const messages = await channel.messages.fetch({ limit: 50 });
        const botMessages = messages.filter(
          (msg) =>
            msg.author.id === interaction.client.user.id &&
            msg.embeds.length > 0 &&
            msg.embeds[0].title?.includes("Weryfikacja")
        );

        if (botMessages.size > 0) {
          await Promise.all(
            botMessages.map((msg) => msg.delete().catch(() => {}))
          );
        }
      } catch (error) {
        console.warn(
          "Nie udało się usunąć poprzednich paneli weryfikacyjnych:",
          error
        );
      }
    }

    const selectedTheme = VerificationThemes.getThemes()[theme];
    if (!selectedTheme) {
      return interaction.editReply("❌ Nieznany motyw weryfikacji!");
    }

    await VerificationConfig.findOneAndUpdate(
      { guildId: interaction.guild.id },
      {
        roleId: role.id,
        channelId: channel.id,
        theme: theme,
        challengeEnabled: challengeMode,
        challengeType: challengeType,
        welcomeChannelId: welcomeChannel?.id || null,
        autoDelete: autoDelete,
        lastUpdated: new Date(),
      },
      { upsert: true, new: true }
    );

    const verifyEmbed = VerificationThemes.createEmbed(
      theme,
      interaction.guild,
      {
        stats: {
          completedMissions: Math.floor(Math.random() * 1000) + 500,
          activityLevel: Math.random() > 0.5 ? "Wysoki" : "Umiarkowany",
        },
        equipment: true,
      }
    );

    if (challengeMode) {
      verifyEmbed.addFields({
        name: "🏆 Tryb Wyzwań Aktywny",
        value: `Przed otrzymaniem roli investigatora musisz ukończyć wyzwanie!\n**Typ:** ${
          challengeType === "random" ? "Losowe" : challengeType
        }`,
        inline: false,
      });
    }

    const buttonConfig = VerificationThemes.getButtonConfig(theme);
    const verifyButton = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(
          challengeMode ? "verify_challenge_button" : "verify_button"
        )
        .setLabel(
          challengeMode
            ? `🏆 ${buttonConfig.label} (Wyzwanie)`
            : buttonConfig.label
        )
        .setStyle(ButtonStyle[buttonConfig.style])
        .setEmoji(buttonConfig.emoji)
    );

    try {
      const sentMessage = await channel.send({
        embeds: [verifyEmbed],
        components: [verifyButton],
      });

      try {
        await sentMessage.pin();
      } catch (pinError) {
        console.warn(
          "Nie udało się przypiąć wiadomości weryfikacyjnej:",
          pinError
        );
      }
    } catch (error) {
      console.error("Błąd wysyłania panelu weryfikacyjnego:", error);
      return interaction.editReply(
        "❌ Nie udało mi się wysłać wiadomości na podany kanał. Sprawdź moje uprawnienia."
      );
    }

    const successEmbed = new EmbedBuilder()
      .setTitle("✅ System Weryfikacji Skonfigurowany")
      .setDescription(
        `🎯 **Pomyślnie ustawiono rozbudowany system weryfikacji!**\n\n📋 **Szczegóły konfiguracji:**\n• **Kanał:** ${channel}\n• **Rola:** ${role}\n• **Motyw:** ${
          selectedTheme.name
        }\n• **Tryb wyzwań:** ${
          challengeMode ? `Włączony (${challengeType})` : "Wyłączony"
        }\n• **Kanał powitalny:** ${
          welcomeChannel || "Nie ustawiony"
        }\n• **Auto-usuwanie:** ${
          autoDelete ? "Włączone" : "Wyłączone"
        }\n\n🔗 Panel weryfikacyjny został wysłany i przypięty na kanale.`
      )
      .setColor("#00FF00")
      .addFields({
        name: "🆕 Nowe Funkcje",
        value:
          "• 6 różnych motywów tematycznych\n• System wyzwań weryfikacyjnych\n• Statystyki i rankingi\n• Nagrody za ukończenie wyzwań\n• Modularna struktura kodu",
        inline: false,
      })
      .setFooter({
        text: `Skonfigurowane przez ${interaction.user.tag}`,
        iconURL: interaction.user.displayAvatarURL(),
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [successEmbed] });
  },
};
