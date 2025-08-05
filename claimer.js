import { spawn } from 'child_process';

export function createClaimer({ telegramSend, wallet, stats, getBalances, sendDailyReport }) {
  let claimInProgress = false;

  const emojis = {
    start: '🔥',
    success: '✅',
    fail: '❌',
    link: '🔗',
    claimBox: '📦',
  };

  async function runAutoClaim() {
    if (claimInProgress) {
      await telegramSend(`${emojis.fail} Claim already in progress, skipping.`);
      return;
    }

    claimInProgress = true;
    await telegramSend(`${emojis.claimBox} Starting automatic NPT claim...`);

    const claimProcess = spawn('node', ['/root/netrum-lite-node/cli/claim-cli.js'], {
      detached: true,
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    let output = '';
    const timeoutMs = 2 * 60 * 1000; // 2 minutes timeout
    const timeout = setTimeout(() => {
      claimProcess.kill('SIGKILL');
      telegramSend(`${emojis.fail} Claim timed out and was killed (>${timeoutMs / 1000}s)`);
      claimInProgress = false;
    }, timeoutMs);

    claimProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      if (text.includes('(y/n)')) {
        claimProcess.stdin.write('y\n');
      }
    });

    claimProcess.stderr.on('data', (data) => {
      output += data.toString();
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
Exit Code: ${code}
<pre>${output.slice(-500)}</pre>`.trim());
      }

      claimInProgress = false;
    });
  }

  return { runAutoClaim };
}
