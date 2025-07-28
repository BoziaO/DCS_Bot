const { maps } = require("../../data/phasmophobiaData");

class LocationManager {
  constructor() {
    this.locations = [
      {
        name: "Opuszczony Dom",
        description: "Stary, zniszczony dom z trzeszczącymi podłogami",
        emoji: "🏚️",
        baseMultiplier: 1.0,
        searchAreas: ["piwnica", "poddasze", "kuchnia", "salon", "sypialnia"],
        dangerLevel: 1,
        type: "house",
      },
      {
        name: "Szpital Psychiatryczny",
        description: "Mroczny kompleks z długimi korytarzami",
        emoji: "🏥",
        baseMultiplier: 1.5,
        searchAreas: [
          "sala operacyjna",
          "pokój pacjenta",
          "gabinet lekarza",
          "apteka",
          "korytarz",
        ],
        dangerLevel: 2,
        type: "medical",
      },
      {
        name: "Stare Więzienie",
        description: "Cela za celą, wszędzie czuć rozpacz",
        emoji: "🔒",
        baseMultiplier: 2.0,
        searchAreas: [
          "cela",
          "kantyna",
          "izolacja",
          "dziedziniec",
          "biuro naczelnika",
        ],
        dangerLevel: 3,
        type: "prison",
      },
      {
        name: "Cmentarz",
        description: "Kamienne nagrobki i stare krypty",
        emoji: "⚰️",
        baseMultiplier: 1.2,
        searchAreas: ["krypta", "grobowiec", "kaplica", "kostnica", "ogród"],
        dangerLevel: 2,
        type: "cemetery",
      },

      ...this.generateLocationsFromMaps(),
    ];
  }

  generateLocationsFromMaps() {
    const newLocations = [];

    maps.forEach((map) => {
      const location = {
        name: map.name,
        description: map.description,
        emoji: this.getEmojiForMap(map),
        baseMultiplier: this.getMultiplierForDifficulty(map.difficulty),
        searchAreas: this.getSearchAreasForMap(map),
        dangerLevel: this.getDangerLevelForDifficulty(map.difficulty),
        type: this.getTypeForMap(map),
        size: map.size,
        originalMap: true,
      };
      newLocations.push(location);
    });

    return newLocations;
  }

  getEmojiForMap(map) {
    const emojiMap = {
      house: "🏠",
      school: "🏫",
      prison: "🔒",
      asylum: "🏥",
      campsite: "🏕️",
      farmhouse: "🚜",
      default: "🏢",
    };

    if (map.name.toLowerCase().includes("house")) return emojiMap.house;
    if (map.name.toLowerCase().includes("school")) return emojiMap.school;
    if (map.name.toLowerCase().includes("prison")) return emojiMap.prison;
    if (
      map.name.toLowerCase().includes("asylum") ||
      map.name.toLowerCase().includes("mental")
    )
      return emojiMap.asylum;
    if (map.name.toLowerCase().includes("camp")) return emojiMap.campsite;
    if (map.name.toLowerCase().includes("farm")) return emojiMap.farmhouse;

    return emojiMap.default;
  }

  getMultiplierForDifficulty(difficulty) {
    const multipliers = {
      easy: 1.0,
      medium: 1.3,
      hard: 1.7,
      nightmare: 2.2,
    };
    return multipliers[difficulty] || 1.0;
  }

  getDangerLevelForDifficulty(difficulty) {
    const dangerLevels = {
      easy: 1,
      medium: 2,
      hard: 3,
      nightmare: 4,
    };
    return dangerLevels[difficulty] || 1;
  }

  getTypeForMap(map) {
    if (map.name.toLowerCase().includes("house")) return "house";
    if (map.name.toLowerCase().includes("school")) return "school";
    if (map.name.toLowerCase().includes("prison")) return "prison";
    if (
      map.name.toLowerCase().includes("asylum") ||
      map.name.toLowerCase().includes("mental")
    )
      return "medical";
    if (map.name.toLowerCase().includes("camp")) return "campsite";
    if (map.name.toLowerCase().includes("farm")) return "farmhouse";
    return "other";
  }

  getSearchAreasForMap(map) {
    const areasByType = {
      house: [
        "salon",
        "kuchnia",
        "sypialnia",
        "łazienka",
        "piwnica",
        "poddasze",
        "garaż",
      ],
      school: [
        "klasa",
        "korytarz",
        "biblioteka",
        "sala gimnastyczna",
        "kantyna",
        "biuro dyrektora",
        "szatnia",
      ],
      prison: [
        "cela",
        "kantyna",
        "dziedziniec",
        "izolacja",
        "biuro naczelnika",
        "sala odwiedzin",
      ],
      medical: [
        "pokój pacjenta",
        "sala operacyjna",
        "gabinet lekarza",
        "apteka",
        "korytarz",
        "recepcja",
      ],
      campsite: [
        "namiot",
        "ognisko",
        "jezioro",
        "las",
        "toalety",
        "recepcja",
        "magazyn",
      ],
      farmhouse: ["stodoła", "dom", "obora", "pole", "kurnik", "warsztat"],
      other: ["główne wejście", "korytarz", "pokój", "piwnica", "poddasze"],
    };

    const type = this.getTypeForMap(map);
    return areasByType[type] || areasByType.other;
  }

  getRandomLocation() {
    return this.locations[Math.floor(Math.random() * this.locations.length)];
  }

  getLocationsByDifficulty(difficulty) {
    return this.locations.filter((loc) => loc.dangerLevel === difficulty);
  }

  getLocationsByType(type) {
    return this.locations.filter((loc) => loc.type === type);
  }

  getRandomArea(location) {
    return location.searchAreas[
      Math.floor(Math.random() * location.searchAreas.length)
    ];
  }

  getAllLocations() {
    return this.locations;
  }

  getLocationByName(name) {
    return this.locations.find(
      (loc) => loc.name.toLowerCase() === name.toLowerCase()
    );
  }
}

module.exports = LocationManager;
