# Run the existing Co.Here project from Downloads

This project keeps its original Telegram conversation, n8n workflow, FastAPI,
PostgreSQL and Docker health checks. Only the website theme was changed.

## Terminal 1 — Docker services

```bash
cd ~/Downloads/CoHere_Technical_Prototype_Local_n8n/local-demo
docker compose up --build -d
```

Check the backend at http://localhost:8000/health and open n8n at
http://localhost:5678.

Import and activate:

```text
local-demo/n8n/CoHere_Local_Telegram_Bridge.json
```

## Terminal 2 — Telegram bridge

```bash
cd ~/Downloads/CoHere_Technical_Prototype_Local_n8n/local-demo/telegram-bridge
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
export TELEGRAM_BOT_TOKEN="PASTE_YOUR_NEW_BOTFATHER_TOKEN_HERE"
export N8N_WEBHOOK_URL="http://localhost:5678/webhook/cohere-telegram-local"
python bridge.py
```

Keep Terminal 2 open. Send `/start` to the real Telegram bot.

## Terminal 3 — Figma-themed website

```bash
cd ~/Downloads/CoHere_Technical_Prototype_Local_n8n
printf 'NEXT_PUBLIC_API_URL=http://localhost:8000\n' > .env.local
npm install
npm run dev
```

Open http://localhost:5173 and select **Review queue**. A confirmed Telegram
submission appears automatically within approximately three seconds.
