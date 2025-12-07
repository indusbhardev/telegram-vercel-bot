// api/webhook.js
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const API_BASE = `https://api.telegram.org/bot${TELEGRAM_TOKEN}`;
const FILE_BASE = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("ok");

  try {
    const update = req.body || {};
    const message = update.message || update.edited_message;
    if (!message) return res.status(200).send("ok");

    const chatId = message.chat && message.chat.id;
    if (!chatId) return res.status(200).send("ok");

    // Choose file object
    let fileObj = null;
    if (message.document) fileObj = message.document;
    else if (message.video) fileObj = message.video;
    else if (message.audio) fileObj = message.audio;
    else if (message.photo && Array.isArray(message.photo)) fileObj = message.photo[message.photo.length - 1];

    if (!fileObj || !fileObj.file_id) {
      await fetch(`${API_BASE}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: "Send me a file (document/photo/video/audio) and I will return a public link." })
      });
      return res.status(200).send("ok");
    }

    const fileId = fileObj.file_id;
    const gf = await fetch(`${API_BASE}/getFile?file_id=${encodeURIComponent(fileId)}`);
    const gfJson = await gf.json();

    if (!gfJson.ok || !gfJson.result || !gfJson.result.file_path) {
      await fetch(`${API_BASE}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: chatId, text: "Failed to retrieve file path from Telegram." })
      });
      return res.status(200).send("ok");
    }

    const filePath = gfJson.result.file_path;
    const publicLink = `${FILE_BASE}/${filePath}`;

    await fetch(`${API_BASE}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: `Here is your file link:\n${publicLink}` })
    });

    return res.status(200).send("ok");
  } catch (err) {
    console.error("Webhook error:", err);
    return res.status(200).send("ok");
  }
  }
