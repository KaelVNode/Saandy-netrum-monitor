import { spawn } from 'child_process';
import { E } from './symbol.js';

// --- helpers ---
function stripEmojis(s = '') {
  // hapus emoji & variation selector
  return String(s).replace(/[\p{Extended_Pictographic}\uFE0F]/gu, '');
}
function formatTimeToHms(s) {
  // buang semua selain digit & colon, lalu format "HH:MM:SS" -> "5h 47m 18s"
  const clean = String(s).replace(/[^\d:]/g, '');
  const m = clean.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
  if (!m) return clean || s;
  const [, hh, mm, ss] = m;
  return `${Number(hh)}h ${Number(mm)}m ${Number(ss)}s`;
}
function titleCaseWords(str = '') {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}
function normalizeStatus(s = '') {
  // hapus emoji & simbol non-huruf, rapikan spasi, jadi Title Case
  const noEmoji = stripEmojis(s);
  const lettersOnly = noEmoji.replace(/[^A-Za-z ]+/g, ' ').replace(/\s+/g, ' ').trim();
  return titleCaseWords(lettersOnly);
}
// 12-slot progress bar
function makeProgressBar(pct, slots = 12) {
  const filled = Math.max(0, Math.min(slots, Math.round((pct / 100) * slots)));
  return '[' + E.barFull.repeat(filled) + E.barEmpty.repeat(slots - filled) + `] ${pct.toFixed(2)}%`;
}

export function runMiningLogMonitor({ telegramSend, timeout, stats, runAutoClaim }) {
  let lastSent = 0;
  const rateLimitMs = 30_000;

  function start() {
    const logProcess = spawn('netrum-mining-log');
    console.log('Started mining monitor...');

    logProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);

      for (const line of lines) {
        // contoh: "06:23:44 | 73.35% | Mined: 4.805168 | Speed: 0.000076/s | Status: ACTIVE"
        if (!line.includes('Mined') && !line.includes('Speed')) continue;

        const parts = line.split('|').map(p => p.trim());
        if (parts.length < 5) continue;

        const time = formatTimeToHms(parts[0]);

        const pct = parseFloat(parts[1].replace(/[^\d.]/g, '')) || 0;
        const minedVal = parseFloat(
          parts[2].replace(/.*Mined:\s*/i, '').replace(/[^\d.]/g, '')
        ) || 0;
        const speedText = stripEmojis(
          parts[3].replace(/.*Speed:\s*/i, '').trim()
        );
        const statusText = normalizeStatus(
          parts[4].replace(/.*Status:\s*/i, '').trim()
        );

        if (!isNaN(minedVal)) stats.mined = minedVal;

        const bar = makeProgressBar(pct, 12);
        const divider = E.sep.repeat(28);

        // dua spasi setelah "Time:" & "Status:" sesuai permintaan
        const body =
`<b>${E.chart} Mining Update</b>
${divider}
${E.clock} Time:  ${time}
${E.progress} Progress: ${bar}
${E.mined} Mined: ${minedVal}
${E.speed} Speed: ${speedText}
${E.status} Status:  ${statusText}
${divider}`;

        const now = Date.now();
        if (now - lastSent >= rateLimitMs) {
          telegramSend(body.trim());
          lastSent = now;
        }

        // trigger auto-claim saat 100% atau status mengandung "Claim Pending"
        if (statusText.toLowerCase().includes('claim pending') || pct >= 100) {
          telegramSend(`${E.claim} Auto-claim triggered (${pct.toFixed(2)}%) ${E.bolt}`);
          runAutoClaim();
        }
      }
    });

    logProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    logProcess.on('error', (err) => {
      console.error('Gagal menjalankan proses:', err);
    });

    setTimeout(() => {
      console.log(`Restarting mining log after ${timeout / 1000}s...`);
      logProcess.kill();
      start();
    }, timeout);
  }

  start();
}
