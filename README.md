# 🎮 DCS Discord Bot

<div align="center">

![Discord.js](https://img.shields.io/badge/Discord.js-v14.20.0-blue.svg)
![Node.js](https://img.shields.io/badge/Node.js-v16+-green.svg)
![MongoDB](https://img.shields.io/badge/MongoDB-v8.16.0-green.svg)
![License](https://img.shields.io/badge/License-MIT-yellow.svg)

**Zaawansowany bot Discord z systemem levelowania, ekonomią, moderacją i integracją z grą Phasmophobia**

[Funkcje](#-funkcje) • [Instalacja](#-instalacja) • [Konfiguracja](#-konfiguracja) • [Komendy](#-komendy) • [Struktura](#-struktura-projektu)

</div>

---

## 🚀 Funkcje

### 🎮 System Gier Phasmophobia

- **🔍 Interaktywne Polowania** - Realistyczny system polowań z dowodami i nagrodami
- **👻 Baza Duchów** - Kompletna baza danych wszystkich duchów z Phasmophobia
- **🛠️ Sprzęt i Narzędzia** - Szczegółowe informacje o wszystkich narzędziach
- **🗺️ Lokacje** - Informacje o mapach i lokacjach
- **🔮 Przedmioty Przeklęte** - Taroty, Ouija Board i inne
- **🎯 System Śledztw** - Dodatkowy tryb gry z nagrodami

### 📊 Zaawansowany System Levelowania

- **⚡ Automatyczne XP** - Za aktywność na serwerze i grę
- **🏆 Osiągnięcia** - Ponad 20 różnych osiągnięć do zdobycia
- **🎯 Wyzwania** - Codzienne i tygodniowe wyzwania
- **⭐ System Prestiżu** - Dodatkowe poziomy dla zaawansowanych graczy
- **🚀 Boostery XP** - Tymczasowe zwiększenie zdobywanego doświadczenia
- **📈 Szczegółowe Statystyki** - Śledzenie postępów i aktywności

### 💰 System Ekonomiczny

- **💵 Wirtualna Waluta** - Zarabiaj pieniądze za aktywność
- **🛒 Sklep z Rolami** - Kupuj role za zdobyte pieniądze
- **💼 Praca** - System polowań i śledztw jako źródło dochodu
- **🎁 Nagrody Dzienne** - Codzienne bonusy dla aktywnych użytkowników
- **📊 Rankingi** - Tabele liderów bogactwa i aktywności

### 🛡️ Zaawansowana Moderacja

- **🤖 Auto-moderacja** - Automatyczne filtrowanie treści
- **⚠️ System Ostrzeżeń** - Zarządzanie ostrzeżeniami użytkowników
- **📝 Logi Aktywności** - Szczegółowe logowanie zdarzeń
- **🔨 Narzędzia Moderacyjne** - Ban, kick, mute, clear i więcej
- **📊 Statystyki Moderacji** - Śledzenie działań moderacyjnych

### 🎫 System Ticketów

- **📩 Automatyczne Tickety** - Tworzenie ticketów wsparcia
- **🏷️ Kategorie** - Różne typy ticketów
- **👥 Zarządzanie Zespołem** - Przypisywanie moderatorów
- **📋 Historia** - Archiwizacja rozmów

### 👋 System Powitań i Pożegnań

- **🎉 Personalizowane Wiadomości** - Konfigurowalne powitania
- **📸 Obrazy Powitalne** - Graficzne powitania nowych członków
- **🚪 Powiadomienia o Opuszczeniu** - Informacje o opuszczających serwer
- **🔧 Elastyczna Konfiguracja** - Pełna personalizacja wiadomości

### ✅ System Weryfikacji

- **🧩 Interaktywne Wyzwania** - Różne typy weryfikacji
- **🎨 Motywy Wizualne** - Konfigurowalne style weryfikacji
- **🏆 Nagrody za Weryfikację** - Bonusy dla zweryfikowanych użytkowników
- **📊 Statystyki** - Śledzenie skuteczności weryfikacji

### ⚡ Optymalizacja Wydajności

- **🚀 System Cache** - Inteligentne buforowanie danych
- **📊 Monitoring** - Śledzenie wydajności w czasie rzeczywistym
- **🧹 Auto-czyszczenie** - Automatyczne zarządzanie pamięcią
- **⚙️ Konfiguracja** - Dostrajanie parametrów wydajności

---

## 📋 Wymagania

### Wymagania Systemowe

- **Node.js** 16.0.0 lub nowszy
- **MongoDB** 4.4 lub nowszy
- **FFmpeg** (dla funkcji audio)
- **Git** (do klonowania repozytorium)

---

## 🎯 Główne Komendy

### 🎮 Phasmophobia

| Komenda        | Opis                              | Przykład                        |
| -------------- | --------------------------------- | ------------------------------- |
| `/hunt`        | Rozpocznij interaktywne polowanie | `/hunt difficulty:professional` |
| `/investigate` | Rozpocznij śledztwo               | `/investigate`                  |
| `/ghost`       | Informacje o duchach              | `/ghost name:Demon`             |
| `/ghost-info`  | Szczegółowe info o duchu          | `/ghost-info`                   |
| `/item`        | Informacje o sprzęcie             | `/item name:EMF Reader`         |
| `/map-info`    | Informacje o mapach               | `/map-info`                     |
| `/cursed-item` | Przedmioty przeklęte              | `/cursed-item`                  |
| `/tarot`       | Losowa karta tarota               | `/tarot`                        |
| `/ouija-board` | Sesja z tablicą Ouija             | `/ouija-board`                  |

### 📊 Levelowanie i Profil

| Komenda         | Opis                     | Przykład                  |
| --------------- | ------------------------ | ------------------------- |
| `/profile`      | Twój profil i statystyki | `/profile`                |
| `/rank`         | Twój poziom i XP         | `/rank`                   |
| `/leaderboard`  | Ranking serwera          | `/leaderboard type:level` |
| `/achievements` | Lista osiągnięć          | `/achievements`           |
| `/challenges`   | Aktywne wyzwania         | `/challenges`             |
| `/prestige`     | System prestiżu          | `/prestige`               |
| `/boosters`     | Aktywne boostery XP      | `/boosters`               |

### 💰 Ekonomia

| Komenda      | Opis              | Przykład                 |
| ------------ | ----------------- | ------------------------ |
| `/daily`     | Codzienna nagroda | `/daily`                 |
| `/shop`      | Sklep z rolami    | `/shop`                  |
| `/buy`       | Kup przedmiot     | `/buy item:Premium Role` |
| `/use`       | Użyj przedmiotu   | `/use item:XP Booster`   |
| `/locations` | Dostępne lokacje  | `/locations`             |

### 🛡️ Moderacja

| Komenda     | Opis                | Przykład                                         |
| ----------- | ------------------- | ------------------------------------------------ |
| `/warn`     | Ostrzeż użytkownika | `/warn user:@user reason:Spam`                   |
| `/ban`      | Zbanuj użytkownika  | `/ban user:@user reason:Breaking rules`          |
| `/kick`     | Wyrzuć użytkownika  | `/kick user:@user reason:Inappropriate behavior` |
| `/mute`     | Wycisz użytkownika  | `/mute user:@user duration:1h`                   |
| `/clear`    | Usuń wiadomości     | `/clear amount:10`                               |
| `/warnings` | Sprawdź ostrzeżenia | `/warnings user:@user`                           |

### ⚙️ Administracja

| Komenda                   | Opis                   | Przykład                  |
| ------------------------- | ---------------------- | ------------------------- |
| `/setup-leveling-channel` | Konfiguruj levelowanie | `/setup-leveling-channel` |
| `/setup-verification`     | Konfiguruj weryfikację | `/setup-verification`     |
| `/welcome-system`         | System powitań         | `/welcome-system`         |
| `/setup-tickets`          | System ticketów        | `/setup-tickets`          |
| `/setup-logs`             | Logi moderacji         | `/setup-logs`             |
| `/automod`                | Auto-moderacja         | `/automod`                |

### 🔧 Narzędzia

| Komenda             | Opis                  | Przykład            |
| ------------------- | --------------------- | ------------------- |
| `/help`             | Pomoc i instrukcje    | `/help`             |
| `/ping`             | Sprawdź opóźnienie    | `/ping`             |
| `/performance`      | Statystyki wydajności | `/performance`      |
| `/cache-management` | Zarządzanie cache     | `/cache-management` |

---

## 📁 Struktura Projektu

```
DCS/
├── 📁 src/                          # Kod źródłowy
│   ├── 📁 commands/                 # Komendy Discord
│   │   ├── 📁 economy/              # System ekonomiczny
│   │   │   ├── 🎯 hunt.js           # Interaktywne polowania
│   │   │   ├── 🔍 investigate.js    # System śledztw
│   │   │   ├── 👤 profile.js        # Profile użytkowników
│   │   │   ├── 🛒 shop.js           # Sklep z rolami
│   │   │   ├── 💰 daily.js          # Nagrody dzienne
│   │   │   ├── 📊 leaderboard.js    # Rankingi
│   │   │   ├── 🛍️ buy.js            # Kupowanie przedmiotów
│   │   │   ├── 🎒 use.js            # Używanie przedmiotów
│   │   │   └── 🗺️ locations.js      # Lokacje gry
│   │   ├── 📁 leveling/             # System levelowania
│   │   │   ├── 🏆 achievements.js   # Osiągnięcia
│   │   │   ├── 🎯 challenges.js     # Wyzwania
│   │   │   ├── ⭐ prestige.js       # System prestiżu
│   │   │   ├── 📈 rank.js           # Poziomy użytkowników
│   │   │   ├── 🚀 boosters.js       # Boostery XP
│   │   │   └── ⚙️ level-admin.js    # Administracja levelowania
│   │   ├── 📁 phasmophobia/         # Integracja z grą
│   │   │   ├── 👻 ghost.js          # Informacje o duchach
│   │   │   ├── 🔍 ghost-info.js     # Szczegółowe info duchów
│   │   │   ├── 🛠️ item.js           # Sprzęt i narzędzia
│   │   │   ├── 🗺️ map-info.js       # Informacje o mapach
│   │   │   ├── 🔮 cursed-item.js    # Przedmioty przeklęte
│   │   │   ├── 🃏 tarot.js          # Karty tarota
│   │   │   ├── 👁️ ouija-board.js    # Tablica Ouija
│   │   │   └── 🔊 soundboard.js     # Dźwięki z gry
│   │   ├── 📁 moderation/           # Narzędzia moderacji
│   │   │   ├── ⚠️ warn.js           # Ostrzeżenia
│   │   │   ├── 🔨 ban.js            # Banowanie
│   │   │   ├── 👢 kick.js           # Wyrzucanie
│   │   │   ├── 🔇 mute.js           # Wyciszanie
│   │   │   ├── 🧹 clear.js          # Usuwanie wiadomości
│   │   │   ├── 📋 warnings.js       # Lista ostrzeżeń
│   │   │   └── 🤖 automod.js        # Auto-moderacja
│   │   └── 📁 utility/              # Narzędzia pomocnicze
│   │       ├── ❓ help.js           # System pomocy
│   │       ├── 🏓 ping.js           # Test połączenia
│   │       ├── 📊 performance.js    # Monitoring wydajności
│   │       ├── ⚙️ setup-*.js        # Komendy konfiguracyjne
│   │       └── 🔧 cache-management.js # Zarządzanie cache
│   ├── 📁 events/                   # Obsługa zdarzeń Discord
│   │   ├── 🚀 ready.js              # Bot gotowy
│   │   ├── 💬 messageCreate.js      # Nowe wiadomości
│   │   ├── 🎯 interactionCreate.js  # Interakcje użytkowników
│   │   ├── 👋 guildMemberAdd.js     # Nowi członkowie
│   │   ├── 👋 guildMemberRemove.js  # Opuszczający członkowie
│   │   ├── 🔄 messageUpdate.js      # Edycja wiadomości
│   │   ├── 🗑️ messageDelete.js      # Usuwanie wiadomości
│   │   ├── 🎭 messageReaction*.js   # Reakcje na wiadomości
│   │   └── 🔊 voiceStateUpdate.js   # Zmiany kanałów głosowych
│   ├── 📁 models/                   # Modele bazy danych MongoDB
│   │   ├── 👤 Profile.js            # Profile użytkowników
│   │   ├── 🏆 Achievement.js        # Osiągnięcia
│   │   ├── 🎯 Challenge.js          # Wyzwania
│   │   ├── ⚠️ Warning.js            # Ostrzeżenia
│   │   ├── 🎫 TicketConfig.js       # Konfiguracja ticketów
│   │   ├── 👋 WelcomeConfig.js      # Konfiguracja powitań
│   │   ├── ✅ VerificationConfig.js # Konfiguracja weryfikacji
│   │   ├── 📊 LevelingConfig.js     # Konfiguracja levelowania
│   │   └── 🛒 ShopRole.js           # Role w sklepie
│   ├── 📁 utils/                    # Funkcje pomocnicze
│   │   ├── 📁 hunt/                 # Logika polowań
│   │   │   ├── 🎯 huntLogic.js      # Główna logika polowań
│   │   │   ├── 🎮 interactiveHunt.js # Interaktywny interfejs
│   │   │   ├── 📊 embedCreators.js  # Tworzenie embedów
│   │   │   ├── ✅ validation.js     # Walidacja danych
│   │   │   ├── 🔧 constants.js      # Stałe konfiguracyjne
│   │   │   └── 🛠️ utils.js          # Narzędzia pomocnicze
│   │   ├── 📁 investigate/          # System śledztw
│   │   │   ├── 🔍 investigateCore.js # Główna logika śledztw
│   │   │   ├── 🛠️ equipmentManager.js # Zarządzanie sprzętem
│   │   │   ├── 🗺️ locationManager.js # Zarządzanie lokacjami
│   │   │   └── 🔎 findManager.js    # Logika znajdowania dowodów
│   │   ├── 📁 leveling/             # System levelowania
│   │   │   ├── 📊 levelCalculator.js # Obliczenia poziomów
│   │   │   ├── 🏆 achievementManager.js # Zarządzanie osiągnięciami
│   │   │   ├── 🎯 challengeManager.js # Zarządzanie wyzwaniami
│   │   │   ├── ⭐ prestigeManager.js # System prestiżu
│   │   │   ├── 🚀 xpMultiplier.js   # Mnożniki XP
│   │   │   └── 📅 challengeScheduler.js # Harmonogram wyzwań
│   │   ├── 📁 profile/              # Profile użytkowników
│   │   │   ├── 👤 profileService.js # Serwis profili
│   │   │   ├── 📊 embedCreators.js  # Tworzenie embedów profili
│   │   │   ├── 🧮 calculations.js   # Obliczenia statystyk
│   │   │   ├── 👻 ghostStats.js     # Statystyki duchów
│   │   │   └── 📋 constants.js      # Stałe profili
│   │   ├── 📁 verification/         # System weryfikacji
│   │   │   ├── 🧩 challenges.js     # Wyzwania weryfikacyjne
│   │   │   ├── 🎁 rewards.js        # Nagrody za weryfikację
│   │   │   ├── 📊 stats.js          # Statystyki weryfikacji
│   │   │   └── 🎨 themes.js         # Motywy wizualne
│   │   ├── 📁 welcome/              # System powitań
│   │   │   ├── 👋 welcomeManager.js # Zarządzanie powitaniami
│   │   │   ├── 📝 placeholderManager.js # Zmienne w wiadomościach
│   │   │   ├── 🎨 embedBuilder.js   # Tworzenie embedów powitań
│   │   │   └── 💾 welcomeCache.js   # Cache powitań
│   │   ├── 🗄️ database.js           # Połączenie z bazą danych
│   │   ├── 💾 cache.js              # System cache
│   │   ├── ⏱️ cooldown.js           # Zarządzanie cooldownami
│   │   ├── 📊 performance.js        # Monitoring wydajności
│   │   └── ⏰ time.js               # Narzędzia czasowe
│   ├── 📁 data/                     # Dane statyczne
│   │   └── 🎮 phasmophobiaData.js   # Dane z gry Phasmophobia
│   ├── 📁 assets/                   # Zasoby multimedialne
│   │   ├── 📁 images/               # Obrazy i grafiki
│   │   └── 📁 sounds/               # Pliki dźwiękowe
│   ├── 🚀 index.js                  # Główny plik aplikacji
│   ├── 📤 deploy-commands.js        # Wdrażanie komend Discord
│   └── ✅ command-validator.js      # Walidacja komend
├── 📄 package.json                  # Konfiguracja npm i zależności
├── 📄 package-lock.json             # Zablokowane wersje zależności
├── 🔧 .env.example                  # Przykład konfiguracji środowiska
├── 🚫 .gitignore                    # Pliki ignorowane przez Git
├── 📋 .eslintrc.json                # Konfiguracja ESLint
├── 📄 README.md                     # Dokumentacja projektu
└── 📁 .vscode/                      # Konfiguracja Visual Studio Code
    └── ⚙️ settings.json             # Ustawienia edytora
```

---

## 📊 Monitoring i Performance

### Wbudowane Narzędzia Monitorowania

- **📈 Metryki Wydajności** - Czas odpowiedzi, użycie pamięci
- **💾 System Cache** - Inteligentne buforowanie danych
- **🧹 Auto-czyszczenie** - Automatyczne zarządzanie pamięcią
- **📊 Statystyki** - Szczegółowe raporty użytkowania

### Komendy Diagnostyczne

```bash
# Sprawdź wydajność
/performance

# Zarządzaj cache
/cache-management

# Sprawdź połączenie
/ping
```

---

## 🤝 Wsparcie i Rozwój

### Zgłaszanie Błędów

1. **Sprawdź** czy błąd nie został już zgłoszony
2. **Utwórz issue** z dokładnym opisem
3. **Dołącz logi** i kroki do reprodukcji
4. **Opisz środowisko** (Node.js, OS, wersja bota)

### Propozycje Funkcji

1. **Opisz funkcję** szczegółowo
2. **Wyjaśnij przypadki użycia**
3. **Zaproponuj implementację** (opcjonalnie)

### Rozwój

```bash
# Klonuj repozytorium
git clone https://github.com/yourusername/DCS-Discord-Bot.git

# Zainstaluj zależności
npm install

# Uruchom w trybie deweloperskim
npm run dev

# Uruchom testy
npm test
```

---

## 📜 Licencja

Ten projekt jest licencjonowany na licencji MIT - zobacz plik [LICENSE](LICENSE) po szczegóły.

---

## 🙏 Podziękowania

- **Discord.js** - Za wspaniałą bibliotekę
- **MongoDB** - Za niezawodną bazę danych
- **Społeczność Phasmophobia** - Za inspirację i dane
- **Wszystkich kontrybutorów** - Za pomoc w rozwoju

---

<div align="center">

**Stworzony z ❤️ dla społeczności Discord**

[⬆️ Powrót na górę](#-dcs-discord-bot)

</div>
