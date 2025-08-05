import { spawn } from 'child_process';

export function runMiningLogMonitor({ telegramSend, timeout, stats, runAutoClaim }) {
  let logProcess = null;
  let lastSent = 0;
  const rateLimitMs = 30000;
  let isStopped = false;

  const emojis = {
    chart: '📊',
    clock: '⏰',
    progress: '📅',
    mined: '💰',
    speed: '⚡',
    status: '✅',
    claim: '📦',
  };

  function start() {
    if (isStopped) return;

    if (logProcess) {
      logProcess.kill();
      logProcess = null;
    }

    logProcess = spawn('netrum-mining-log', [], { maxBuffer: 1024 * 10 });
    console.log('Started mining monitor...');

    logProcess.stdout.on('data', (data) => {
      const lines = data.toString().split('\n').filter(line =>
        line.includes('Mined') || line.includes('Speed'));

      for (const line of lines) {
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
    });

    logProcess.stderr.on('data', (data) => {
      console.error(`stderr: ${data}`);
    });

    logProcess.on('close', () => {
      if (!isStopped) {
        console.log(`Restarting mining log after ${timeout / 1000}s...`);
        setTimeout(start, timeout);
      }
    });

    logProcess.on('error', (err) => {
      console.error('Failed to run mining log:', err);
    });
  }

  start();

  return {
    stop: () => {
      console.log('Stopping mining monitor...');
      isStopped = true;
      if (logProcess) logProcess.kill();
    },
    restart: () => {
      console.log('Restarting mining monitor manually...');
      isStopped = false;
      start();
    }
  };
}
