import { spawn } from 'child_process';

export function createClaimer({ telegramSend, wallet, stats, getBalances, sendDailyReport }) {
  let claimInProgress = false;

  async function runAutoClaim() {
    if (claimInProgress) return;
    claimInProgress = true;

    await telegramSend('\u{1F916} Starting automatic NPT claim... \u26CF');

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
<b>\u{1F389} Claim Result</b>
\u2705 Status: <b>Success</b>
\u{1F517} Transaction: <a href="${txLink || '#'}">${txLink || 'Link not found'}</a>`);
        sendDailyReport();
      } else {
        telegramSend(`
<b>\u{1F4A5} Claim Result</b>
\u274C Status: <b>Failed</b>
\uD83D\uDCF3 Exit Code: ${code}`); // 📟
      }

      claimInProgress = false;
    });
  }

  return { runAutoClaim };
}
