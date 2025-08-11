import { spawn } from 'child_process';
import { E } from './symbol.js';

export function createClaimer({ telegramSend, wallet, stats, getBalances, sendDailyReport }) {
  let claimInProgress = false;

  async function runAutoClaim() {
    if (claimInProgress) return;
    claimInProgress = true;

    await telegramSend(`${E.robot} Starting automatic NPT claim... ${E.pickaxe}`);

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
      const divider = E.sep.repeat(28);

      if (code === 0) {
        stats.claims += 1;
        const successMsg =
`<b>${E.confetti} Claim Result</b>
${divider}
${E.check} Status: <b>Success</b>
${E.link} Tx: ${txLink || 'Link not found'}
${divider}`;
        telegramSend(successMsg);
        sendDailyReport();
      } else {
        const failMsg =
`<b>${E.boom} Claim Result</b>
${divider}
${E.cross} Status: <b>Failed</b>
${E.pager} Exit: ${code}
${divider}`;
        telegramSend(failMsg);
      }

      claimInProgress = false;
    });
  }

  return { runAutoClaim };
}
