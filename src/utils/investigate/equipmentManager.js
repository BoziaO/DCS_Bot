const { equipment } = require("../../data/phasmophobiaData");

class EquipmentManager {
  constructor() {
    this.equipment = equipment;
    this.investigateEquipment = [
      {
        name: "Mapa Lokacji (Location Map)",
        type: "tool",
        price: 25,
        description: "Zwiększa szanse na znalezienie ukrytych obszarów.",
        emoji: "🗺️",
        investigateBonus: { hiddenAreaChance: 0.15 },
      },
      {
        name: "Detektor Metali (Metal Detector)",
        type: "tool",
        price: 75,
        description: "Zwiększa szanse na znalezienie cennych przedmiotów.",
        emoji: "🔍",
        investigateBonus: { treasureChance: 0.2 },
      },
      {
        name: "Plecak Badacza (Explorer Backpack)",
        type: "tool",
        price: 100,
        description:
          "Pozwala na przenoszenie większej ilości znalezionych przedmiotów.",
        emoji: "🎒",
        investigateBonus: { carryCapacity: 2 },
      },
      {
        name: "Latarka UV (UV Flashlight)",
        type: "evidence",
        price: 60,
        description: "Wykrywa ukryte ślady i zwiększa szanse na dowody.",
        emoji: "💡",
        investigateBonus: { evidenceChance: 0.25 },
      },
      {
        name: "Apteczka Pierwszej Pomocy (First Aid Kit)",
        type: "protection",
        price: 40,
        description:
          "Zmniejsza obrażenia z pułapek i niebezpiecznych sytuacji.",
        emoji: "🏥",
        investigateBonus: { damageReduction: 0.5 },
      },
      {
        name: "Kompas Duchów (Spirit Compass)",
        type: "evidence",
        price: 80,
        description:
          "Wskazuje kierunek najsilniejszej aktywności paranormalnej.",
        emoji: "🧭",
        investigateBonus: { ghostEncounterChance: 0.3, sanityProtection: 0.2 },
      },
      {
        name: "Talizman Ochronny (Protective Charm)",
        type: "protection",
        price: 120,
        description: "Zmniejsza utratę poczytalności podczas badań.",
        emoji: "🔮",
        investigateBonus: { sanityProtection: 0.4 },
      },
      {
        name: "Notatnik Badacza (Research Journal)",
        type: "tool",
        price: 35,
        description: "Zwiększa doświadczenie zdobywane z badań.",
        emoji: "📔",
        investigateBonus: { experienceMultiplier: 1.5 },
      },
    ];
  }

  getAllEquipment() {
    const enhancedPhasmophobiaEquipment =
      this.addInvestigateBonusesToPhasmophobiaEquipment();
    return [...enhancedPhasmophobiaEquipment, ...this.investigateEquipment];
  }

  getInvestigateEquipment() {
    return this.investigateEquipment;
  }

  getEquipmentByType(type) {
    return this.getAllEquipment().filter((item) => item.type === type);
  }

  getEquipmentByName(name) {
    return this.getAllEquipment().find((item) => item.name === name);
  }

  getPhasmophobiaInvestigateEquipment() {
    return this.equipment.filter(
      (item) =>
        item.type === "evidence" ||
        item.type === "tool" ||
        item.type === "protection" ||
        item.name.includes("Latarka") ||
        item.name.includes("Kamera") ||
        item.name.includes("Termometr") ||
        item.name.includes("EMF") ||
        item.name.includes("Spirit Box") ||
        item.name.includes("Sól") ||
        item.name.includes("Krzyż") ||
        item.name.includes("Świeca")
    );
  }

  addInvestigateBonusesToPhasmophobiaEquipment() {
    return this.equipment.map((item) => {
      const enhancedItem = { ...item };

      if (item.name.includes("EMF")) {
        enhancedItem.investigateBonus = { evidenceChance: 0.25 };
      } else if (
        item.name.includes("Latarka") ||
        item.name.includes("Flashlight")
      ) {
        enhancedItem.investigateBonus = { hiddenAreaChance: 0.1 };
      } else if (item.name.includes("Termometr")) {
        enhancedItem.investigateBonus = { evidenceChance: 0.15 };
      } else if (item.name.includes("Kamera")) {
        enhancedItem.investigateBonus = { evidenceChance: 0.2 };
      } else if (item.name.includes("Spirit Box")) {
        enhancedItem.investigateBonus = {
          ghostEncounterChance: 0.15,
          sanityProtection: 0.1,
        };
      } else if (item.name.includes("Sól") || item.name.includes("Salt")) {
        enhancedItem.investigateBonus = { sanityProtection: 0.15 };
      } else if (
        item.name.includes("Krzyż") ||
        item.name.includes("Crucifix")
      ) {
        enhancedItem.investigateBonus = {
          sanityProtection: 0.25,
          damageReduction: 0.2,
        };
      } else if (item.name.includes("Świeca") || item.name.includes("Candle")) {
        enhancedItem.investigateBonus = {
          sanityProtection: 0.1,
          hiddenAreaChance: 0.05,
        };
      }

      return enhancedItem;
    });
  }

  calculateEquipmentBonuses(userInventory) {
    const bonuses = {
      hiddenAreaChance: 0,
      treasureChance: 0,
      carryCapacity: 1,
      evidenceChance: 0,
      damageReduction: 0,
      ghostEncounterChance: 0,
      sanityProtection: 0,
      experienceMultiplier: 1,
    };

    for (const inventoryItem of userInventory) {
      const equipment = this.getEquipmentByName(inventoryItem.name);
      if (
        equipment &&
        equipment.investigateBonus &&
        inventoryItem.quantity > 0
      ) {
        Object.keys(equipment.investigateBonus).forEach((bonusType) => {
          if (bonuses.hasOwnProperty(bonusType)) {
            if (bonusType === "experienceMultiplier") {
              bonuses[bonusType] *= equipment.investigateBonus[bonusType];
            } else if (bonusType === "carryCapacity") {
              bonuses[bonusType] += equipment.investigateBonus[bonusType];
            } else {
              bonuses[bonusType] += equipment.investigateBonus[bonusType];
            }
          }
        });
      }
    }

    return bonuses;
  }

  applyEquipmentBonuses(findResult, bonuses) {
    let modifiedResult = { ...findResult };

    if (bonuses.experienceMultiplier > 1) {
      modifiedResult.rewards.experience = Math.floor(
        modifiedResult.rewards.experience * bonuses.experienceMultiplier
      );
    }

    if (bonuses.sanityProtection > 0 && modifiedResult.sanityChange < 0) {
      const protection = Math.floor(
        Math.abs(modifiedResult.sanityChange) * bonuses.sanityProtection
      );
      modifiedResult.sanityChange = Math.min(
        0,
        modifiedResult.sanityChange + protection
      );
    }

    if (bonuses.damageReduction > 0 && modifiedResult.find.type === "trap") {
      const originalMessage = modifiedResult.message;
      const damageMatch = originalMessage.match(/Tracisz \*\*(\d+) HP\*\*/);
      if (damageMatch) {
        const originalDamage = parseInt(damageMatch[1]);
        const reducedDamage = Math.max(
          1,
          Math.floor(originalDamage * (1 - bonuses.damageReduction))
        );
        modifiedResult.message = originalMessage.replace(
          `**${originalDamage} HP**`,
          `**${reducedDamage} HP**`
        );
      }
    }

    if (bonuses.carryCapacity > 1 && modifiedResult.find.type === "item") {
      const additionalItems = Math.floor(
        Math.random() * (bonuses.carryCapacity - 1)
      );
      if (additionalItems > 0) {
        modifiedResult.rewards.items.forEach((item) => {
          item.quantity += additionalItems;
        });
        modifiedResult.message += ` Dzięki większemu plecakowi zabierasz dodatkowo ${additionalItems} sztuk!`;
      }
    }

    return modifiedResult;
  }

  getEquipmentRecommendations(userLevel, userInventory) {
    const recommendations = [];
    const currentEquipment = userInventory.map((item) => item.name);

    if (
      userLevel >= 3 &&
      !currentEquipment.includes("Mapa Lokacji (Location Map)")
    ) {
      recommendations.push({
        item: this.getEquipmentByName("Mapa Lokacji (Location Map)"),
        reason: "Pomoże znaleźć ukryte obszary",
      });
    }

    if (
      userLevel >= 5 &&
      !currentEquipment.includes("Detektor Metali (Metal Detector)")
    ) {
      recommendations.push({
        item: this.getEquipmentByName("Detektor Metali (Metal Detector)"),
        reason: "Zwiększy szanse na cenne znaleziska",
      });
    }

    if (
      userLevel >= 7 &&
      !currentEquipment.includes("Talizman Ochronny (Protective Charm)")
    ) {
      recommendations.push({
        item: this.getEquipmentByName("Talizman Ochronny (Protective Charm)"),
        reason: "Ochroni przed utratą poczytalności",
      });
    }

    if (
      userLevel >= 10 &&
      !currentEquipment.includes("Kompas Duchów (Spirit Compass)")
    ) {
      recommendations.push({
        item: this.getEquipmentByName("Kompas Duchów (Spirit Compass)"),
        reason: "Umożliwi bezpieczniejsze spotkania z duchami",
      });
    }

    return recommendations;
  }

  getEquipmentStats(userInventory) {
    const bonuses = this.calculateEquipmentBonuses(userInventory);
    const investigateItems = userInventory.filter((item) =>
      this.investigateEquipment.some((eq) => eq.name === item.name)
    );

    return {
      totalInvestigateItems: investigateItems.length,
      totalValue: investigateItems.reduce((sum, item) => {
        const equipment = this.getEquipmentByName(item.name);
        return sum + (equipment ? equipment.price * item.quantity : 0);
      }, 0),
      activeBonuses: Object.entries(bonuses)
        .filter(([key, value]) => {
          if (key === "experienceMultiplier") return value > 1;
          if (key === "carryCapacity") return value > 1;
          return value > 0;
        })
        .map(([key, value]) => ({ type: key, value })),
    };
  }
}

module.exports = EquipmentManager;
