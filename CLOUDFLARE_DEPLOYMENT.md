# Cloudflare Pages Deployment Guide  

## Przygotowanie aplikacji do deploymentu na Cloudflare Pages + Functions

Aplikacja została przygotowana do wdrożenia na Cloudflare Workers. Oto kompletny przewodnik:

## Wymagania wstępne

1. Konto Cloudflare (darmowe)
2. Wrangler CLI zainstalowany globalnie: `npm install -g wrangler`
3. Klucze API dla:
   - OpenAI API (dla modeli GPT)
   - OpenRouter API (dla modeli DeepSeek i innych)
   - Google AI API (dla modeli Gemini)

## Kroki wdrożenia

### 1. Zaloguj się do Cloudflare
```bash
wrangler auth login
```

### 2. Skonfiguruj klucze API
```typescript
// Edytuj workers/worker.ts i wstaw swoje klucze API:
const API_KEYS = {
  OPENAI_API_KEY: 'sk-your-actual-openai-key',
  OPENROUTER_API_KEY: 'sk-or-v1-your-actual-openrouter-key', 
  GOOGLE_AI_API_KEY: 'your-actual-google-ai-key'
};
```

### 3. Wdróż na Cloudflare Pages

**Opcja A: Przez dashboard Cloudflare Pages**
1. Idź do Cloudflare Dashboard > Pages
2. Podłącz swoje repozytorium GitHub
3. Ustaw build command: `npm run build && mkdir -p build && cp -r dist/public/* build/client/` 
4. Ustaw output directory: `build/client`
5. Kliknij Deploy

**Opcja B: Przez Wrangler**
```bash
# Zbuduj aplikację
npm run build

# Wdróż na Pages  
npx wrangler pages deploy dist/public --project-name ai-chat-app
```

## Obecny stan implementacji

### ✅ Co działa:
- Podstawowa struktura Cloudflare Workers
- Konfiguracja wrangler.toml
- Podstawowe endpointy API (/api/debug, /api/models)
- CORS middleware
- Skrypt budowania

### 🔄 Co wymaga dalszej pracy:
- **Integracja AI**: Adaptery dla OpenAI, OpenRouter, Gemini muszą być dostosowane do środowiska Workers
- **Storage**: System przechowywania wiadomości i sesji (można użyć Cloudflare KV, R2, lub D1)
- **Streaming**: Implementacja Server-Sent Events w Workers (wymaga specjalnej obsługi)
- **Static files**: Obsługa plików statycznych (frontend React)

## Przyszłe ulepszenia

### Dla pełnej funkcjonalności trzeba będzie:

1. **Zastąpić storage**:
   ```typescript
   // Użyć Cloudflare KV lub D1
   const messages = await env.CHAT_STORAGE.get('messages');
   ```

2. **Dostosować AI integrations**:
   ```typescript
   // Workers mają inne API do fetch
   const response = await fetch('https://api.openai.com/v1/chat/completions', {
     headers: { 'Authorization': `Bearer ${env.OPENAI_API_KEY}` }
   });
   ```

3. **Dodać static file serving**:
   ```typescript
   // Użyć Workers Sites lub R2 bucket
   ```

## Komendy

```bash
# Development
wrangler dev                    # Uruchom lokalnie

# Production 
npx esbuild workers/worker.ts --platform=browser --target=es2022 --bundle --format=esm --outfile=dist/worker.js
wrangler deploy                # Wdróż

# Zarządzanie
wrangler tail                  # Zobacz logi
wrangler logs                  # Historia logów
```

## Konfiguracja w wrangler.toml

Główne ustawienia:
- `name`: nazwa aplikacji na Cloudflare
- `main`: plik entry point (dist/worker.js)
- `compatibility_flags`: ["nodejs_compat"] dla wsparcia Node.js API
- `vars`: zmienne środowiskowe publiczne

Aplikacja używa framework Hono dla prostszej obsługi routingu i middleware w Workers.

## Koszt

Cloudflare Workers oferuje darmowy tier:
- 100,000 requestów dziennie
- 10ms CPU time na request
- Wystarczający dla większości zastosowań

## Wsparcie

Po wdrożeniu aplikacja będzie dostępna pod URL typu:
`https://ai-chat-app.your-subdomain.workers.dev`

Endpoint debug: `/api/debug` pokaże status serwera.