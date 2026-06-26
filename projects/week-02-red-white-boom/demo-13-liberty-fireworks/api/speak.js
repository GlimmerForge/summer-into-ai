export const config = { api: { bodyParser: true } };

// Different voice per shopkeeper character
const VOICES = {
  powder:     'pNInz6obpgDQGcFmaJgB', // Adam — deep, gruff (Old Jacob)
  ironmonger: '21m00Tcm4TlvDq8ikWAM', // Rachel — sharp, precise (Mistress Hawthorne)
  general:    'yoZ06aMxZJJ28mfd3POQ', // Sam — young, chatty (Young Thomas)
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { text, shop } = body;
  if (!text) return res.status(400).end();

  const voiceId = VOICES[shop] || VOICES.powder;

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_monolingual_v1',
      voice_settings: { stability: 0.55, similarity_boost: 0.75 },
    }),
  });

  if (!r.ok) { res.status(502).end(); return; }

  const buf = await r.arrayBuffer();
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  res.end(Buffer.from(buf));
}
