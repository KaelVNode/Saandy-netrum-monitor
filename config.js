import dotenv from 'dotenv';
import { ask } from './utils.js';
dotenv.config();

export async function getConfig(cliArgs, mode = 'manual') {
  let { token, chat, wallet, timeout } = cliArgs;
  let TELEGRAM_BOT_TOKEN = token || process.env.TELEGRAM_BOT_TOKEN;
  let TELEGRAM_CHAT_ID = chat || process.env.TELEGRAM_CHAT_ID;
  let WALLET_ADDRESS = wallet || process.env.WALLET_ADDRESS;
  let timeoutMinutes = timeout || process.env.TIMEOUT_MINUTES;

  if (!TELEGRAM_BOT_TOKEN) {
    if (mode === 'manual') TELEGRAM_BOT_TOKEN = (await ask('Enter TELEGRAM_BOT_TOKEN: ')).trim();
    else throw new Error('Missing TELEGRAM_BOT_TOKEN');
  }

  if (!TELEGRAM_CHAT_ID) {
    if (mode === 'manual') TELEGRAM_CHAT_ID = (await ask('Enter TELEGRAM_CHAT_ID: ')).trim();
    else throw new Error('Missing TELEGRAM_CHAT_ID');
  }

  if (!WALLET_ADDRESS) {
    if (mode === 'manual') WALLET_ADDRESS = (await ask('Enter WALLET_ADDRESS: ')).trim();
    else throw new Error('Missing WALLET_ADDRESS');
  }

  if (!timeoutMinutes && mode === 'manual') {
    timeoutMinutes = await ask('Enter timeout in minutes (default 5): ');
  }

  const timeoutNum = parseInt(timeoutMinutes);
  const TIMEOUT_MS = (!isNaN(timeoutNum) && timeoutNum > 0 ? timeoutNum : 5) * 60000;

  return {
    TELEGRAM_BOT_TOKEN,
    TELEGRAM_CHAT_ID,
    WALLET_ADDRESS,
    TIMEOUT_MS,
  };
}
