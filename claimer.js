import { spawn } from 'child_process';

export function createClaimer({ telegramSend, wallet, stats, getBalances, sendDailyReport }) {
  let claimInProgress = false;
  const CLAIM_TIMEOUT_MS = 60_000; // 60 detik

  const emojis = {
    start: '🔥',
    success: '✅',
    fail: '❌',
    link: '🔗',
    claimBox: '📦',
  };

  async function runAutoClaim() {
    if (claimInProgress) return;
    claimInProgress = true;

    await telegramSend(`${emojis.claimBox} Starting automatic NPT claim...`);

    const claimProcess = spawn('node', ['/root/netrum-lite-node/cli/claim-cli.js']);
    let output = '';

    const timeout = setTimeout(() => {
      claimProcess.kill('SIGKILL');
      telegramSend(`${emojis.fail} Claim process timed out after ${CLAIM_TIMEOUT_MS / 1000}s`);
      claimInProgress = false;
    }, CLAIM_TIMEOUT_MS);

    claimProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text.length > 5000 ? text.slice(-5000) : text; // Simpan max 5k karakter terakhir
      if (text.includes('(y/n)')) {
        claimProcess.stdin.write('y\n');
      }
    });

    claimProcess.on('close', (code) => {
      clearTimeout(timeout);

      const match = output.match(/https:\/\/basescan\.org\/tx\/\S+/);
      const txLink = match ? match[0] : null;

      if (code === 0) {
        stats.claims += 1;
        telegramSend(`
<b>${emojis.success} Claim Result</b>
Status: Success
${emojis.link} Transaction: <a href="${txLink || '#'}">${txLink || 'Link not found'}</a>`.trim());
        sendDailyReport();
      } else {
        telegramSend(`
<b>${emojis.fail} Claim Result</b>
Status: Failed
Exit Code: ${code}`.trim());
      }

      claimInProgress = false;
    });
  }

  return { runAutoClaim };
}
