import { spawn } from 'child_process';

export function createClaimer({ telegramSend, wallet, stats, getBalances, sendDailyReport }) {
  let claimInProgress = false;

  // Emcode emojis
  const emojis = {
    start: 'ðŸ”¥',           // 🔥
    success: 'âœ…',          // ✅
    fail: 'â�Œï¸',           // ❌
    link: 'ðŸ”—',            // 🔗
    claimBox: 'ðŸ“¦',         // 📦
  };

  async function runAutoClaim() {
    if (claimInProgress) return;
    claimInProgress = true;

    await telegramSend(`${emojis.claimBox} Starting automatic NPT claim...`);

    const claimProcess = spawn('node', ['/root/netrum-lite-node/cli/claim-cli.js']);
    let output = '';

    claimProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      if (text.includes('(y/n)')) {
        claimProcess.stdin.write('y\n');
      }
    });

    claimProcess.on('close', (code) => {
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
