// api/send-file.js
// Receives a processed image from the Mini App and sends it to the user via the bot.

const BOT_TOKEN = process.env.8812857538:AAEUD96Ltzqmxrx_uNX2K8n-xQEh7q-RSq0;
const WEBHOOK_SECRET = process.env.Hello;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '25mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Verify the request comes from our Mini App
  const secret = req.headers['x-pocketboard-secret'];
  if (!WEBHOOK_SECRET || secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  try {
    const { chatId, imageBase64, filename, caption } = req.body || {};

    if (!chatId || !imageBase64) {
      return res.status(400).json({ ok: false, error: 'missing_fields' });
    }

    // Strip data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Reject files larger than 20MB (Telegram photo limit is 10MB, doc limit is 50MB)
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
      return res.status(502).json({ ok: false, error: 'telegram_failed', detail: tgData.description });
    }

    return res.status(200).json({ ok: true, messageId: tgData.result.message_id });
  } catch (err) {
    console.error('send-file error:', err);
    return res.status(500).json({ ok: false, error: 'internal_error' });
  }
}
