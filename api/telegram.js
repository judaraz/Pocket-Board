// api/telegram.js
const BOT_TOKEN = '8812857538:AAEUD96Ltzqmxrx_uNX2K8n-xQEh7q-RSq0';
const MINIAPP_URL = 'https://pocket-board-nine.vercel.app/';

export default async function handler(req, res) {
    if (req.method === 'POST') {
        try {
            const body = req.body;
            
            if (body.message && body.message.text) {
                const text = body.message.text;
                const chatId = body.message.chat.id;
                const firstName = body.message.from?.first_name || 'User';
                
                if (text.startsWith('/start')) {
                    const parts = text.split(' ');
                    const referralCode = parts[1] || '';
                    
                    console.log('Start command:', { chatId, referralCode });
                    
                    const miniAppUrl = referralCode 
                        ? `${MINIAPP_URL}?startapp=${referralCode}`
                        : MINIAPP_URL;
                    
                    const keyboard = {
                        inline_keyboard: [[
                            {
                                text: '🚀 Open Gram Miner',
                                web_app: { url: miniAppUrl }
                            }
                        ]]
                    };
                    
                    const welcomeMessage = `👋 Welcome ${firstName}!\n\nTap below to start mining GRAM!\n\n⏭️ Minimum Payment 0.05 gram\n⏭️ No Referral Need`;
                    
                    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: chatId,
                            text: welcomeMessage,
                            reply_markup: keyboard
                        })
                    });
                    
                    console.log('Message sent:', await response.json());
                }
            }
            
            res.status(200).json({ ok: true });
        } catch(e) {
            console.error('Error:', e);
            res.status(500).json({ error: e.message });
        }
    } else {
        res.status(200).json({ ok: true, message: 'Webhook is active' });
    }
}
