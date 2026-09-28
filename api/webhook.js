// api/webhook.js
// Vercel serverless function — receives Telegram bot updates.
// Only env var needed in Vercel: TELEGRAM_BOT_TOKEN
// Shared secret between this endpoint and Telegram's setWebhook call is "Hello".

const BOT_TOKEN = process.env.8812857538:AAEUD96Ltzqmxrx_uNX2K8n-xQEh7q-RSq0;
const WEBHOOK_SECRET = 'Hello';
const MINIAPP_URL = process.env.MINIAPP_URL || 'https://pocket-board-nine.vercel.app/';

async function tg(method, payload) {
  const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export default async function handler(req, res) {
  // Only accept POST
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'method_not_allowed' });
  }

  // Verify the request really came from Telegram
  const secret = req.headers['x-telegram-bot-api-secret-token'];
  if (!secret || secret !== WEBHOOK_SECRET) {
    return res.status(401).json({ ok: false, error: 'unauthorized' });
  }

  if (!BOT_TOKEN) {
    console.error('TELEGRAM_BOT_TOKEN is not set');
    return res.status(500).json({ ok: false, error: 'bot_token_missing' });
  }

  const update = req.body || {};

  try {
    const msg = update.message || update.edited_message;
    const text = msg?.text || '';
    const chatId = msg?.chat?.id;

    if (!chatId) {
      // Nothing to respond to (callback, inline query, etc.)
      return res.status(200).json({ ok: true });
    }

    // Handle /start — send the Mini App button
    if (text.startsWith('/start')) {
      await tg('sendMessage', {
        chat_id: chatId,
        text:
          '👋 Welcome to *PocketBoard*\n\n' +
          'Your everyday privacy tools, inside Telegram — compress, blur, strip metadata, and more.\n\n' +
          'Everything runs on your device. Files are never uploaded to a server.',
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            {
              text: '🔒 Open PocketBoard',
              web_app: { url: MINIAPP_URL },
            },
          ]],
        },
      });
    }

    // Handle /help
    else if (text.startsWith('/help')) {
      await tg('sendMessage', {
        chat_id: chatId,
        text:
          '*PocketBoard Commands*\n\n' +
          '/start — open the Mini App\n' +
          '/app — open the Mini App\n' +
          '/help — show this message\n\n' +
          '*What you can do:*\n' +
          '• Compress, resize, convert images\n' +
          '• Blur or pixelate sensitive areas\n' +
          '• Strip EXIF/GPS metadata\n' +
          '• Hash text, encode Base64\n' +
          '• Generate passwords and UUIDs',
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔒 Open PocketBoard', web_app: { url: MINIAPP_URL } },
          ]],
        },
      });
    }

    // Handle /app
    else if (text.startsWith('/app')) {
      await tg('sendMessage', {
        chat_id: chatId,
        text: 'Tap below to open PocketBoard:',
        reply_markup: {
          inline_keyboard: [[
            { text: '🔒 Open PocketBoard', web_app: { url: MINIAPP_URL } },
          ]],
        },
      });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    // Log internally but never leak details to Telegram
    console.error('webhook error:', err);
    // Always return 200 so Telegram doesn't retry-storm on errors
    return res.status(200).json({ ok: true });
  }
}
