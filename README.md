# Automation Center

Lokale Automationszentrale für Instagram-Content, E-Mail-Automation und Marketing.

## Setup

```bash
# 1. Dependencies installieren
npm install

# 2. Umgebungsvariablen konfigurieren
cp .env.example .env.local
# → ANTHROPIC_API_KEY eintragen

# 3. Datenbank initialisieren
npm run db:push

# 4. App starten
npm run dev
```

Öffne http://localhost:3333

## Module

### M3: E-Mail-Automation (implementiert)
- IMAP-Integration (Gmail, IMAP)
- KI-Vorbeantwortung via Claude API
- User-Approval-Flow (Entwürfe prüfen, bearbeiten, senden)
- Batch-Verarbeitung & Priorisierung

### M2: Instagram-Pipeline (in Entwicklung)
- Bildgenerierung via DALL-E
- Skripterstellung via Claude API
- Instagram Graph API Posting
- Content-Kalender

### M4: Dashboard (geplant)
- Übersichts-Interface
- Analytics & Reporting
