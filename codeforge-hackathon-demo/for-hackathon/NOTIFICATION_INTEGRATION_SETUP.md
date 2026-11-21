# 🤖 VibePulse — Telegram Bot & Alerting Setup Guide

This guide walks you through setting up real-time Telegram bot notifications and webhooks for high-priority security findings, incident triggers, and health degradation alerts emitted by VibePulse.

---

## 📲 Step 1: Create a Telegram Bot via BotFather

1. Open Telegram and search for `@BotFather`.
2. Send `/newbot` and follow the prompts:
   - **Bot Name**: `VibePulse Security Guardian Bot`
   - **Bot Username**: `VibePulseSecurityBot`
3. BotFather will output your **HTTP API Bot Token**:
   `7890123456:AAFx_ExampleTokenStringHere`

---

## 🆔 Step 2: Get Your Chat ID

1. Search for `@userinfobot` on Telegram and click **Start**.
2. Copy your numerical **Chat ID** (e.g., `123456789`).

---

## ⚙️ Step 3: Configure Environment Variables

Add the credentials to `apps/api/.env` and `apps/daemon/.env`:

```env
# Telegram Alerting Configuration
TELEGRAM_BOT_TOKEN=7890123456:AAFx_ExampleTokenStringHere
TELEGRAM_CHAT_ID=123456789
ALERT_ON_SEVERITY=CRITICAL
```

---

## 📡 Step 4: Test Alert Notification Payload

Run the automated notification test script:

```bash
uv run python -c "
import urllib.request, json
token = 'YOUR_BOT_TOKEN'
chat_id = 'YOUR_CHAT_ID'
text = '🚨 *VibePulse Security Alert*\n\nFinding: SEC001 Hardcoded Credential\nFile: config/settings.py\nRisk: +15 pts\nStatus: UNMITIGATED'
url = f'https://api.telegram.org/bot{token}/sendMessage'
data = json.dumps({'chat_id': chat_id, 'text': text, 'parse_mode': 'Markdown'}).encode('utf-8')
req = urllib.request.Request(url, data=data, headers={'Content-Type': 'application/json'})
res = urllib.request.urlopen(req)
print('Telegram notification status:', res.status)
"
```

---

## 🔔 Supported Event Triggers

1. **Security Finding Alert**: Triggered immediately when the daemon detects a `CRITICAL` or `HIGH` severity rule violation during file editing.
2. **Incident Creation Alert**: Triggered when a new operational or security incident is logged in the Knowledge Graph.
3. **Health Degradation Alert**: Triggered if the overall project health score drops below 70/100.
