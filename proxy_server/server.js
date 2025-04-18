import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { config } from 'dotenv';
import fetch from 'node-fetch'; // if using Node <18

config(); // load .env

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

app.post('/chat', async (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ error: "Missing message" });

  try {
    const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta-llama/llama-4-scout-17b-16e-instruct",  // for looking around model choice: https://console.groq.com/docs/models
        messages: [
          { role: "system", content: "You are a helpful assistant for machine learning pipelines." },
          { role: "user", content: message }
        ],
        temperature: 0.7
      })
    });

    const data = await groqRes.json();
    if (data.error) throw new Error(data.error.message);
    res.json({ reply: data.choices[0].message.content });

  } catch (err) {
    console.error("🔥 Groq API Error:", err.message || err);
    res.status(500).json({ error: "Groq API call failed" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Groq proxy server running at http://localhost:${PORT}`);
});
