export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  // Parse body manually since bodyParser is false (we're streaming binary back)
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  const body = JSON.parse(Buffer.concat(chunks).toString());
  const { text, duration_seconds = 3.0 } = body || {};

  if (!process.env.ELEVENLABS_API_KEY) {
    return res.status(404).json({ error: 'No key' });
  }

  try {
    const response = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
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
