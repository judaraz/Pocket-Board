// api/send-file.js
// Receives a processed image from the Mini App and sends it to the user via the bot.
// Auth: shared secret header (x-pocketboard-secret). Client sends "Hello".
// You only need to set TELEGRAM_BOT_TOKEN in Vercel env vars.

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
// The Mini App sends this value in the x-pocketboard-secret header.
// Hard-coded per your request. Change both sides if you want a different value.
const SHARED_SECRET = 'Hello';

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req, res) {
  // CORS — allow the Mini App origin to call this
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-pocketboard-secret');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Verify the request comes from our Mini App via shared secret
  const secret = req.headers['x-pocketboard-secret'];
  if (!secret || secret !== SHARED_SECRET) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  // Ensure the bot token is configured
  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return res.status(500).json({ ok: false, error: 'bot_token_missing' });
  }

  try {
    const { chatId, imageBase64, filename, caption } = req.body || {};

    if (!chatId || !imageBase64) {
      return res.status(400).json({ ok: false, error: 'missing_fields' });
    }

    // Strip data URL prefix if present
    const base64Data = String(imageBase64).replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Reject oversized files (Telegram document limit is 50MB, we cap at 20MB)
    if (buffer.length > 20 * 1024 * 1024) {
      return res.status(413).json({ ok: false, error: 'file_too_large' });
    }

    // Build multipart form for Telegram sendDocument
    const form = new FormData();
    form.append('chat_id', String(chatId));
    form.append('document', new Blob([buffer]), filename || 'pocketboard.png');
    if (caption) form.append('caption', caption);

    const tgRes = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendDocument`, {
      method: 'POST',
      body: form,
    });

    const tgData = await tgRes.json();

    if (!tgData.ok) {
      console.error('Telegram API error:', tgData);
      return res.status(502).json({
        ok: false,
        error: 'telegram_failed',
        detail: tgData.description || 'unknown'
      });
    }

    return res.status(200).json({ ok: true, messageId: tgData.result.message_id });
  } catch (err) {
    console.error('send-file error:', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}
