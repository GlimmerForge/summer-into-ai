export const config = { api: { bodyParser: true } };

// Colonial small-town character voices
const VOICES = {
  powder:     'N2lVS1w4EtoT3dr4eOWO', // Callum — rough, weathered (Old Jacob)
  ironmonger: 'Xb7hH8MSUJpSbSDYk0k2', // Alice — proper British female (Mistress Hawthorne)
  general:    'IKne3meq5aSn9XLyUdCD', // Charlie — young British male (Young Thomas)
};

function stripMarkdown(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/\*(.+?)\*/g, '$1')
    .replace(/\*/g, '')
    .replace(/_(.+?)_/g, '$1')
    .trim();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { text, shop } = body;
  if (!text) return res.status(400).end();

  const voiceId = VOICES[shop] || VOICES.powder;
  const clean = stripMarkdown(text);

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text: clean,
      model_id: 'eleven_turbo_v2',
      voice_settings: { stability: 0.6, similarity_boost: 0.75 },
    }),
  });

  if (!r.ok) { res.status(502).end(); return; }

  const buf = await r.arrayBuffer();
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');
  res.end(Buffer.from(buf));
}
