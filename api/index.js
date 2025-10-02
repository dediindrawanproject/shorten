import express from "express";
import fetch from "node-fetch";

const app = express();
app.use(express.json());

// Ambil token bot Telegram dari Environment Variables Vercel
const TOKEN = process.env.TELEGRAM_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TOKEN}`;

// Function pemendek link pakai Rebrandly (rb.gy)
const shortenWithRebrandly = async (url) => {
  const res = await fetch("https://api.rebrandly.com/v1/links", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "apikey": process.env.REBRANDLY_API_KEY,
    },
    body: JSON.stringify({
      destination: url,
      domain: { fullName: "rebrand.ly" }
    }),
  });

  const data = await res.json();
  if (data.shortUrl) {
    return `https://${data.shortUrl}`;
  } else {
    throw new Error("Rebrandly gagal");
  }
};

// Webhook untuk menerima pesan Telegram
app.post("/api/webhook", async (req, res) => {
  const message = req.body?.message;
  if (!message || !message.text) {
    return res.sendStatus(200);
  }

  const chatId = message.chat.id;
  const text = message.text.trim();

  const urlRegex = /^(https?:\/\/[^\s]+)/i;
  if (!urlRegex.test(text)) {
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "⚠️ Tolong kirimkan link yang valid (mulai dengan http:// atau https://)."
      }),
    });
    return res.sendStatus(200);
  }

  try {
    const shortUrl = await shortenWithRebrandly(text);

    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `🔗 Link asli:\n${text}\n\n👉 Link pendek (rb.gy):\n${shortUrl}`
      }),
    });
  } catch (e) {
    console.error("Error shorten link:", e);
    await fetch(`${TELEGRAM_API}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: "❌ Gagal memendekkan link dengan rb.gy. Coba lagi nanti."
      }),
    });
  }

  res.sendStatus(200);
});

export default app;
