export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { text } = body;

  if (!text) return res.status(400).json({ error: 'Missing text' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ELEVENLABS_API_KEY not set' });

  try {
    const r = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: { stability: 0.55, similarity_boost: 0.75 },
        }),
      }
    );

    if (!r.ok) {
      const errText = await r.text();
      console.error('ElevenLabs error:', r.status, errText);
      return res.status(502).json({ error: `ElevenLabs returned ${r.status}` });
    }

    const buf = await r.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.status(200).send(Buffer.from(buf));
  } catch (err) {
    console.error('voice error:', err);
    res.status(500).json({ error: err.message });
  }
}
