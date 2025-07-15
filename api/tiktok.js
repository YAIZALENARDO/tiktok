import fetch from 'node-fetch';
import cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;
const TIKTOK_USERNAME = 'aidreamgirls';

const dataPath = path.join('/tmp', 'tiktok-stats.json'); // ephemeral but works for simple use

export default async function handler(req, res) {
  try {
    // 1. Fetch TikTok page
    const url = `https://www.tiktok.com/@${TIKTOK_USERNAME}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0',
      },
    });

    const html = await response.text();

    // 2. Extract embedded JSON data
    const match = html.match(/<script id="SIGI_STATE" type="application\/json">(.*?)<\/script>/);
    if (!match) return res.status(500).json({ error: 'TikTok data not found' });

    const rawJson = JSON.parse(match[1]);
    const stats = rawJson.UserModule?.stats?.[TIKTOK_USERNAME];

    if (!stats) return res.status(500).json({ error: 'User stats missing' });

    const followers = stats.followerCount;
    const likes = stats.heart;

    // 3. Load previous stats (from temp file)
    let previous = {};
    if (fs.existsSync(dataPath)) {
      previous = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    }

    // 4. Compare and send Telegram message if changed
    if (!previous.followers || previous.followers !== followers) {
      const message = `📢 TikTok Update (@${TIKTOK_USERNAME})\n👣 Followers: ${followers}\n❤️ Likes: ${likes}\n➡️ Previous: ${previous.followers ?? 'none'}`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: CHAT_ID,
          text: message,
        }),
      });

      // Save current stats
      fs.writeFileSync(dataPath, JSON.stringify({ followers, likes }));
    }

    res.status(200).json({ success: true, followers, likes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

