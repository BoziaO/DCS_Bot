# Contributing to DCS Discord Bot

Dziękujemy za zainteresowanie współpracą z projektem DCS Discord Bot! 🎉

## 📋 Spis treści

- [Code of Conduct](#code-of-conduct)
- [Jak mogę pomóc?](#jak-mogę-pomóc)
- [Zgłaszanie błędów](#zgłaszanie-błędów)
- [Sugerowanie nowych funkcji](#sugerowanie-nowych-funkcji)
- [Proces rozwoju](#proces-rozwoju)
- [Styleguide](#styleguide)
- [Commit Messages](#commit-messages)

## Code of Conduct

Ten projekt przestrzega [Contributor Covenant](https://www.contributor-covenant.org/). Uczestnicząc, oczekuje się, że będziesz przestrzegać tego kodeksu.

## Jak mogę pomóc?

### 🐛 Zgłaszanie błędów

- Sprawdź czy błąd nie został już zgłoszony
- Użyj szablonu issue dla błędów
- Dołącz szczegółowe informacje o reprodukcji

### 💡 Sugerowanie funkcji

- Sprawdź czy funkcja nie została już zasugerowana
- Użyj szablonu issue dla nowych funkcji
- Opisz szczegółowo przypadek użycia

### 🔧 Kod

- Poprawki błędów
- Nowe funkcje
- Ulepszenia wydajności
- Dokumentacja

## Zgłaszanie błędów

Przed zgłoszeniem błędu:

1. **Sprawdź istniejące issues** - może ktoś już zgłosił ten problem
2. **Sprawdź dokumentację** - upewnij się, że to rzeczywiście błąd
3. **Przygotuj informacje**:
   - Wersja Node.js
   - Wersja Discord.js
   - System operacyjny
   - Kroki do reprodukcji
   - Oczekiwane zachowanie
   - Rzeczywiste zachowanie
   - Logi błędów

### Szablon zgłoszenia błędu

```markdown
**Opis błędu**
Krótki i jasny opis problemu.

**Kroki do reprodukcji**

1. Przejdź do '...'
2. Kliknij na '....'
3. Przewiń do '....'
4. Zobacz błąd

**Oczekiwane zachowanie**
Jasny opis tego, co powinno się stać.

**Screenshots**
Jeśli dotyczy, dodaj screenshoty.

**Środowisko:**

- OS: [np. Windows 11]
- Node.js: [np. 18.17.0]
- Discord.js: [np. 14.20.0]

**Dodatkowe informacje**
Wszelkie inne informacje o problemie.
```

## Sugerowanie nowych funkcji

### Szablon sugestii funkcji

```markdown
**Czy twoja sugestia jest związana z problemem?**
Jasny opis problemu. Np. Jestem zawsze sfrustrowany gdy [...]

**Opisz rozwiązanie, które chciałbyś zobaczyć**
Jasny opis tego, co chcesz, żeby się stało.

**Opisz alternatywy, które rozważałeś**
Jasny opis alternatywnych rozwiązań lub funkcji.

**Dodatkowe informacje**
Dodaj wszelkie inne informacje lub screenshoty dotyczące sugestii.
```

## Proces rozwoju

### 1. Fork i Clone

```bash
# Fork repozytorium na GitHub, następnie:
git clone https://github.com/yourusername/DCS-Discord-Bot.git
cd DCS-Discord-Bot
```

### 2. Utwórz branch

```bash
git checkout -b feature/amazing-feature
# lub
git checkout -b fix/bug-description
```

### 3. Zainstaluj zależności

```bash
npm install
```

### 4. Skonfiguruj środowisko

```bash
cp .env.example .env
# Edytuj .env z własnymi wartościami
```

### 5. Wprowadź zmiany

- Pisz czytelny kod
- Dodaj komentarze gdzie potrzeba
- Testuj swoje zmiany
- Przestrzegaj styleguide

### 6. Commit i Push

```bash
git add .
git commit -m "feat: add amazing feature"
git push origin feature/amazing-feature
```

### 7. Utwórz Pull Request

- Użyj opisowego tytułu
- Opisz zmiany w szczegółach
- Linkuj powiązane issues
- Dodaj screenshoty jeśli dotyczy

## Styleguide

### JavaScript

- Używaj ES6+ features
- Używaj `const` i `let` zamiast `var`
- Używaj arrow functions gdzie to możliwe
- Używaj template literals zamiast konkatenacji stringów
- Używaj destructuring gdzie to możliwe

```javascript
// ✅ Dobrze
const { Client, GatewayIntentBits } = require("discord.js");
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// ❌ Źle
var discord = require("discord.js");
var client = new discord.Client({ intents: ["GUILDS"] });
```

### Nazewnictwo

- **Pliki**: kebab-case (`user-profile.js`)
- **Zmienne/Funkcje**: camelCase (`getUserProfile`)
- **Klasy**: PascalCase (`UserProfile`)
- **Stałe**: UPPER_SNAKE_CASE (`MAX_RETRY_COUNT`)

### Komentarze

```javascript
/**
 * Pobiera profil użytkownika z bazy danych
 * @param {string} userId - ID użytkownika Discord
 * @returns {Promise<Object>} Profil użytkownika
 */
async function getUserProfile(userId) {
  // Implementacja...
}
```

### Error Handling

```javascript
// ✅ Dobrze
try {
  const result = await someAsyncOperation();
  return result;
} catch (error) {
  console.error("Error in someAsyncOperation:", error);
  throw new Error("Failed to perform operation");
}

// ❌ Źle
const result = await someAsyncOperation().catch((err) => console.log(err));
```

## Commit Messages

Używamy [Conventional Commits](https://www.conventionalcommits.org/):

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: nowa funkcja
- `fix`: poprawka błędu
- `docs`: zmiany w dokumentacji
- `style`: formatowanie, brakujące średniki, etc.
- `refactor`: refaktoryzacja kodu
- `perf`: ulepszenia wydajności
- `test`: dodanie lub poprawka testów
- `chore`: zmiany w build process, auxiliary tools, etc.

### Przykłady

```
feat(leveling): add daily challenge system
fix(database): resolve connection timeout issues
docs(readme): update installation instructions
style(commands): fix indentation in profile command
refactor(utils): simplify cache implementation
perf(database): optimize user query performance
test(leveling): add tests for XP calculation
chore(deps): update discord.js to v14.20.0
```

## Pull Request Guidelines

### Przed wysłaniem PR

- [ ] Kod jest przetestowany
- [ ] Wszystkie testy przechodzą
- [ ] Kod jest sformatowany zgodnie ze styleguide
- [ ] Commit messages są zgodne z konwencją
- [ ] Dokumentacja jest zaktualizowana (jeśli potrzeba)
- [ ] Nie ma konfliktów z main branch

### Szablon Pull Request

```markdown
## Opis

Krótki opis zmian wprowadzonych w tym PR.

## Typ zmiany

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Jak zostało przetestowane?

Opisz testy, które przeprowadziłeś.

## Checklist

- [ ] Mój kod przestrzega styleguide tego projektu
- [ ] Przeprowadziłem self-review swojego kodu
- [ ] Skomentowałem kod w trudnych do zrozumienia obszarach
- [ ] Zaktualizowałem dokumentację
- [ ] Moje zmiany nie generują nowych ostrzeżeń
- [ ] Dodałem testy, które potwierdzają, że moja poprawka jest skuteczna lub że moja funkcja działa
```

## Pytania?

Jeśli masz pytania dotyczące współpracy, możesz:

- Otworzyć issue z etykietą "question"
- Skontaktować się na Discord
- Wysłać email

Dziękujemy za współpracę! 🚀
