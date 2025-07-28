const { cursedItems, ghosts } = require("../../data/phasmophobiaData");

class FindManager {
  constructor() {
    this.possibleFinds = [
      {
        type: "money",
        min: 15,
        max: 50,
        weight: 35,
        message: "Przeszukując ${area}, znajdujesz **${amount}**!",
        emoji: "💰",
        category: "treasure",
      },
      {
        type: "item",
        item: "Sól (Salt)",
        weight: 12,
        message:
          "W ${area} znajdujesz **Sól**! Przyda się do odstraszania duchów.",
        emoji: "🧂",
        category: "equipment",
      },
      {
        type: "item",
        item: "Zapalniczka (Lighter)",
        weight: 12,
        message:
          "Pod starymi przedmiotami w ${area} znajdujesz **Zapalniczkę**!",
        emoji: "🔥",
        category: "equipment",
      },
      {
        type: "bone",
        amount: 100,
        weight: 8,
        message:
          "W ${area} znajdujesz **ludzką kość**! Kolekcjonerzy zapłacą za to krocie!",
        emoji: "🦴",
        category: "rare",
      },
      {
        type: "cursed_object",
        weight: 6,
        message:
          "W ${area} napotykasz na **${cursedItemName}**! Emanuje złowieszczą aurą...",
        emoji: "🔮",
        category: "cursed",
      },
      {
        type: "rare_artifact",
        weight: 3,
        message:
          "Odkrywasz w ${area} **starożytny artefakt**! To niezwykle rzadkie znalezisko!",
        emoji: "✨",
        category: "legendary",
      },
      {
        type: "nothing",
        weight: 15,
        message:
          "Po długich poszukiwaniach w ${area} nie znajdujesz nic wartościowego.",
        emoji: "🤔",
        category: "empty",
      },
      {
        type: "spooky",
        weight: 8,
        message:
          "Coś porusza się w ${area}! Słyszysz złowieszcze dźwięki i uciekasz w panice!",
        emoji: "👻",
        category: "danger",
      },
      {
        type: "trap",
        weight: 6,
        message: "Wpadasz w pułapkę w ${area}! Podłoga zapada się pod tobą!",
        emoji: "🕳️",
        category: "danger",
      },

      {
        type: "evidence",
        weight: 10,
        message:
          "W ${area} znajdujesz **dowód paranormalnej aktywności**! To może być cenne dla badaczy.",
        emoji: "📋",
        category: "evidence",
      },
      {
        type: "journal",
        weight: 7,
        message:
          "Odkrywasz w ${area} **stary dziennik**! Zawiera mrożące krew w żyłach wpisy...",
        emoji: "📖",
        category: "lore",
      },
      {
        type: "photo_opportunity",
        weight: 9,
        message:
          "W ${area} dostrzegasz **paranormalną aktywność**! Szybko robisz zdjęcie!",
        emoji: "📸",
        category: "evidence",
      },
      {
        type: "hidden_cache",
        weight: 5,
        message:
          "Znajdujesz w ${area} **ukrytą skrytkę** z cennymi przedmiotami!",
        emoji: "🗃️",
        category: "treasure",
      },
      {
        type: "ghost_encounter",
        weight: 4,
        message:
          "W ${area} napotykasz na **${ghostName}**! Twoje serce bije jak szalone!",
        emoji: "👤",
        category: "supernatural",
      },
      {
        type: "medical_supplies",
        weight: 8,
        message:
          "W ${area} znajdujesz **apteczkę pierwszej pomocy**! Zawiera przydatne leki.",
        emoji: "🏥",
        category: "healing",
      },
    ];
  }

  getRandomFind(locationMultiplier = 1.0, userLevel = 1) {
    const modifiedFinds = this.possibleFinds.map((find) => ({
      ...find,
      weight: this.adjustWeightForLevel(find, userLevel),
    }));

    const totalWeight = modifiedFinds.reduce(
      (sum, find) => sum + find.weight,
      0
    );
    let random = Math.random() * totalWeight;

    for (const find of modifiedFinds) {
      if (random < find.weight) {
        return find;
      }
      random -= find.weight;
    }

    return modifiedFinds[0];
  }

  adjustWeightForLevel(find, userLevel) {
    const levelMultiplier = 1 + (userLevel - 1) * 0.1;

    switch (find.category) {
      case "legendary":
        return find.weight * Math.min(levelMultiplier * 2, 3);
      case "rare":
        return find.weight * Math.min(levelMultiplier * 1.5, 2);
      case "treasure":
        return find.weight * levelMultiplier;
      case "danger":
        return find.weight * Math.max(1 - (userLevel - 1) * 0.05, 0.5);
      default:
        return find.weight;
    }
  }

  processFind(find, area, location, userProfile) {
    let finalMessage = find.message.replace("${area}", area);
    let color = "#7f8c8d";
    let sanityChange = -Math.floor(Math.random() * 3) - 1;
    let rewards = {
      money: 0,
      items: [],
      experience: 10,
    };

    switch (find.type) {
      case "money": {
        const baseAmount =
          Math.floor(Math.random() * (find.max - find.min + 1)) + find.min;
        const amount = Math.floor(baseAmount * location.baseMultiplier);
        rewards.money = amount;
        finalMessage = finalMessage.replace("${amount}", `$${amount}`);
        color = "#2ecc71";
        rewards.experience = 15;
        break;
      }
      case "item": {
        rewards.items.push({ name: find.item, quantity: 1 });
        color = "#3498db";
        rewards.experience = 12;
        break;
      }
      case "bone": {
        const amount = Math.floor(find.amount * location.baseMultiplier);
        rewards.money = amount;
        finalMessage += ` Otrzymujesz **$${amount}**!`;
        color = "#f39c12";
        rewards.experience = 20;
        break;
      }
      case "cursed_object": {
        const randomCursedItem =
          cursedItems[Math.floor(Math.random() * cursedItems.length)];
        finalMessage = finalMessage.replace(
          "${cursedItemName}",
          randomCursedItem.name
        );
        const reward = Math.floor(50 * location.baseMultiplier);
        rewards.money = reward;
        finalMessage += ` Otrzymujesz **$${reward}** za odwagę!`;
        color = "#8e44ad";
        sanityChange -= 5;
        rewards.experience = 25;
        break;
      }
      case "rare_artifact": {
        const reward = Math.floor(150 * location.baseMultiplier);
        rewards.money = reward;
        finalMessage += ` Otrzymujesz **$${reward}**!`;
        color = "#f1c40f";
        rewards.experience = 30;
        break;
      }
      case "evidence": {
        const reward = Math.floor(75 * location.baseMultiplier);
        rewards.money = reward;
        finalMessage += ` Otrzymujesz **$${reward}** za dowód!`;
        color = "#3498db";
        rewards.experience = 18;
        break;
      }
      case "journal": {
        const reward = Math.floor(60 * location.baseMultiplier);
        rewards.money = reward;
        finalMessage += ` Otrzymujesz **$${reward}** za znalezisko!`;
        color = "#9b59b6";
        sanityChange -= 2;
        rewards.experience = 22;
        break;
      }
      case "photo_opportunity": {
        const reward = Math.floor(40 * location.baseMultiplier);
        rewards.money = reward;
        finalMessage += ` Otrzymujesz **$${reward}** za zdjęcie!`;
        color = "#e67e22";
        rewards.experience = 16;
        break;
      }
      case "hidden_cache": {
        const reward = Math.floor(120 * location.baseMultiplier);
        rewards.money = reward;
        rewards.items.push({ name: "Sól (Salt)", quantity: 2 });
        finalMessage += ` Otrzymujesz **$${reward}** i dodatkowe przedmioty!`;
        color = "#27ae60";
        rewards.experience = 28;
        break;
      }
      case "ghost_encounter": {
        const randomGhost = ghosts[Math.floor(Math.random() * ghosts.length)];
        const reward = Math.floor(200 * location.baseMultiplier);
        rewards.money = reward;

        finalMessage = finalMessage.replace("${ghostName}", randomGhost.name);
        finalMessage += ` Otrzymujesz **$${reward}** za przetrwanie spotkania z **${randomGhost.name}**!`;
        finalMessage += `\n\n*${randomGhost.description}*`;

        color = "#e74c3c";
        sanityChange -= Math.floor(Math.random() * 10) + 8;
        rewards.experience = 35;

        rewards.ghostName = randomGhost.name;
        break;
      }
      case "medical_supplies": {
        rewards.items.push({
          name: "Tabletki na poczytalność (Sanity Pills)",
          quantity: 1,
        });
        color = "#1abc9c";
        sanityChange += 5;
        rewards.experience = 14;
        break;
      }
      case "spooky": {
        sanityChange -= Math.floor(Math.random() * 8) + 5;
        finalMessage += `\nTracisz **${Math.abs(
          sanityChange
        )}%** poczytalności ze strachu!`;
        color = "#e74c3c";
        rewards.experience = 8;
        break;
      }
      case "trap": {
        const healthLoss = Math.floor(Math.random() * 15) + 5;
        sanityChange -= 3;
        finalMessage += `\nTracisz **${healthLoss} HP** i **${Math.abs(
          sanityChange
        )}%** poczytalności!`;
        color = "#e67e22";
        rewards.experience = 5;
        break;
      }
      case "nothing":
        color = "#95a5a6";
        rewards.experience = 3;
        break;
    }

    return {
      message: finalMessage,
      color,
      sanityChange,
      rewards,
      find,
    };
  }

  getFindsByCategory(category) {
    return this.possibleFinds.filter((find) => find.category === category);
  }

  getAllFinds() {
    return this.possibleFinds;
  }
}

module.exports = FindManager;
