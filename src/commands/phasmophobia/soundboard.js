const {
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  ComponentType,
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
} = require("@discordjs/voice");
const path = require("path");
const fs = require("fs");
const { soundboardSounds } = require("../../data/phasmophobiaData");

const sounds = soundboardSounds;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("soundboard")
    .setDescription(
      "Odtwórz klimatyczny dźwięk z Phasmophobii na kanale głosowym."
    ),

  async execute(interaction) {
    const memberVoiceChannel = interaction.member.voice.channel;
    if (!memberVoiceChannel) {
      return interaction.reply({
        content: "Musisz być na kanale głosowym, aby użyć tej komendy!",
        ephemeral: true,
      });
    }

    if (!memberVoiceChannel.joinable) {
      return interaction.reply({
        content:
          "Nie mogę dołączyć do Twojego kanału głosowego! Sprawdź moje uprawnienia.",
        ephemeral: true,
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("Phasmophobia Soundboard")
      .setDescription(
        "Wybierz dźwięk, który chcesz odtworzyć. Bot dołączy do Twojego kanału i go odtworzy."
      )
      .setColor("#4a4a4a");

    const selectMenu = new StringSelectMenuBuilder()
      .setCustomId("sound_select")
      .setPlaceholder("Wybierz dźwięk...")
      .addOptions(
        sounds.map((sound) => ({
          label: sound.label,
          value: sound.value,
          emoji: sound.emoji,
        }))
      );

    const row = new ActionRowBuilder().addComponents(selectMenu);

    const reply = await interaction.reply({
      embeds: [embed],
      components: [row],
      fetchReply: true,
    });

    const collector = reply.createMessageComponentCollector({
      componentType: ComponentType.StringSelect,
      time: 60_000,
    });

    collector.on("collect", async (i) => {
      if (i.user.id !== interaction.user.id) {
        return i.reply({
          content: "Tylko autor komendy może wybrać dźwięk.",
          ephemeral: true,
        });
      }

      await i.deferUpdate();

      const soundFile = i.values[0];
      const resourcePath = path.join(
        __dirname,
        "..",
        "..",
        "assets",
        "sounds",
        soundFile
      );

      if (!fs.existsSync(resourcePath)) {
        console.error(
          `[Soundboard] Plik nie został znaleziony: ${resourcePath}`
        );
        return i.editReply({
          content: `Wystąpił błąd: Nie znaleziono pliku dźwiękowego dla "${soundFile}".`,
          embeds: [],
          components: [],
        });
      }

      const connection = joinVoiceChannel({
        channelId: memberVoiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
      });

      const player = createAudioPlayer();
      const resource = createAudioResource(resourcePath);

      player.play(resource);
      connection.subscribe(player);

      player.on(AudioPlayerStatus.Idle, () => {
        if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
          connection.destroy();
        }
      });

      connection.on(VoiceConnectionStatus.Disconnected, () => {
        try {
          connection.destroy();
        } catch (error) {
          console.error("Błąd podczas niszczenia połączenia głosowego:", error);
        }
      });

      await i.editReply({
        content: `Odtwarzam: **${
          sounds.find((s) => s.value === soundFile).label
        }**`,
        embeds: [],
        components: [],
      });
      collector.stop();
    });

    collector.on("end", (collected, reason) => {
      if (reason === "time") {
        const timedOutEmbed = new EmbedBuilder()
          .setTitle("Czas minął")
          .setDescription("Nie wybrano żadnego dźwięku w ciągu minuty.")
          .setColor("#95a5a6");
        interaction
          .editReply({ embeds: [timedOutEmbed], components: [] })
          .catch(() => {});
      }
    });
  },
};
