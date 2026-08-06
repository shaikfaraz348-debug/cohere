# Co.Here local website + Telegram + n8n demonstration

This package contains the exact Co.Here website prototype source plus a small
local integration that demonstrates:

```text
Telegram user
      ↓
Python polling bridge
      ↓
n8n local webhook
      ↓
FastAPI
      ↓
PostgreSQL Pending Submission
      ↓
Co.Here website Review Queue
```

The Python bridge is used only for the local demonstration. Telegram cannot
call `localhost` directly from the internet, so the bridge polls Telegram from
the laptop and forwards each message to the local n8n webhook.

For a future hosted service, replace the polling bridge with n8n's Telegram
Trigger and give n8n a public HTTPS address.

## Important security action

The Telegram token previously shared in chat must be treated as exposed.

1. Open **@BotFather** in Telegram.
2. Use `/mybots`.
3. Select the Co.Here bot.
4. Open **API Token** and revoke/regenerate the token.
5. Use only the new token below.
6. Never paste the token into source code, screenshots or a portfolio.

## What is real in this local demonstration?

- A real Telegram message is received.
- A real n8n workflow is executed.
- FastAPI controls the guided conversation and validates the request.
- PostgreSQL stores the conversation state and pending submission.
- The website reads pending submissions from FastAPI.
- A Liaison decision in the website updates the submission status.

The community records and organiser identity remain demonstration data. This
is not yet a secure public production service.

## Before starting

Install:

1. **Docker Desktop for Mac**
2. **Node.js 22 or newer**
3. **Python 3.9 or newer**

Check them in Terminal:

```bash
docker --version
node --version
python3 --version
```

## Part 1 — Start PostgreSQL, FastAPI and n8n

Open Terminal and enter:

```bash
cd /path/to/cohere-technical-prototype/local-demo
docker compose up --build -d
```

Replace `/path/to/cohere-technical-prototype` with the folder location on your
Mac.

Check the backend:

```text
http://localhost:8000/health
```

The browser should show:

```json
{"status":"ok"}
```

Open n8n:

```text
http://localhost:5678
```

On the first visit, n8n asks you to create a local owner account. This account
exists only in your local n8n installation.

## Part 2 — Import and activate the n8n workflow

1. Open n8n at `http://localhost:5678`.
2. Select **Import from File**.
3. Choose:

```text
local-demo/n8n/CoHere_Local_Telegram_Bridge.json
```

4. You should see three connected blocks:

```text
Receive Telegram Message
          ↓
Send to Co.Here FastAPI
          ↓
Return Bot Reply
```

5. Save the workflow.
6. Switch the workflow to **Active**.

The active webhook address is:

```text
http://localhost:5678/webhook/cohere-telegram-local
```

## Part 3 — Start the Telegram polling bridge

Open a second Terminal window:

```bash
cd /path/to/cohere-technical-prototype/local-demo/telegram-bridge
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
```

Set the new BotFather token without adding it to the code:

```bash
export TELEGRAM_BOT_TOKEN="PASTE_THE_NEW_TOKEN_HERE"
export N8N_WEBHOOK_URL="http://localhost:5678/webhook/cohere-telegram-local"
python bridge.py
```

Keep this Terminal window open while demonstrating the bot.

In Telegram, open the bot and send:

```text
/start
```

Select **2. Add event** and answer the guided questions. After `Confirm`, the
bot returns a reference and says that the submission is pending review.

## Part 4 — Start the Co.Here website

Open a third Terminal window:

```bash
cd /path/to/cohere-technical-prototype
cp .env.local.example .env.local
npm install
npm run dev
```

Open:

```text
http://localhost:5173
```

Select **Review queue**. The Telegram submission should appear within about
three seconds.

Select the submission and choose:

- **Approve record**
- **Request clarification**
- **Reject**

The decision is stored in PostgreSQL. In Telegram, choose **Check submission
status** and enter the reference to retrieve the new status.

## What each running window does

| Window | Responsibility |
|---|---|
| Docker Desktop | Runs PostgreSQL, FastAPI and n8n |
| Telegram bridge Terminal | Receives Telegram messages through polling |
| Website Terminal | Runs the Co.Here interface on localhost |
| Browser | Shows n8n, FastAPI health and the Co.Here website |

## Stop the demonstration

In the Telegram bridge and website Terminal windows, press:

```text
Control + C
```

Then stop the containers:

```bash
cd /path/to/cohere-technical-prototype/local-demo
docker compose down
```

The database and n8n configuration remain in Docker volumes. To remove all
local demonstration data as well:

```bash
docker compose down -v
```

Only use `-v` when you intentionally want to delete the saved local data.

## Common problems

### The bot says the local service is unavailable

Check:

1. Docker Desktop is running.
2. The n8n workflow is Active.
3. The webhook URL uses `/webhook/`, not `/webhook-test/`.
4. `http://localhost:8000/health` returns `{"status":"ok"}`.

### The website does not show the Telegram submission

Check:

1. `.env.local` contains `NEXT_PUBLIC_API_URL=http://localhost:8000`.
2. Restart `npm run dev` after creating `.env.local`.
3. The submission was confirmed in Telegram.
4. Open the browser developer console only if the earlier checks succeed.

### Telegram reports a conflict

Only one process should use the bot token at a time. Stop any older `bot.py`
Terminal process before starting `bridge.py`.

### Port already in use

The demonstration uses:

- Website: `5173`
- FastAPI: `8000`
- n8n: `5678`
- PostgreSQL: `5432`

Stop the other program using that port or change the corresponding port in the
configuration.

## Production changes required later

Before real public use:

- Host the website, FastAPI, PostgreSQL and n8n online.
- Use a public HTTPS domain.
- Replace the polling bridge with the n8n Telegram Trigger or WhatsApp Cloud
  API.
- Store secrets in a secure secret manager.
- Verify organiser identity and permissions.
- Add staff authentication and role-based access.
- Add consent, privacy, retention and audit rules.
- Add backups, monitoring, error handling and rate limits.
- Complete security, usability and data-quality testing with HIH.

