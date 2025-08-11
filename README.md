# 🛠️ netrum-monitor

[![Built with Node.js](https://img.shields.io/badge/Built%20with-Node.js-green?logo=node.js)](https://nodejs.org/)
[![Deployed on Netrum Labs](https://img.shields.io/badge/Deployed%20on-Netrum%20Labs-blue)](https://netrum.io)
[![Mining Speed](https://img.shields.io/badge/Speed-5.3_H%2Fs-orange)](#)
[![Uptime](https://img.shields.io/badge/Uptime-99.99%25-brightgreen)](#)
[![Netrum Status](https://img.shields.io/badge/Netrum-Mining_Active-blue)](#)
[![Node Version](https://img.shields.io/badge/node-%3E=18.0.0-green)](https://nodejs.org/)
[![Auto Start](https://img.shields.io/badge/Auto--Start-Systemd-blue)](#)
[![Last Update](https://img.shields.io/github/last-commit/KaelVNode/netrum-monitor)](https://github.com/KaelVNode/netrum-monitor/commits/main)
[![License](https://img.shields.io/github/license/KaelVNode/netrum-monitor)](LICENSE)

A modular log watcher for the Netrum blockchain miner.  
Parses real-time logs, auto-claims rewards, and sends Telegram alerts — non-intrusively.

---

## 📌 Prerequisites

> ⚠️ **This script must run on the same server as the mining process.**  
> It relies on output from `netrum-mining-log`.

You’ll need:

### ✅ Telegram Bot Token
- Create via [@BotFather](https://t.me/BotFather)
- Save the token (e.g., `123456789:ABCDEF...`)

### ✅ Telegram Chat ID
- Send a message to your bot
- Use [@userinfobot](https://t.me/userinfobot) or
  ```
  https://api.telegram.org/bot<your_token>/getUpdates
  ```

---

## ✨ Features

- Modular design (split logic by feature)
- Real-time log parser for `netrum-mining-log`
- Telegram alerts: mining progress, status, speed, mined amount
- Auto-claim when mining reaches 100% or "Claim Pending"
- Balance checking via public Base RPC
- Auto-restarts log listener every N minutes
- CLI or `.env`-based config (interactive or auto)

---

## 📦 Requirements

> 💡 Node.js v18+ required (for built-in `fetch`)  
> Use `nvm` or a package manager to install.

---

## 🔧 Installation

### 1. Clone & Install

```bash
git clone https://github.com/KaelVNode/Saandy-netrum-monitor.git
cd Saandy-netrum-monitor
npm install
```

---

### 2. Run

#### 🔹 Option A — Manual (Interactive)

```bash
npm start
```

You’ll be prompted for:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `WALLET_ADDRESS`
- Timeout in minutes (default 5)

> Values will be stored in `.env` for future use.

#### 🔹 Option B — Auto Mode

```bash
npm start -- --mode=auto --token=YOUR_BOT_TOKEN --chat=CHAT_ID --wallet=0xYourWallet --timeout=5
```

Or define them in `.env`:

```env
TELEGRAM_BOT_TOKEN=your_token
TELEGRAM_CHAT_ID=your_chat_id
WALLET_ADDRESS=0xYourWallet
TIMEOUT_MINUTES=5
```

Then run:

```bash
npm start
```

---

### 3. Run in Background (Optional)

```bash
screen -S netrum
npm start
```

Detach with: `Ctrl + A`, then `D`  
Reattach with: `screen -r netrum`

---

## ✉️ Example Telegram Messages

🔹 Mining Update:

<img width="146" height="116" alt="image" src="https://github.com/user-attachments/assets/f92ce8e3-d2c1-4fc0-bdbc-42c27dcb6c53" />

🔹 Successful Claim:

<img width="461" height="64" alt="image" src="https://github.com/user-attachments/assets/6311fdfa-a39d-4367-9a5c-e8f70bb08670" />

🔹 Failed Claim:

<img width="135" height="71" alt="image" src="https://github.com/user-attachments/assets/ec422c9e-196a-4b02-ba4b-74f71eba2732" />

---

## 🪵 Log Source

This script listens to:

```bash
netrum-mining-log
```

Expected log format:
```text
14:22:01 | 98% | Mined: 0.03 | Speed: 5.27 H/s | Status: ACTIVE
```

---

## 📄 License

MIT License © 2025 [Saandy](https://github.com/KaelVNode/netrum-monitor)  
Feel free to fork, modify, and use in your Netrum setup.
