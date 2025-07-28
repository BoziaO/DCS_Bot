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

- `/progile` - Sprawdź saldo
- `/shop` - Sklep z rolami
- `/hunt` - Praca

## 📊 Monitoring i Performance

Bot zawiera wbudowany system monitorowania wydajności:

- Śledzenie użycia pamięci
- Monitoring czasu odpowiedzi
- Cache dla optymalizacji
- Automatyczne czyszczenie pamięci

## 🐛 Zgłaszanie Błędów

Jeśli znajdziesz błąd, proszę:

1. Sprawdź czy błąd nie został już zgłoszony
2. Utwórz nowy issue z dokładnym opisem
3. Dołącz logi i kroki do reprodukcji
