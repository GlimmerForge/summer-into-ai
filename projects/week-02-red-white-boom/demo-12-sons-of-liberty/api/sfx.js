export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { text, duration_seconds = 3.0 } = body || {};

  const elevenKey = (process.env.ELEVENLABS_API_KEY || '').replace(/^﻿/, '').trim();
  if (!elevenKey) {
    return res.status(404).json({ error: 'No key' });
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': elevenKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text,
        duration_seconds,
        prompt_influence: 0.3
      })
    });

    if (!response.ok) return res.status(502).json({ error: 'SFX generation failed' });

    const buffer = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', buffer.byteLength);
    res.send(Buffer.from(buffer));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
