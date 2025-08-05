import { spawn } from 'child_process';

export function runMiningLogMonitor({ telegramSend, timeout, stats, runAutoClaim }) {
  let lastSent = 0;
  const rateLimitMs = 30_000; // 30 detik

  // Emoji encoded (emcode)
  const emojis = {
    chart: 'ðŸ“Š',      // 📊
    clock: 'â›°ï¸',      // ⏰
    progress: 'ðŸ“…',    // 📅
    mined: 'ðŸ’°',       // 💰
    speed: 'âš¡',         // ⚡
    status: 'âœ…',        // ✅
    claim: 'ðŸ“¦',        // 📦
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
