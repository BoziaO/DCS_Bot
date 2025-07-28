const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const { ouijaResponses } = require("../../data/phasmophobiaData");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const { questionResponses, genericResponses, scaryResponses } = ouijaResponses;

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ouija-board")
    .setDescription("Zadaj pytanie duchowi przez tablicę Ouija.")
    .addStringOption((option) =>
      option
        .setName("question")
        .setDescription("Pytanie, które chcesz zadać duchowi.")
        .setRequired(true)
    ),

  async execute(interaction) {
    const question = interaction.options.getString("question");
    const normalizedQuestion = question.toLowerCase();

    let selectedResponse;
    let embedColor = "#9b59b6";
    let embedTitle = "🔮 Tablica Ouija";

    if (Math.random() < 0.15) {
      selectedResponse =
        scaryResponses[Math.floor(Math.random() * scaryResponses.length)];
      embedColor = "#e74c3c";
      embedTitle = "👻 Tablica Ouija - Ostrzeżenie!";
    } else {
      let responseFound = false;
      for (const [keywords, answers] of questionResponses.entries()) {
        if (keywords.some((keyword) => normalizedQuestion.includes(keyword))) {
          selectedResponse =
            answers[Math.floor(Math.random() * answers.length)];
          responseFound = true;
          break;
        }
      }
      if (!responseFound) {
        selectedResponse =
          genericResponses[Math.floor(Math.random() * genericResponses.length)];
      }
    }

    const initialEmbed = new EmbedBuilder()
      .setTitle(embedTitle)
      .setColor(embedColor)
      .addFields(
        { name: "Twoje pytanie", value: question },
        { name: "Odpowiedź ducha", value: "..." }
      )
      .setFooter({ text: "Duch usłyszał twoje pytanie..." })
      .setTimestamp();

    await interaction.reply({ embeds: [initialEmbed], fetchReply: true });

    let currentText = "";
    for (let i = 0; i < selectedResponse.length; i++) {
      await sleep(400);
      currentText += selectedResponse[i];

      const animatedEmbed = new EmbedBuilder()
        .setTitle(embedTitle)
        .setColor(embedColor)
        .addFields(
          { name: "Twoje pytanie", value: question },
          { name: "Odpowiedź ducha", value: `${currentText}█` }
        )
        .setFooter({ text: "Duch odpowiada..." })
        .setTimestamp();

      await interaction.editReply({ embeds: [animatedEmbed] });
    }

    await sleep(1000);
    const finalEmbed = new EmbedBuilder()
      .setTitle(embedTitle)
      .setColor(embedColor)
      .addFields(
        { name: "Twoje pytanie", value: question },
        { name: "Odpowiedź ducha", value: selectedResponse }
      )
      .setFooter({
        text: "Pamiętaj, że tablica Ouija może obniżyć poczytalność...",
      })
      .setTimestamp();

    await interaction.editReply({ embeds: [finalEmbed] });
  },
};
