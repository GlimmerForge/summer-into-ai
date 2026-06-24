const VOICES = {
  context:   'TxGEqnHWrfWFTfGW9XjX', // Josh  — scene-setting narrator
  text:      'pNInz6obpgDQGcFmaJgB', // Adam  — Declaration document reader
  committee: 'onwK4e9ZLuTAKqWW03F9', // Daniel — committee room narrator
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { text, voiceId } = body || {};
  const VOICE_ID = VOICES[voiceId] || VOICES.committee;
  if (!text) return res.status(400).json({ error: 'text required' });

  if (!process.env.ELEVENLABS_API_KEY) return res.status(503).end();

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
      method: 'POST',
      headers: {
        'xi-api-key': process.env.ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.62, similarity_boost: 0.75 },
      }),
    });

    if (!response.ok) return res.status(500).json({ error: await response.text() });

    const audio = await response.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.send(Buffer.from(audio));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
