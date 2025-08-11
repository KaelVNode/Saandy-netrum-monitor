#!/usr/bin/env node
import './banner.js';

import { getConfig } from './config.js';
import { ask, closeInput } from './utils.js';
import { getBalances } from './balances.js';
import { createTelegram } from './telegram.js';
import { createClaimer } from './claimer.js';
import { runMiningLogMonitor } from './miner.js';

const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [k, v] = arg.replace(/^--/, '').split('=');
    return [k, v];
  })
);

const mode = args.mode || 'manual';

async function main() {
  const config = await getConfig(args, mode);
  if (mode === 'manual') closeInput();

  const stats = { mined: 0, claims: 0 };

  const telegram = createTelegram(config.TELEGRAM_BOT_TOKEN, config.TELEGRAM_CHAT_ID);

  // judul & prefix sesuai mode, versi Unicode-escape
  const titleEmoji = mode === 'manual' ? '\u{1F9D1}\u200D\u{1F4BB}' : '\u{1F916}'; // 🧑‍💻 / 🤖
  const pickaxe = '\u26CF'; // ⛏
  const bullet = '\u2022'; // •

  async function sendDailyReport() {
    try {
      const { ethBalance, nptBalance } = await getBalances(config.WALLET_ADDRESS);
      const now = new Date().toLocaleString();

      await telegram.send(
        `
<b>${titleEmoji} ${pickaxe} Daily Mining Report ${pickaxe}</b>
\u{1F552} ${bullet} Time: <b>${now}</b>
\u{1F4CA} ${bullet} Mined: <b>${stats.mined.toFixed(6)} NPT</b>
\u{1FA99} ${bullet} Claims: <b>${stats.claims}</b>
\u{1F45B} ${bullet} Wallet: <code>${config.WALLET_ADDRESS}</code>
\u{1F4B0} ${bullet} ETH: <b>${ethBalance.toFixed(6)}</b>
\u{1F537} ${bullet} NPT: <b>${nptBalance.toFixed(6)}</b>
`.trim()
      );

      stats.mined = 0;
      stats.claims = 0;
    } catch (err) {
      await telegram.send(`\u{1F6A8} Gagal buat laporan harian: <code>${err?.message || err}</code>`);
    }
  }

  await sendDailyReport();

  const { runAutoClaim } = createClaimer({
    telegramSend: telegram.send,
    wallet: config.WALLET_ADDRESS,
    stats,
    getBalances,
    sendDailyReport
  });

  runMiningLogMonitor({
    telegramSend: telegram.send,
    timeout: config.TIMEOUT_MS,
    stats,
    runAutoClaim
  });

  if (mode === 'manual') {
    try {
      const ans = await ask('Ketik "report" untuk kirim laporan sekarang (atau Enter untuk skip): ');
      if (String(ans || '').trim().toLowerCase() === 'report') {
        await sendDailyReport();
      }
    } catch {}
  }
}

main().catch(async (err) => {
  try {
    const safeMsg = err?.stack || err?.message || String(err);
    const telegram = createTelegram(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID);
    await telegram.send(`\u{1F6A8} Fatal error di main: <code>${safeMsg}</code>`);
  } catch {} finally {
    process.exit(1);
  }
});
