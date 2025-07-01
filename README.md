# AI Chat Application - PWA + Vercel Deployment

## Progressive Web App (PWA)

Aplikacja została przekształcona w PWA z pełną funkcjonalnością offline:

### Funkcje PWA:
- 📱 **Instalacja na telefonie/komputerze** - dodaj do ekranu głównego
- 🔄 **Service Worker** - cache'owanie zasobów dla szybszego ładowania
- 📶 **Tryb offline** - podstawowe funkcje działają bez internetu
- 🎨 **Ikony PWA** - profesjonalne ikony aplikacji
- 📋 **Manifest** - metadane aplikacji dla przeglądarek

### Jak zainstalować aplikację:
1. Otwórz aplikację w przeglądarce
2. Pojawi się prompt z opcją "Zainstaluj aplikację"
3. Kliknij "Zainstaluj" aby dodać do ekranu głównego
4. Aplikacja będzie dostępna jak natywna aplikacja

## Deployment na Vercel

Aplikacja została przekonfigurowana do działania z Vercel Functions zamiast Express.js.

### Kroki do wdrożenia:

1. **Zainstaluj Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Zaloguj się do Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy aplikacji:**
   ```bash
   vercel
   ```

4. **Ustaw zmienne środowiskowe w Vercel:**
   - Wejdź na dashboard Vercel
   - Wybierz swój projekt
   - Idź do Settings → Environment Variables
   - Dodaj: `NVIDIA_API_KEY` z wartością API key

### Struktura dla Vercel:

- `api/messages.ts` - Vercel Function obsługująca wiadomości
- `vercel.json` - Konfiguracja Vercel
- `dist/public/` - Statyczne pliki frontenda (po build)

### Różnice od Express:

- ✅ Serverless Functions zamiast stałego serwera
- ✅ Automatyczne skalowanie
- ✅ Globalna CDN dla statycznych plików
- ✅ Brak konieczności zarządzania serwerem

### Testowanie lokalnie:

```bash
# Zainstaluj Vercel CLI i uruchom lokalnie
vercel dev
```