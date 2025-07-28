const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription(
      "Sprawdza opóźnienie bota i wyświetla informacje o połączeniu."
    )
    .addBooleanOption((option) =>
      option
        .setName("detailed")
        .setDescription("Pokaż szczegółowe informacje o wydajności")
        .setRequired(false)
    ),

  async execute(interaction) {
    const detailedMode = interaction.options.getBoolean("detailed") || false;

    try {
      const startTime = Date.now();

      const sent = await interaction.reply({
        content: "🏓 Sprawdzanie połączenia...",
        fetchReply: true,
      });

      const endTime = Date.now();
      const roundtripLatency =
        sent.createdTimestamp - interaction.createdTimestamp;
      const apiLatency = Math.round(interaction.client.ws.ping);
      const processingTime = endTime - startTime;

      const getConnectionQuality = (ping) => {
        if (ping < 100)
          return { status: "Doskonałe", emoji: "🟢", color: 0x00ff00 };
        if (ping < 200)
          return { status: "Dobre", emoji: "🟡", color: 0xffff00 };
        if (ping < 500)
          return { status: "Średnie", emoji: "🟠", color: 0xffa500 };
        return { status: "Słabe", emoji: "🔴", color: 0xff0000 };
      };

      const connectionQuality = getConnectionQuality(roundtripLatency);

      if (detailedMode) {
        const embed = new EmbedBuilder()
          .setColor(connectionQuality.color)
          .setTitle("🏓 Szczegółowe informacje o połączeniu")
          .addFields(
            {
              name: "📡 Opóźnienie odpowiedzi",
              value: `\`${roundtripLatency}ms\``,
              inline: true,
            },
            {
              name: "🌐 Opóźnienie API",
              value: `\`${apiLatency}ms\``,
              inline: true,
            },
            {
              name: "⚡ Czas przetwarzania",
              value: `\`${processingTime}ms\``,
              inline: true,
            },
            {
              name: "📊 Jakość połączenia",
              value: `${connectionQuality.emoji} ${connectionQuality.status}`,
              inline: true,
            },
            {
              name: "🔄 Status WebSocket",
              value:
                interaction.client.ws.status === 0
                  ? "🟢 Połączony"
                  : "🔴 Rozłączony",
              inline: true,
            },
            {
              name: "🖥️ Shard ID",
              value: `\`${interaction.guild?.shardId || "N/A"}\``,
              inline: true,
            }
          )
          .setFooter({
            text: `Żądanie od ${interaction.user.tag}`,
            iconURL: interaction.user.displayAvatarURL(),
          })
          .setTimestamp();

        if (interaction.client.uptime) {
          const uptime = Math.floor(interaction.client.uptime / 1000);
          const days = Math.floor(uptime / 86400);
          const hours = Math.floor((uptime % 86400) / 3600);
          const minutes = Math.floor((uptime % 3600) / 60);
          const seconds = uptime % 60;

          let uptimeString = "";
          if (days > 0) uptimeString += `${days}d `;
          if (hours > 0) uptimeString += `${hours}h `;
          if (minutes > 0) uptimeString += `${minutes}m `;
          uptimeString += `${seconds}s`;

          embed.addFields({
            name: "⏱️ Czas działania",
            value: `\`${uptimeString}\``,
            inline: true,
          });
        }

        await interaction.editReply({
          content: null,
          embeds: [embed],
        });
      } else {
        const responseText = [
          `🏓 **Pong!** ${connectionQuality.emoji}`,
          ``,
          `📡 **Opóźnienie:** \`${roundtripLatency}ms\``,
          `🌐 **API:** \`${apiLatency}ms\``,
          `📊 **Jakość:** ${connectionQuality.status}`,
          ``,
          `*Użyj \`/ping detailed:true\` aby zobaczyć więcej informacji*`,
        ].join("\n");

        await interaction.editReply({
          content: responseText,
        });
      }
    } catch (error) {
      console.error("Błąd w komendzie ping:", error);

      const errorMessage =
        "❌ Wystąpił błąd podczas sprawdzania połączenia. Spróbuj ponownie.";

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: errorMessage });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  },
};
