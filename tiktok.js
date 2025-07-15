// tiktok.js (run as a Vercel Edge Function or serverless function)

const fetch = require('node-fetch');
const cheerio = require('cheerio');

const TELEGRAM_TOKEN = 'YOUR_BOT_TOKEN';
const CHAT_ID = 'YOUR_CHAT_ID';
const TIKTOK_USERNAME = 'aidreamgirls';

module.exports = async (req, res) => {
  try {
    const url = `https://www.tiktok.com/@${TIKTOK_USERNAME}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    const html = await response.text();
    const $ = cheerio.load(html);

    const match = html.match(/<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/);
    if (!match) {
      return res.status(500).send('Data not found.');
    }

    const json = JSON.parse(match[1]);
    const stats = json?.UserModule?.stats?.[TIKTOK_USERNAME];

    if (!stats) return res.status(500).send('User stats not found.');

    const followers = stats.followerCount;
    const likes = stats.heart;

    const message = `📢 @${TIKTOK_USERNAME}\n👣 Followers: ${followers}\n❤️ Likes: ${likes}`;
    
    await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({ chat_id: CHAT_ID, text: message }),
    });

    return res.status(200).send('Success! Telegram sent.');

  } catch (err) {
    return res.status(500).send('Error: ' + err.message);
  }
};
