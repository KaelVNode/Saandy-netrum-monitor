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

  // Helper kecil biar judul & prefix beda sesuai mode
  const titleEmoji = mode === 'manual' ? '🧑‍💻' : '🤖';
  const pickaxe = '⛏';
  const bullet = '•';

  async function sendDailyReport() {
    try {
      const { ethBalance, nptBalance } = await getBalances(config.WALLET_ADDRESS);

      // Pakai locale sistem agar jamnya familiar
      const now = new Date().toLocaleString();

      await telegram.send(
        `
<b>${titleEmoji} ${pickaxe} Daily Mining Report ${pickaxe}</b>
🕒 ${bullet} Time: <b>${now}</b>
📊 ${bullet} Mined: <b>${stats.mined.toFixed(6)} NPT</b>
🪙 ${bullet} Claims: <b>${stats.claims}</b>
👛 ${bullet} Wallet: <code>${config.WALLET_ADDRESS}</code>
💰 ${bullet} ETH: <b>${ethBalance.toFixed(6)}</b>
🔷 ${bullet} NPT: <b>${nptBalance.toFixed(6)}</b>
`.trim()
      );

      // reset harian
      stats.mined = 0;
      stats.claims = 0;
    } catch (err) {
      await telegram.send(`🚨 Gagal buat laporan harian: <code>${err?.message || err}</code>`);
    }
  }

  // Kirim laporan pertama saat start
  await sendDailyReport();

  const { runAutoClaim } = createClaimer({
    telegramSend: telegram.send,
    wallet: config.WALLET_ADDRESS,
    stats,
    getBalances,
    sendDailyReport
  });

  // Monitor log miner (notifikasi detail ada di miner.js)
  runMiningLogMonitor({
    telegramSend: telegram.send,
    timeout: config.TIMEOUT_MS,
    stats,
    runAutoClaim
  });

  // Opsional: tanya interaktif untuk kirim laporan on-demand (hanya jika manual)
  if (mode === 'manual') {
    try {
      const ans = await ask('Ketik "report" untuk kirim laporan sekarang (atau Enter untuk skip): ');
      if (String(ans || '').trim().toLowerCase() === 'report') {
        await sendDailyReport();
      }
    } catch (e) {
      // abaikan input error di mode non-interaktif
    }
  }
}

main().catch(async (err) => {
  try {
    const safeMsg = err?.stack || err?.message || String(err);
    const telegram = createTelegram(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID);
    await telegram.send(`🚨 Fatal error di main: <code>${safeMsg}</code>`);
  } catch (_) {
    // terakhir, log ke stderr
  } finally {
    process.exit(1);
  }
});
