const DIFFICULTY_SETTINGS = {
  amateur: {
    name: "Amator",
    cooldown: 5 * 60 * 1000,
    sanityLossMultiplier: 0.7,
    earningsMultiplier: 0.8,
    time: 75 * 1000,
    minSanity: 10,

    evidenceAmount: 3,
    bonusTime: 15 * 1000,
  },
  intermediate: {
    name: "Średniozaawansowany",
    cooldown: 10 * 60 * 1000,
    sanityLossMultiplier: 1.0,
    earningsMultiplier: 1.0,
    time: 60 * 1000,
    minSanity: 20,

    evidenceAmount: 2,
    bonusTime: 10 * 1000,
  },
  professional: {
    name: "Profesjonalny",
    cooldown: 15 * 60 * 1000,
    sanityLossMultiplier: 1.4,
    earningsMultiplier: 1.5,
    time: 45 * 1000,
    minSanity: 30,

    evidenceAmount: 2,
    bonusTime: 5 * 1000,
  },
  nightmare: {
    name: "Koszmar",
    cooldown: 20 * 60 * 1000,
    sanityLossMultiplier: 2.0,
    earningsMultiplier: 2.2,
    time: 30 * 1000,
    minSanity: 40,

    evidenceAmount: 1,
    bonusTime: 0,
  },
};

const LOCATION_EFFECTS = {
  "Tanglewood Street House": {
    name: "Dom na Tanglewood Street",
    sanityBonus: 5,
    earningsMultiplier: 1.0,
    specialEffect: "Znajome otoczenie uspokaja nerwy.",
    emoji: "🏠",
  },
  "Ridgeview Road House": {
    name: "Dom na Ridgeview Road",
    sanityBonus: 0,
    earningsMultiplier: 1.1,
    specialEffect: "Duży dom oznacza więcej miejsc do ukrycia nagród.",
    emoji: "🏘️",
  },
  "Edgefield Street House": {
    name: "Dom na Edgefield Street",
    sanityBonus: -5,
    earningsMultiplier: 1.2,
    specialEffect: "Mroczna atmosfera zwiększa strach, ale i nagrody.",
    emoji: "🌙",
  },
  Asylum: {
    name: "Szpital Psychiatryczny",
    sanityBonus: -15,
    earningsMultiplier: 1.5,
    specialEffect: "Miejsce pełne cierpienia wzmacnia duchy.",
    emoji: "🏥",
  },
  Prison: {
    name: "Więzienie",
    sanityBonus: -10,
    earningsMultiplier: 1.3,
    specialEffect: "Duchy więźniów są szczególnie agresywne.",
    emoji: "⛓️",
  },
  "High School": {
    name: "Liceum",
    sanityBonus: -5,
    earningsMultiplier: 1.15,
    specialEffect: "Długie korytarze utrudniają ucieczkę.",
    emoji: "🏫",
  },
};

const HUNT_ITEM_EFFECTS = {
  "Latarka (Flashlight)": {
    type: "passive",
    category: "lighting",
    apply: (state) => {
      state.sanityLossReduction += 8;
      state.investigateBonus += 0.1;
      state.bonusReport.push(
        "🔦 Latarka oświetla mroczne zakątki, zmniejszając strach."
      );
    },
  },
  "Silna Latarka (Strong Flashlight)": {
    type: "passive",
    category: "lighting",
    apply: (state) => {
      state.sanityLossReduction += 12;
      state.investigateBonus += 0.15;
      state.bonusReport.push(
        "💡 Silna latarka znacznie poprawia widoczność i pewność siebie."
      );
    },
  },

  "EMF Czytnik (EMF Reader)": {
    type: "detection",
    category: "evidence",
    apply: (state, action) => {
      if (
        action === "investigate" &&
        state.targetGhost.evidence.includes("EMF Level 5")
      ) {
        if (!state.collectedEvidence.includes("EMF Level 5")) {
          state.collectedEvidence.push("EMF Level 5");
          state.earnings += 75;
          state.bonusReport.push(
            "📈 EMF Czytnik wykrył silną aktywność elektromagnetyczną! (+$75)"
          );
          return true;
        }
      }
      return false;
    },
  },
  "Spirit Box": {
    type: "detection",
    category: "evidence",
    apply: (state, action) => {
      if (action === "spirit_box") {
        state.spiritBoxBonus += 0.3;
        state.bonusReport.push(
          "📻 Profesjonalny Spirit Box zwiększa szanse na komunikację."
        );
      }
    },
  },
  "Termometr (Thermometer)": {
    type: "detection",
    category: "evidence",
    apply: (state, action) => {
      if (action === "temperature") {
        state.temperatureBonus += 0.2;
        if (state.targetGhost.evidence.includes("Freezing Temperatures")) {
          state.earnings += 50;
          state.bonusReport.push(
            "🌡️ Precyzyjny termometr wykrył anomalię temperaturową! (+$50)"
          );
        }
      }
    },
  },
  "Aparat (Photo Camera)": {
    type: "active",
    category: "evidence",
    apply: (state, action) => {
      if (action === "photo") {
        state.photoBonus += 0.25;
        const bonus = Math.floor(Math.random() * 50 + 25);
        state.earnings += bonus;
        state.bonusReport.push(
          `📷 Profesjonalny aparat zwiększa jakość zdjęć (+$${bonus}).`
        );
      }
    },
  },
  "Kamera Wideo (Video Camera)": {
    type: "passive",
    category: "evidence",
    apply: (state) => {
      if (state.targetGhost.evidence.includes("Ghost Orbs")) {
        if (!state.collectedEvidence.includes("Ghost Orbs")) {
          state.collectedEvidence.push("Ghost Orbs");
          state.earnings += 100;
          state.bonusReport.push(
            "📹 Kamera wideo uchwyciła Ghost Orbs! (+$100)"
          );
        }
      }
    },
  },
  "Świecące Pałeczki (UV Light)": {
    type: "detection",
    category: "evidence",
    apply: (state, action) => {
      if (
        action === "investigate" &&
        state.targetGhost.evidence.includes("Fingerprints")
      ) {
        if (!state.collectedEvidence.includes("Fingerprints")) {
          state.collectedEvidence.push("Fingerprints");
          state.earnings += 60;
          state.bonusReport.push(
            "🔦 UV Light ujawniło odciski palców ducha! (+$60)"
          );
          return true;
        }
      }
      return false;
    },
  },

  "Krucyfiks (Crucifix)": {
    type: "protection",
    category: "safety",
    apply: (state) => {
      state.huntProtection = true;
      state.sanityLossReduction += 15;
      state.bonusReport.push(
        "✝️ Krucyfiks chroni przed atakami ducha i uspokaja nerwy."
      );
    },
  },
  "Szałwia (Smudge Sticks)": {
    type: "consumable",
    category: "safety",
    apply: (state) => {
      state.sanityLossReduction += 20;
      state.ghostActivityReduction = 0.3;
      state.bonusReport.push(
        "🌿 Szałwia oczyszcza przestrzeń i uspokaja ducha."
      );
    },
  },
  "Sól (Salt)": {
    type: "detection",
    category: "evidence",
    apply: (state, action) => {
      if (action === "investigate") {
        const saltChance = Math.random();
        if (saltChance < 0.4) {
          state.earnings += 30;
          state.bonusReport.push("🧂 Sól ujawniła ślady ducha! (+$30)");
        }
      }
    },
  },

  "Zapalniczka (Lighter)": {
    type: "tool",
    category: "utility",
    apply: (state) => {
      state.toolBonus = true;
      state.bonusReport.push(
        "🔥 Zapalniczka pozwala na użycie innych przedmiotów."
      );
    },
  },
  "Czujnik Ruchu (Motion Sensor)": {
    type: "passive",
    category: "detection",
    apply: (state) => {
      const motionChance = Math.random();
      if (motionChance < 0.6) {
        state.earnings += 40;
        state.investigateBonus += 0.2;
        state.bonusReport.push(
          "📡 Czujnik ruchu wykrył aktywność ducha! (+$40)"
        );
      }
    },
  },
  "Mikrofon Paraboliczny (Parabolic Microphone)": {
    type: "detection",
    category: "audio",
    apply: (state, action) => {
      if (action === "investigate") {
        const audioChance = Math.random();
        if (audioChance < 0.5) {
          state.earnings += 35;
          state.bonusReport.push(
            "🎤 Mikrofon paraboliczny wychwycił dźwięki ducha! (+$35)"
          );
        }
      }
    },
  },

  "Tabletki na poczytalność (Sanity Pills)": {
    type: "consumable",
    category: "healing",
    apply: (state) => {
      const sanityRestore = 30;
      state.currentSanity = Math.min(100, state.currentSanity + sanityRestore);
      state.bonusReport.push(
        `💊 Tabletki przywróciły poczytalność (+${sanityRestore}%).`
      );
    },
  },
};

const RANDOM_EVENTS = [
  {
    name: "Nagłe Zimno",
    chance: 0.15,
    effect: (state) => {
      state.sanityLoss += 8;
      state.bonusReport.push("❄️ Nagłe zimno przeszło przez twoje ciało...");
    },
  },
  {
    name: "Znajdź Pieniądze",
    chance: 0.1,
    effect: (state) => {
      const foundMoney = Math.floor(Math.random() * 100 + 50);
      state.earnings += foundMoney;
      state.bonusReport.push(
        `💰 Znalazłeś pieniądze w starym szafie (+$${foundMoney})!`
      );
    },
  },
  {
    name: "Duch Atakuje",
    chance: 0.12,
    effect: (state) => {
      state.sanityLoss += 12;
      state.bonusReport.push(
        "👻 Duch zaatakował! Twoje serce wali jak szalone..."
      );
    },
  },
];

module.exports = {
  DIFFICULTY_SETTINGS,
  LOCATION_EFFECTS,
  HUNT_ITEM_EFFECTS,
  RANDOM_EVENTS,
};
