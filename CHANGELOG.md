# 📋 Changelog

Wszystkie istotne zmiany w tym projekcie będą dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
a projekt używa [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Dodane

- Przycisk powrotu w embedzie zebranych dowodów w komendzie hunt
- Ulepszona dokumentacja README.md z szczegółową strukturą projektu
- Dodano CHANGELOG.md do śledzenia zmian

### Naprawione

- Błąd "userProfile.inventory.find is not a function" w systemie śledztw
- Naprawiono obsługę inventory jako Map zamiast Array w:
  - `investigateCore.js`
  - `prestigeManager.js`
  - `challengeManager.js`
  - `achievementManager.js`
  - `profileService.js`
  - `constants.js`

### Zmienione

- Zaktualizowano strukturę projektu w dokumentacji
- Poprawiono spójność obsługi inventory w całym projekcie

## [1.1.535] - 28.07.2025

### Dodane

- 🎮 Kompletny system gier Phasmophobia
  - Interaktywne polowania z dowodami i nagrodami
  - Baza danych duchów, sprzętu i lokacji
  - System śledztw jako dodatkowy tryb gry
  - Przedmioty przeklęte (Tarot, Ouija Board)
- 📊 Zaawansowany system levelowania
  - Automatyczne przyznawanie XP za aktywność
  - System osiągnięć (20+ różnych osiągnięć)
  - Codzienne i tygodniowe wyzwania
  - System prestiżu dla zaawansowanych graczy
  - Boostery XP z czasowym działaniem
- 💰 System ekonomiczny
  - Wirtualna waluta za aktywność
  - Sklep z rolami
  - Nagrody dzienne
  - Rankingi bogactwa
- 🛡️ Zaawansowana moderacja
  - Auto-moderacja wiadomości
  - System ostrzeżeń
  - Szczegółowe logi aktywności
  - Narzędzia moderacyjne (ban, kick, mute, clear)
- 🎫 System ticketów wsparcia
  - Automatyczne tworzenie ticketów
  - Kategorie i zarządzanie zespołem
  - Archiwizacja rozmów
- 👋 System powitań i pożegnań
  - Personalizowane wiadomości powitalne
  - Graficzne powitania nowych członków
  - Powiadomienia o opuszczeniu serwera
- ✅ System weryfikacji
  - Interaktywne wyzwania weryfikacyjne
  - Konfigurowalne motywy wizualne
  - Nagrody za weryfikację
  - Statystyki skuteczności
- ⚡ Optymalizacja wydajności
  - Inteligentny system cache
  - Monitoring wydajności w czasie rzeczywistym
  - Automatyczne zarządzanie pamięcią
  - Konfiguracja parametrów wydajności

### Komendy

- **Phasmophobia**: `/hunt`, `/investigate`, `/ghost`, `/ghost-info`, `/item`, `/map-info`, `/cursed-item`, `/tarot`, `/ouija-board`
- **Levelowanie**: `/profile`, `/rank`, `/leaderboard`, `/achievements`, `/challenges`, `/prestige`, `/boosters`
- **Ekonomia**: `/daily`, `/shop`, `/buy`, `/use`, `/locations`
- **Moderacja**: `/warn`, `/ban`, `/kick`, `/mute`, `/clear`, `/warnings`
- **Administracja**: `/setup-leveling-channel`, `/setup-verification`, `/welcome-system`, `/setup-tickets`, `/setup-logs`, `/automod`
- **Narzędzia**: `/help`, `/ping`, `/performance`, `/cache-management`

### Techniczne

- Discord.js v14.20.0
- MongoDB v8.16.0 z Mongoose
- Node.js 16+ support
- Kompletny system cache z node-cache
- Automatyczne wdrażanie komend
- ESLint konfiguracja
- Monitoring wydajności

---

## Typy zmian

- `Dodane` - dla nowych funkcji
- `Zmienione` - dla zmian w istniejących funkcjach
- `Przestarzałe` - dla funkcji, które wkrótce zostaną usunięte
- `Usunięte` - dla usuniętych funkcji
- `Naprawione` - dla poprawek błędów
- `Bezpieczeństwo` - w przypadku luk w zabezpieczeniach
