# 📋 Changelog

Wszystkie istotne zmiany w tym projekcie będą dokumentowane w tym pliku.

Format oparty na [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
a projekt używa [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.6] - 30.07.2025

### Dodane

- 🎫 **Kompletny zaawansowany system ticketów**

  - Historia i logi wszystkich wiadomości w ticketach
  - Transkrypty rozmów w formatach TXT, HTML, JSON
  - Automatyczne zamykanie nieaktywnych ticketów z ostrzeżeniami
  - System ocen obsługi po zamknięciu ticketu (1-5 gwiazdek)
  - Powiadomienia DM dla personelu o nowych ticketach i przypisaniach
  - Szczegółowe statystyki i raporty wydajności personelu
  - System ról personelu (Administrator, Moderator, Wsparcie)
  - Zarządzanie priorytetami ticketów (Niski/Średni/Wysoki/Krytyczny)
  - Eksport danych do analizy w różnych formatach
  - Automatyczne archiwizowanie zamkniętych ticketów

- 📊 **Nowe modele danych dla systemu ticketów**

  - `TicketMessage` - przechowywanie wszystkich wiadomości
  - `TicketAssignment` - historia przypisań personelu
  - `TicketRating` - system ocen z kategoriami szczegółowymi
  - `TicketStats` - statystyki i raporty systemu
  - `TicketConfig` - zaawansowana konfiguracja systemu

- 🎯 **Nowe komendy systemu ticketów**

  - `/setup-tickets` - pierwsza konfiguracja systemu
  - `/ticket-config` - zarządzanie konfiguracją (auto-close, powiadomienia, limity, role)
  - `/assign-ticket` - przypisywanie ticketów do personelu
  - `/unassign-ticket` - odprzypisywanie ticketów
  - `/set-priority` - zmiana priorytetu ticketów
  - `/close-ticket` - zamykanie ticketów z powodem
  - `/ticket-info` - szczegółowe informacje o tickecie
  - `/list-tickets` - lista ticketów z filtrami
  - `/ticket-stats` - statystyki systemu i personelu
  - `/export-transcript` - eksport transkryptów
  - `/generate-report` - generowanie szczegółowych raportów

- 🤖 **Automatyczne funkcje systemu ticketów**

  - System auto-close sprawdzający nieaktywność co 30 minut
  - Automatyczne logowanie wszystkich wiadomości w ticketach
  - Powiadomienia DM o krytycznych priorytetach dla administratorów
  - Automatyczne wysyłanie próśb o ocenę po zamknięciu ticketu
  - Rozróżnienie wiadomości personelu, użytkowników i systemu

- Przycisk powrotu w embedzie zebranych dowodów w komendzie hunt
- Ulepszona dokumentacja README.md z szczegółową strukturą projektu
- Dodano CHANGELOG.md do śledzenia zmian

- 🔄 **Rozszerzony system codziennych wyzwań Phasmophobia**

  - Automatyczne odnowienie wyzwań z konfigurowalnymi częstotliwościami
  - Obsługa 5 różnych interwałów: co godzinę, co 3h, co 6h, co 12h, codziennie
  - Inteligentny system unikania powtórzeń wyzwań
  - 33% szansy na bonus z losowym duchem (+50% XP)
  - Automatyczne czyszczenie historii wyzwań
  - Zaawansowane embedy z informacjami o następnym odnowieniu
  - Konfigurowalny czas dla codziennych wyzwań (0-23h)

- 🎯 **Nowe komendy systemu codziennych wyzwań**

  - `/setup-dailychallenge` - konfiguracja z opcjami częstotliwości i godziny
  - `/renew-dailychallenge` - ręczne odnowienie wyzwania
  - `/dailychallenge-status` - szczegółowy status systemu i diagnostyka
  - `/remove-dailychallenge` - wyłączanie lub usuwanie konfiguracji

- 📊 **Rozszerzone modele danych**

  - `DailyChallengeConfig` - dodano pola: `renewalFrequency`, `customHour`, `enabled`, `lastChallengeId`, `lastRenewal`
  - Pełna kompatybilność wsteczna z istniejącymi konfiguracjami

- 🤖 **Zaawansowany scheduler wyzwań**

  - `DailyChallengeScheduler` - nowa klasa zarządzająca wieloma harmonogramami
  - Równoległe zadania cron dla każdej częstotliwości
  - Monitoring zdrowia schedulera i raportowanie błędów
  - Automatyczne czyszczenie nieaktywnych serwerów po 7 dniach

- 🗺️ **Zaktualizowane mapy Phasmophobia**
  - Kompletna lista 16 oficjalnych map z gry
  - Dodano nowe mapy: Point Hope, 42 Edgefield Road, 6 Tanglewood Drive, 13 Willow Street
  - Zaktualizowane opisy, pokoje i specjalne cechy wszystkich map
  - Zbalansowane nagrody i poziomy trudności dla każdej mapy
  - Szczegółowe wskazówki i strategie dla każdej lokacji

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

- Zaktualizowano `interactionCreate.js` o obsługę nowych interakcji systemu ticketów
- Zaktualizowano `messageCreate.js` o automatyczne logowanie wiadomości w ticketach
- Rozdzielono stary system ticketów od nowego (zachowano kompatybilność wsteczną)
- Zaktualizowano strukturę projektu w dokumentacji
- Poprawiono spójność obsługi inventory w całym projekcie

- **Przepisano system codziennych wyzwań Phasmophobia**
  - Zastąpiono pojedynczy cron job wieloma schedulerami
  - Zaktualizowano `ready.js` o inicjalizację nowego `DailyChallengeScheduler`
  - Usunięto stary kod `scheduleDailyChallenge` i `getDailyChallenge`
  - Rozszerzono komendy `/setup-dailychallenge` i `/remove-dailychallenge`
  - Dodano walidację kanałów i uprawnień przed wysyłaniem wyzwań

### Techniczne

- **Nowa struktura plików systemu ticketów**:
  - `src/models/tickets/` - modele podzielone na osobne pliki
  - `src/commands/tickets/` - komendy podzielone funkcjonalnie
  - `src/handlers/ticketHandler.js` - główny handler interakcji
  - `src/utils/ticketAutoClose.js` - system automatycznego zamykania
- **Integracja z istniejącym systemem** - zachowano kompatybilność ze starym systemem ticketów
- **Optymalizacja wydajności** - efektywne zapytania do bazy danych
- **Skalowalna architektura** - łatwe dodawanie nowych funkcji

- **Nowa architektura systemu codziennych wyzwań**:
  - `src/utils/challenges/dailyChallengeScheduler.js` - główny scheduler z klasą `DailyChallengeScheduler`
  - `src/commands/utility/renew-dailychallenge.js` - komenda ręcznego odnowienia
  - `src/commands/utility/dailychallenge-status.js` - komenda statusu i diagnostyki
  - Rozszerzono `src/models/DailyChallengeConfig.js` o nowe pola konfiguracyjne
- **Zaawansowane zarządzanie harmonogramami**:
  - 5 równoległych zadań cron dla różnych częstotliwości
  - Inteligentne sprawdzanie warunków odnowienia
  - System śledzenia historii wyzwań per serwer (Map-based storage)
  - Automatyczne czyszczenie pamięci co 24h
- **Ulepszona obsługa błędów**:
  - Walidacja istnienia kanałów przed wysyłaniem
  - Graceful handling błędów bazy danych
  - Szczegółowe logowanie z kolorami w konsoli
  - Izolacja błędów między różnymi serwerami

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
