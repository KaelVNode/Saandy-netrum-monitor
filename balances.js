import fetch from 'node-fetch';

const rpc = 'https://base-rpc.publicnode.com';
const NPT_CONTRACT = '0xB8c2CE84F831175136cebBFD48CE4BAb9c7a6424';
const TIMEOUT_MS = 10000; // 10 detik
let lastCache = 0;
let cache = { ethBalance: 0, nptBalance: 0 };

export async function getBalances(wallet) {
  const now = Date.now();
  if (now - lastCache < 30_000) return cache; // Cache selama 30 detik

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const [ethRes, nptRes] = await Promise.all([
      fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'eth_getBalance', params: [wallet, 'latest'] }),
        signal: controller.signal
      }),
      fetch(rpc, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: 2, method: 'eth_call',
          params: [{ to: NPT_CONTRACT, data: '0x70a08231000000000000000000000000' + wallet.replace(/^0x/, '') }, 'latest']
        }),
        signal: controller.signal
      }),
    ]);

    clearTimeout(timeout);

    const ethJson = await ethRes.json();
    const nptJson = await nptRes.json();

    const ethBalance = parseInt(ethJson.result || '0', 16) / 1e18;
    const nptBalance = parseInt(nptJson.result || '0', 16) / 1e18;

    cache = { ethBalance, nptBalance };
    lastCache = now;

    return cache;

  } catch (err) {
    clearTimeout(timeout);
    console.error("Error fetching balances:", err);
    return cache; // Gunakan data cache terakhir jika ada error
  }
}
