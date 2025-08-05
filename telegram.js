import fetch from 'node-fetch';

export function createTelegram(token, chatId) {
  async function send(text) {
    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000); // 10 detik timeout

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const json = await res.json();

      if (!json.ok) {
        console.error('Telegram Error:', json);
        throw new Error(json.description || 'Telegram send failed');
      }

    } catch (err) {
      console.warn('Telegram send failed, retrying once...', err.message);

      // Retry sekali jika gagal
      try {
        await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
        });
      } catch (retryErr) {
        console.error('Telegram retry failed:', retryErr.message);
      }
    }
  }

  return { send };
}
