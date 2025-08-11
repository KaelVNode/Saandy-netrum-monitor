import { spawn } from 'child_process';
import { E } from './symbol.js';

// --- helpers ---
function toFloatSafe(x) {
  const n = parseFloat(String(x).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
function extractClaimAmountFromOutput(out) {
  // coba beberapa pola umum di CLI/Explorer
  const text = String(out);
  const m1 = text.match(/(?:Claim(?:ed)?|Amount|Transfer)\s*:?\s*([\d.]+)\s*NPT/i);
  if (m1) return toFloatSafe(m1[1]);
  const m2 = text.match(/([\d.]+)\s*NPT/i);
  if (m2) return toFloatSafe(m2[1]);
  return 0;
}
function fmtUTC(ts = Date.now()) {
  const d = new Date(ts);
  const pad = n => String(n).padStart(2, '0');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${pad(d.getUTCDate())} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`;
}
function shortHashOrUrl(u = '') {
  const url = String(u);
  const m = url.match(/0x[a-fA-F0-9]{64}/);
  const hash = m ? m[0] : null;
  if (!hash) return url || 'Link not found';
  return `${hash.slice(0, 10)}…${hash.slice(-8)}`;
}

export function createClaimer({ telegramSend, wallet, stats, getBalances, sendDailyReport }) {
  let claimInProgress = false;

  async function runAutoClaim() {
    if (claimInProgress) return;
    claimInProgress = true;

    await telegramSend(`${E.robot} Starting automatic NPT claim... ${E.pickaxe}`);

    // baca saldo sebelum klaim untuk hitung delta
    let before = null;
    try {
      before = await getBalances(wallet);
    } catch {
      // biarin kosong, nanti fallback ke parse output
    }

    const claimProcess = spawn('node', ['/root/netrum-lite-node/cli/claim-cli.js']);
    let output = '';

    claimProcess.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      if (text.includes('(y/n)')) {
        claimProcess.stdin.write('y\n');
      }
    });

    claimProcess.stderr?.on('data', (data) => {
      // simpan juga error output untuk diagnosa jumlah kalau ada
      output += '\n' + data.toString();
    });

    claimProcess.on('close', async (code) => {
      const divider = E.sep.repeat(28);

      // cari link tx (BaseScan)
      const match = output.match(/https?:\/\/(?:base)?scan\.org\/tx\/\S+/i) || output.match(/https?:\/\/basescan\.org\/tx\/\S+/i);
      const txLink = match ? match[0] : null;

      // hitung amount diklaim
      let amount = extractClaimAmountFromOutput(output); // dari teks
      try {
        const after = await getBalances(wallet);
        if (before && after) {
          const delta = +(after.nptBalance - before.nptBalance).toFixed(6);
          if (delta > 0) amount = delta; // pakai delta jika valid
        }
      } catch { /* ignore */ }

      const timeStr = fmtUTC(Date.now());

      if (code === 0) {
        stats.claims += 1;

        const msg =
`<b>${E.claim} Claim Result</b>
${divider}
${E.check} <b>Status:</b> Success
${E.link} <b>Tx:</b> <a href="${txLink || '#'}">${txLink ? shortHashOrUrl(txLink) : 'Link not found'}</a>
${E.mined} <b>Amount Claimed:</b> ${amount ? amount.toFixed(6) : 'N/A'} NPT
\u{1F4C5} <b>Time:</b> ${timeStr}
${divider}`;

        await telegramSend(msg);
        // kirim daily report setelah sukses
        try { await sendDailyReport(); } catch {}
      } else {
        // ambil baris error yang paling informatif
        const lines = output.split('\n').map(s => s.trim()).filter(Boolean);
        const errLine = lines.find(l => /error|fail|exception/i.test(l)) || `Exit Code ${code}`;

        const msg =
`<b>${E.boom} Claim Result</b>
${divider}
${E.cross} <b>Status:</b> Failed
\u{1F4DC} <b>Reason:</b> ${errLine}
\u{1F4C5} <b>Time:</b> ${timeStr}
${divider}`;

        await telegramSend(msg);
      }

      claimInProgress = false;
    });
  }

  return { runAutoClaim };
}
