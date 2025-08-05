export function createMiner({ telegramSend, getBalances }) {
  let mining = false;
  let minedAmount = 0;
  let startTime = null;
  let intervalId = null;

  const emojis = {
    pickaxe: '⛏️',
    clock: '⏱️',
    progress: '📊',
    money: '💰',
    bolt: '⚡',
    status: '✅',
  };

  function formatDuration(ms) {
    const h = Math.floor(ms / 3600000);
    const m = Math.floor((ms % 3600000) / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `${h}h ${m}m ${s}s`;
  }

  function startMining() {
    if (mining) return;
    mining = true;
    minedAmount = 0;
    startTime = Date.now();

    intervalId = setInterval(async () => {
      // Simulasi mining speed
      const speed = 0.000112; // 0.000112 NPT/s
      minedAmount += speed;

      const elapsed = Date.now() - startTime;
      const percent = ((elapsed / (24 * 60 * 60 * 1000)) * 100).toFixed(2); // example: 24h target
      const message = `
${emojis.pickaxe} Mining Update
${emojis.clock} Waktu: ${formatDuration(elapsed)}
${emojis.progress} Progres: ${percent}%
${emojis.money} Mined: ${minedAmount.toFixed(6)}
${emojis.bolt} Speed: ${speed.toFixed(9)}/s
${emojis.status} Status: ACTIVE`.trim();

      await telegramSend(message);
    }, 30 * 60 * 1000); // kirim setiap 30 menit
  }

  function stopMining() {
    if (intervalId) clearInterval(intervalId);
    mining = false;
  }

  return { startMining, stopMining };
}
