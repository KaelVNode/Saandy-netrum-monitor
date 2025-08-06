require('dotenv').config();
const axios = require('axios');
const Decimal = require('decimal.js');
const TelegramBot = require('node-telegram-bot-api');

const RPC_URL = process.env.RPC_URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const WALLET_ADDRESS = process.env.WALLET_ADDRESS.toLowerCase();
const TOKEN_42_ADDRESS = process.env.TOKEN_42_ADDRESS.toLowerCase();
const NATIVE_SYMBOL = process.env.NATIVE_SYMBOL || 'MON';
const EXPLORER_URL = `https://testnet.monadexplorer.com/address/${WALLET_ADDRESS}?tab=Token`;

const bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });

let lastBalance42 = new Decimal(0);
let lastBalanceMon = new Decimal(0);
let hourStartBalance42 = new Decimal(0);
let hourStartBalanceMon = new Decimal(0);
let dayStartBalance42 = new Decimal(0);
let dayStartBalanceMon = new Decimal(0);

async function getERC20Balance(tokenAddress, walletAddress) {
  const data = {
    jsonrpc: '2.0',
    method: 'eth_call',
    params: [{ to: tokenAddress, data: `0x70a08231000000000000000000000000${walletAddress.slice(2)}` }, 'latest'],
    id: 1,
  };
  try {
    const res = await axios.post(RPC_URL, data);
    const result = res.data.result;
    return result ? new Decimal(parseInt(result, 16)).div('1e18') : new Decimal(0);
  } catch (err) {
    console.error('âš« Failed to fetch token 42 balance:', err.message);
    return new Decimal(0);
  }
}

async function getNativeBalance(walletAddress) {
  const data = {
    jsonrpc: '2.0',
    method: 'eth_getBalance',
    params: [walletAddress, 'latest'],
    id: 1,
  };
  try {
    const res = await axios.post(RPC_URL, data);
    const result = res.data.result;
    return result ? new Decimal(parseInt(result, 16)).div('1e18') : new Decimal(0);
  } catch (err) {
    console.error('âš« Failed to fetch MON balance:', err.message);
    return new Decimal(0);
  }
}

async function getLeaderboardData(walletAddress) {
  const url = "https://jc1n4ugo1k.execute-api.us-east-2.amazonaws.com/leaderboard_v2";
  try {
    const response = await axios.get(url, {
      params: {
        period: 'all_time',
        page: 1,
        size: 1,
        wallet_filter: walletAddress
      }
    });
    const results = response.data.results || [];
    if (results.length > 0) return results[0];
  } catch (e) {
    console.error("Failed to fetch leaderboard:", e.message);
  }
  return null;
}

async function monitor() {
  console.log('ðŸ”„ Initializing starting balances...');
  lastBalance42 = await getERC20Balance(TOKEN_42_ADDRESS, WALLET_ADDRESS);
  lastBalanceMon = await getNativeBalance(WALLET_ADDRESS);
  hourStartBalance42 = lastBalance42;
  hourStartBalanceMon = lastBalanceMon;
  dayStartBalance42 = lastBalance42;
  dayStartBalanceMon = lastBalanceMon;

  const startText = `
ðŸ“© <b>Saandy Monitoring Started</b>
- <b>Wallet:</b> <code>${WALLET_ADDRESS.slice(0, 6)}...${WALLET_ADDRESS.slice(-4)}</code>
- <b>Initial 42 Balance:</b> <code>${lastBalance42.toFixed(4)}</code>
- <b>Initial ${NATIVE_SYMBOL} Balance:</b> <code>${lastBalanceMon.toFixed(4)}</code>
- <a href="${EXPLORER_URL}">View on Explorer</a>
- <code>${new Date().toLocaleString()}</code>
`.trim();

  await bot.sendMessage(TELEGRAM_CHAT_ID, startText, { parse_mode: 'HTML' });
  console.log('âœ… Monitoring active... (interval: 60 seconds)');

  setInterval(async () => {
    try {
      const balance42 = await getERC20Balance(TOKEN_42_ADDRESS, WALLET_ADDRESS);
      const balanceMon = await getNativeBalance(WALLET_ADDRESS);
      let notify = false;
      let msg = '';

      const diff42 = balance42.minus(lastBalance42);
      const diffMon = balanceMon.minus(lastBalanceMon);

      if (diff42.gt(0)) {
        msg += `ðŸŸ¢ <b>Token 42</b>\n`;
        msg += `â”œâ”€ Change: <code>+${diff42.toFixed(4)}</code>\n`;
        msg += `â””â”€ Current Balance: <code>${balance42.toFixed(4)}</code>\n\n`;
        lastBalance42 = balance42;
        notify = true;
      }

      if (diffMon.gt(0)) {
        msg += `ðŸŸ¢ <b>${NATIVE_SYMBOL}</b>\n`;
        msg += `â”œâ”€ Change: <code>+${diffMon.toFixed(4)}</code>\n`;
        msg += `â””â”€ Current Balance: <code>${balanceMon.toFixed(4)}</code>\n\n`;
        lastBalanceMon = balanceMon;
        notify = true;
      }

      if (notify) {
        const text = `
<b>ðŸ’¹ Balance Change Detected</b>

ðŸ‘› <b>Wallet:</b> <code>${WALLET_ADDRESS.slice(0, 6)}...${WALLET_ADDRESS.slice(-4)}</code>

${msg.trim()}

ðŸ” <a href="${EXPLORER_URL}">View on Explorer</a>
ðŸ•’ <code>${new Date().toLocaleString()}</code>
`.trim();
        await bot.sendMessage(TELEGRAM_CHAT_ID, text, { parse_mode: 'HTML' });
       // console.log(`[${new Date().toLocaleTimeString()}] âœ… Notification sent.`);
      } else {
       //console.log(`[${new Date().toLocaleTimeString()}] â›³ No balance change.`);
      }
    } catch (err) {
      console.error(`[${new Date().toLocaleTimeString()}] âš« Error:`, err.message);
    }
  }, 60000);

  setInterval(async () => {
    try {
      const current42 = await getERC20Balance(TOKEN_42_ADDRESS, WALLET_ADDRESS);
      const currentMon = await getNativeBalance(WALLET_ADDRESS);
      const earned42 = current42.minus(hourStartBalance42);
      const earnedMon = currentMon.minus(hourStartBalanceMon);
      const leaderboard = await getLeaderboardData(WALLET_ADDRESS);

      let text = `
ðŸ“Š <b>Hourly Earnings Report</b>

ðŸª™ <b>Token 42:</b> <code>${earned42.gte(0) ? '+' : ''}${earned42.toFixed(4)}</code>
ðŸª™ <b>${NATIVE_SYMBOL}:</b> <code>${earnedMon.gte(0) ? '+' : ''}${earnedMon.toFixed(4)}</code>

ðŸ§  <b>Leaderboard</b>
â”œâ”€ Rank: <b>#${leaderboard?.rank || '-'}</b>
â”œâ”€ Wins: <b>${leaderboard?.wins || '-'}</b>
â””â”€ Total Reward: <code>${leaderboard?.total_reward || '-'}</code>

ðŸ•” <b>Time:</b> <code>${new Date().toLocaleTimeString()}</code>
ðŸ”— <a href="${EXPLORER_URL}">View Wallet</a>
`.trim();

      await bot.sendMessage(TELEGRAM_CHAT_ID, text, { parse_mode: 'HTML' });
      console.log(`[${new Date().toLocaleTimeString()}] ðŸ“¤ Hourly report sent.`);

      hourStartBalance42 = current42;
      hourStartBalanceMon = currentMon;
    } catch (err) {
      console.error(`[${new Date().toLocaleTimeString()}] âš« Failed to send hourly report:`, err.message);
    }
  }, 3600000);

  setInterval(async () => {
    try {
      const current42 = await getERC20Balance(TOKEN_42_ADDRESS, WALLET_ADDRESS);
      const currentMon = await getNativeBalance(WALLET_ADDRESS);
      const earned42 = current42.minus(dayStartBalance42);
      const earnedMon = currentMon.minus(dayStartBalanceMon);
      const leaderboard = await getLeaderboardData(WALLET_ADDRESS);

      let text = `
ðŸ“… <b>Daily Earnings Report</b>

ðŸª™ <b>Token 42:</b> <code>${earned42.gte(0) ? '+' : ''}${earned42.toFixed(4)}</code>
ðŸª™ <b>${NATIVE_SYMBOL}:</b> <code>${earnedMon.gte(0) ? '+' : ''}${earnedMon.toFixed(4)}</code>

ðŸ§  <b>Leaderboard</b>
â”œâ”€ Rank: <b>#${leaderboard?.rank || '-'}</b>
â”œâ”€ Wins: <b>${leaderboard?.wins || '-'}</b>
â””â”€ Total Reward: <code>${leaderboard?.total_reward || '-'}</code>

ðŸ“† <b>Date:</b> <code>${new Date().toLocaleDateString()}</code>
ðŸ”— <a href="${EXPLORER_URL}">View Wallet</a>
`.trim();

      await bot.sendMessage(TELEGRAM_CHAT_ID, text, { parse_mode: 'HTML' });
      console.log(`[${new Date().toLocaleTimeString()}] ðŸ“¤ Daily report sent.`);

      dayStartBalance42 = current42;
      dayStartBalanceMon = currentMon;
    } catch (err) {
      console.error(`[${new Date().toLocaleTimeString()}] âš« Failed to send daily report:`, err.message);
    }
  }, 86400000);
}

monitor();
