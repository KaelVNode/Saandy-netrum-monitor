#!/usr/bin/env node
import './banner.js';
import { getConfig } from './config.js';
import { ask, closeInput } from './utils.js';
import { getBalances } from './balances.js';
import { createTelegram } from './telegram.js';
import { createClaimer } from './claimer.js';
import { runMiningLogMonitor } from './miner.js';
import { E } from './symbol.js';

const args = Object.fromEntries(
  process.argv.slice(2).map(arg => {
    const [k, v] = arg.replace(/^--/, '').split('=');
    return [k, v];
  })
);
const mode = args.mode || 'manual';

async function sendDailyReport(config, stats, telegram) {
  try {
    const { ethBalance, nptBalance } = await getBalances(config.WALLET_ADDRESS);
    const now = new Date().toLocaleString();
    const divider = E.sep.repeat(28);
    const modeIcon = mode === 'manual' ? E.personPc : E.robot;

    const report =
`<b>${modeIcon} ${E.pickaxe} Daily Mining Report ${E.pickaxe}</b>
${divider}
${E.clock} Time: ${now}
${E.pickaxe} Mined: ${stats.mined.toFixed(6)} NPT
${E.coin} Claims: ${stats.claims}
${E.wallet} Wallet: <code>${config.WALLET_ADDRESS}</code>
${E.money} ETH: ${ethBalance.toFixed(6)}
${E.blueDiamond} NPT: ${nptBalance.toFixed(6)}
${divider}`;

    await telegram.send(report.trim());
    stats.mined = 0;
    stats.claims = 0;
  } catch (err) {
    await telegram.send(`${E.warn} Gagal buat laporan harian: <code>${err?.message || err}</code>`);
  }
}

async function main() {
  const config = await getConfig(args, mode);
  if (mode === 'manual') closeInput();

  const stats = { mined: 0, claims: 0 };
  const telegram = createTelegram(config.TELEGRAM_BOT_TOKEN, config.TELEGRAM_CHAT_ID);

  await sendDailyReport(config, stats, telegram);

  const { runAutoClaim } = createClaimer({
    telegramSend: telegram.send,
    wallet: config.WALLET_ADDRESS,
    stats,
    getBalances,
    sendDailyReport: () => sendDailyReport(config, stats, telegram)
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
        await sendDailyReport(config, stats, telegram);
      }
    } catch {}
  }
}

main().catch(async (err) => {
  try {
    const safeMsg = err?.stack || err?.message || String(err);
    const telegram = createTelegram(process.env.TELEGRAM_BOT_TOKEN, process.env.TELEGRAM_CHAT_ID);
    await telegram.send(`${E.warn} Fatal error di main: <code>${safeMsg}</code>`);
  } catch {} finally {
    process.exit(1);
  }
});
