import { spawn } from 'child_process';

function runMiningLogMonitor({ telegramSend, timeout, stats, runAutoClaim }) {
  let lastSent = 0;
  const rateLimitMs = 30_000;

  // Semua emoji dikonversi ke Unicode escape
  const emojis = {
    chart: '\u{1F4C8}',   // 📈
    clock: '\u{23F0}',     // ⏰
    progress: '\u{1F4CA}', // 📊
    mined: '\u26CF',       // ⛏
    speed: '\u23E9',       // ⏩
    status: '\u{1F3C1}',   // 🏁
    claim: '\u{1F4B0}',    // 💰
  };

  function start() {
    const logProcess = spawn('netrum-mining-log');
    console.log('Started mining monitor...');

    logProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(Boolean);

      for (const line of lines) {
        if (line.includes('Mined') || line.includes('Speed')) {
          const parts = line.split('|').map(p => p.trim());
          if (parts.length < 5) continue;

          const mined = parseFloat(parts[2]?.replace('Mined:', '') || 0);
          if (!isNaN(mined)) stats.mined = mined;

          const message = `
<b>${emojis.chart} Mining Update</b>
${emojis.clock} <b>Waktu:</b> ${parts[0]}
${emojis.progress} <b>Progres:</b> ${parts[1]}
${emojis.mined} <b>Mined:</b> ${mined}
${emojis.speed} <b>Speed:</b> ${parts[3]}
${emojis.status} <b>Status:</b> ${parts[4]}`.trim();

          const now = Date.now();
          if (now - lastSent >= rateLimitMs) {
            telegramSend(message);
            lastSent = now;
          }

          if (
            parts[4]?.includes('Claim Pending') ||
            parts[1]?.includes('100.00%')
          ) {
            runAutoClaim();
          }
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

export { runMiningLogMonitor };
