# DCS Discord Bot

Zaawansowany bot Discord z systemem levelowania, ekonomią, moderacją i integracją z grą Phasmophobia.

## 🚀 Funkcje

### 🎮 System Gier

- **Phasmophobia Integration** - Kompletna baza danych duchów, dowodów i narzędzi
- **Hunt System** - System polowań z nagrodami i statystykami
- **Daily Challenges** - Codzienne wyzwania dla użytkowników

### 📊 System Levelowania

- Automatyczne przyznawanie XP za aktywność
- Konfigurowalne role za poziomy
- System osiągnięć i wyzwań
- Statystyki użytkowników

### 💰 System Ekonomiczny

- Wirtualna waluta
- Sklep z rolami
- Nagrody za aktywność
- System transakcji

### 🛡️ Moderacja

- Auto-moderacja wiadomości
- System ostrzeżeń
- Logi aktywności
- Konfiguracja kanałów

### 🎫 System Ticketów

- Tworzenie ticketów wsparcia
- Automatyczne zarządzanie
- Konfiguracja kategorii

### 👋 System Powitań

- Automatyczne wiadomości powitalne
- Konfiguracja kanałów
- Personalizowane wiadomości

### ✅ System Weryfikacji

- Weryfikacja nowych użytkowników
- Konfiguracja ról
- Automatyczne przyznawanie uprawnień

## 📋 Wymagania

- Node.js 16.0.0 lub nowszy
- MongoDB
- Discord Bot Token
- FFmpeg (dla funkcji audio)

## 🛠️ Instalacja

1. **Sklonuj repozytorium:**

   ```bash
   git clone https://github.com/yourusername/DCS-Discord-Bot.git
   cd DCS-Discord-Bot
   ```

2. **Zainstaluj zależności:**

   ```bash
   npm install
   ```

3. **Skonfiguruj zmienne środowiskowe:**

   Utwórz plik `.env` w głównym katalogu:

   ```env
   DISCORD_TOKEN=your_discord_bot_token
   CLIENT_ID=your_bot_client_id
   GUILD_ID=your_guild_id
   MONGODB_URI=your_mongodb_connection_string
   ```

4. **Uruchom bota:**
   ```bash
   npm start
   ```

## 🔧 Konfiguracja

### Discord Bot Setup

1. Przejdź do [Discord Developer Portal](https://discord.com/developers/applications)
2. Utwórz nową aplikację
3. Przejdź do sekcji "Bot" i utwórz bota
4. Skopiuj token i dodaj go do pliku `.env`
5. W sekcji "OAuth2 > URL Generator":
   - Wybierz scope: `bot` i `applications.commands`
   - Wybierz potrzebne uprawnienia
   - Użyj wygenerowanego URL do dodania bota na serwer

### MongoDB Setup

1. Utwórz konto na [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Utwórz nowy klaster
3. Skonfiguruj dostęp do bazy danych
4. Skopiuj connection string do pliku `.env`

## 📁 Struktura Projektu

```
DCS/
├── src/
│   ├── commands/          # Komendy bota
│   │   ├── admin/         # Komendy administracyjne
│   │   ├── economy/       # Komendy ekonomiczne
│   │   ├── fun/           # Komendy rozrywkowe
│   │   ├── game/          # Komendy gier
│   │   ├── leveling/      # Komendy levelowania
│   │   ├── moderation/    # Komendy moderacji
│   │   ├── phasmophobia/  # Komendy Phasmophobia
│   │   └── utility/       # Komendy narzędziowe
│   ├── events/            # Event handlery
│   ├── models/            # Modele MongoDB
│   ├── utils/             # Funkcje pomocnicze
│   ├── assets/            # Zasoby (obrazy, dźwięki)
│   └── data/              # Dane statyczne
├── .env                   # Zmienne środowiskowe
├── package.json           # Konfiguracja npm
└── README.md             # Dokumentacja
```

## 🎯 Główne Komendy

### Administracja

- `/setup-welcome` - Konfiguracja systemu powitań
- `/setup-verification` - Konfiguracja weryfikacji
- `/setup-leveling` - Konfiguracja levelowania
- `/setup-tickets` - Konfiguracja systemu ticketów

### Phasmophobia

- `/ghost` - Informacje o duchach
- `/evidence` - Lista dowodów
- `/equipment` - Informacje o sprzęcie
- `/hunt` - System polowań

### Levelowanie

- `/profile` - Profil użytkownika
- `/leaderboard` - Ranking użytkowników
- `/achievements` - Lista osiągnięć

### Ekonomia

- `/balance` - Sprawdź saldo
- `/shop` - Sklep z rolami
- `/daily` - Codzienne nagrody

## 🔄 Skrypty NPM

- `npm start` - Uruchom bota
- `npm run dev` - Uruchom w trybie debug
- `npm run memory` - Uruchom z garbage collection
- `npm run profile` - Uruchom z profilowaniem

## 📊 Monitoring i Performance

Bot zawiera wbudowany system monitorowania wydajności:

- Śledzenie użycia pamięci
- Monitoring czasu odpowiedzi
- Cache dla optymalizacji
- Automatyczne czyszczenie pamięci

## 🤝 Współpraca

1. Fork projektu
2. Utwórz branch dla nowej funkcji (`git checkout -b feature/AmazingFeature`)
3. Commit zmian (`git commit -m 'Add some AmazingFeature'`)
4. Push do brancha (`git push origin feature/AmazingFeature`)
5. Otwórz Pull Request

## 📝 Licencja

Ten projekt jest licencjonowany na licencji MIT - zobacz plik [LICENSE](LICENSE) dla szczegółów.

## 🐛 Zgłaszanie Błędów

Jeśli znajdziesz błąd, proszę:

1. Sprawdź czy błąd nie został już zgłoszony
2. Utwórz nowy issue z dokładnym opisem
3. Dołącz logi i kroki do reprodukcji

## 📞 Wsparcie

- Discord: [Link do serwera wsparcia]
- Email: [Twój email]
- Issues: [GitHub Issues](https://github.com/yourusername/DCS-Discord-Bot/issues)

## 🙏 Podziękowania

- Discord.js community
- MongoDB team
- Wszyscy kontrybutorzy

---

**Uwaga:** Pamiętaj o zabezpieczeniu swojego tokena Discord i danych MongoDB. Nigdy nie udostępniaj pliku `.env` publicznie!
