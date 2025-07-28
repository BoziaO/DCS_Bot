const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require("discord.js");
const ActiveChallenge = require("../../models/ActiveChallenge");
const { dbService } = require("../database");

class VerificationChallenges {
  static getChallenges() {
    return {
      ghost_quiz: {
        name: "👻 Quiz o Duchach",
        description: "Odpowiedz na pytania o różne typy duchów",
        difficulty: "Łatwy",
        questions: [
          {
            question: "Który duch reaguje na szałwię przez 180 sekund?",
            answers: ["Spirit", "Wraith", "Phantom", "Poltergeist"],
            correct: 0,
            explanation:
              "Spirit to najczęstszy typ ducha, który ma słabość do szałwii.",
          },
          {
            question: "Który duch nie zostawia śladów stóp w soli?",
            answers: ["Spirit", "Wraith", "Banshee", "Jinn"],
            correct: 1,
            explanation:
              "Wraith potrafi latać i nie dotyka ziemi, więc nie zostawia śladów.",
          },
          {
            question: "Który duch skupia się na jednym celu?",
            answers: ["Poltergeist", "Phantom", "Banshee", "Jinn"],
            correct: 2,
            explanation:
              "Banshee wybiera sobie jeden cel i poluje tylko na niego.",
          },
        ],
      },
      equipment_test: {
        name: "🔧 Test Sprzętu",
        description: "Sprawdź swoją wiedzę o sprzęcie paranormalnym",
        difficulty: "Średni",
        questions: [
          {
            question: "Które urządzenie wykrywa EMF Level 5?",
            answers: ["Termometr", "EMF Reader", "Spirit Box", "UV Light"],
            correct: 1,
            explanation:
              "EMF Reader wykrywa poziomy pól elektromagnetycznych od 1 do 5.",
          },
          {
            question: "Co pokazuje UV Flashlight?",
            answers: ["Duchy", "Odciski palców", "Orby", "Temperatury"],
            correct: 1,
            explanation:
              "UV Flashlight ujawnia odciski palców pozostawione przez duchy.",
          },
          {
            question:
              "Przy jakiej temperaturze pojawia się Freezing Temperatures?",
            answers: [
              "Poniżej 10°C",
              "Poniżej 5°C",
              "Poniżej 0°C",
              "Poniżej -5°C",
            ],
            correct: 2,
            explanation:
              "Freezing Temperatures to dowód pojawiający się poniżej 0°C.",
          },
        ],
      },
      survival_tips: {
        name: "🛡️ Wskazówki Przetrwania",
        description: "Naucz się jak przetrwać spotkanie z duchem",
        difficulty: "Trudny",
        questions: [
          {
            question: "Co robić podczas polowania ducha?",
            answers: ["Biegać", "Schować się", "Rozmawiać", "Świecić latarką"],
            correct: 1,
            explanation:
              "Podczas polowania najlepiej schować się w szafie lub za drzwiami.",
          },
          {
            question: "Jak długo trwa typowe polowanie?",
            answers: ["10 sekund", "20 sekund", "35 sekund", "60 sekund"],
            correct: 2,
            explanation: "Standardowe polowanie trwa około 35 sekund.",
          },
          {
            question: "Co zwiększa szanse na polowanie?",
            answers: [
              "Niska poczytalność",
              "Wysoka temperatura",
              "Jasne światło",
              "Głośne rozmowy",
            ],
            correct: 0,
            explanation:
              "Im niższa poczytalność, tym większe szanse na rozpoczęcie polowania.",
          },
        ],
      },
    };
  }

  static async startChallenge(interaction, challengeType) {
    const challenges = this.getChallenges();
    const challenge = challenges[challengeType];

    if (!challenge) {
      return interaction.editReply("❌ Nieznany typ wyzwania!");
    }

    try {
      const existingChallenge = await ActiveChallenge.findOne({
        userId: interaction.user.id,
      });
      if (existingChallenge) {
        await ActiveChallenge.deleteOne({ userId: interaction.user.id });
      }

      const question =
        challenge.questions[
          Math.floor(Math.random() * challenge.questions.length)
        ];

      const embed = new EmbedBuilder()
        .setTitle(`${challenge.name} - ${challenge.difficulty}`)
        .setDescription(`**${question.question}**\n\n${challenge.description}`)
        .setColor("#FF6B35")
        .setFooter({ text: "Masz 30 sekund na odpowiedź!" })
        .setTimestamp();

      const buttons = question.answers.map((answer, index) =>
        new ButtonBuilder()
          .setCustomId(`challenge_answer_${index}`)
          .setLabel(`${String.fromCharCode(65 + index)}. ${answer}`)
          .setStyle(ButtonStyle.Primary)
      );

      const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 2));
      const row2 = new ActionRowBuilder().addComponents(buttons.slice(2, 4));
      const components = [row1];
      if (buttons.length > 2) components.push(row2);

      const message = await interaction.editReply({
        embeds: [embed],
        components: components,
      });

      const expiresAt = new Date(Date.now() + 30000);

      await ActiveChallenge.create({
        userId: interaction.user.id,
        messageId: message.id,
        challengeType: challengeType,
        question: question,
        startTime: new Date(),
        expiresAt: expiresAt,
      });

      setTimeout(() => {
        this.checkAndTimeoutChallenge(interaction);
      }, 30000);
    } catch (error) {
      console.error("Error starting challenge:", error);
      return interaction.editReply(
        "❌ Wystąpił błąd podczas uruchamiania wyzwania. Spróbuj ponownie."
      );
    }
  }

  /**
   * Helper method to check if a challenge has timed out and update the UI
   */
  static async checkAndTimeoutChallenge(interaction) {
    try {
      const challenge = await ActiveChallenge.findOne({
        userId: interaction.user.id,
      });
      if (challenge) {
        await ActiveChallenge.deleteOne({ userId: interaction.user.id });
        await this.timeoutChallenge(interaction);
      }
    } catch (error) {
      console.error("Error checking challenge timeout:", error);
    }
  }

  static async handleAnswer(interaction, answerIndex) {
    try {
      const challengeData = await ActiveChallenge.findOne({
        userId: interaction.user.id,
      });

      if (!challengeData) {
        return interaction.reply({
          content: "❌ Nie masz aktywnego wyzwania lub czas minął!",
          ephemeral: true,
        });
      }

      await ActiveChallenge.deleteOne({ userId: interaction.user.id });

      const isCorrect = answerIndex === challengeData.question.correct;
      const timeTaken = Math.round(
        (Date.now() - challengeData.startTime) / 1000
      );

      const resultEmbed = new EmbedBuilder()
        .setTitle(
          isCorrect ? "✅ Poprawna Odpowiedź!" : "❌ Niepoprawna Odpowiedź"
        )
        .setDescription(
          `**Twoja odpowiedź:** ${
            challengeData.question.answers[answerIndex]
          }\n**Poprawna odpowiedź:** ${
            challengeData.question.answers[challengeData.question.correct]
          }\n\n**Wyjaśnienie:** ${
            challengeData.question.explanation
          }\n\n⏱️ **Czas odpowiedzi:** ${timeTaken}s`
        )
        .setColor(isCorrect ? "#00FF00" : "#FF0000")
        .setTimestamp();

      if (isCorrect) {
        resultEmbed.addFields({
          name: "🎉 Gratulacje!",
          value:
            "Przeszedłeś wyzwanie weryfikacyjne! Możesz teraz otrzymać rolę investigatora.",
          inline: false,
        });
      } else {
        resultEmbed.addFields({
          name: "📚 Nie martw się!",
          value:
            "Możesz spróbować ponownie za chwilę. Każda porażka to lekcja!",
          inline: false,
        });
      }

      await interaction.update({
        embeds: [resultEmbed],
        components: [],
      });

      return isCorrect;
    } catch (error) {
      console.error("Error handling challenge answer:", error);
      return interaction.reply({
        content:
          "❌ Wystąpił błąd podczas przetwarzania odpowiedzi. Spróbuj ponownie.",
        ephemeral: true,
      });
    }
  }

  static async timeoutChallenge(interaction) {
    try {
      const timeoutEmbed = new EmbedBuilder()
        .setTitle("⏰ Czas Minął!")
        .setDescription(
          "Nie udało Ci się odpowiedzieć w czasie. Spróbuj ponownie!"
        )
        .setColor("#FFA500")
        .setTimestamp();

      await interaction.editReply({
        embeds: [timeoutEmbed],
        components: [],
      });
    } catch (error) {
      console.error("Błąd podczas timeout challenge:", error);
    }
  }

  static getRandomChallenge() {
    const challenges = Object.keys(this.getChallenges());
    return challenges[Math.floor(Math.random() * challenges.length)];
  }
}

module.exports = VerificationChallenges;
