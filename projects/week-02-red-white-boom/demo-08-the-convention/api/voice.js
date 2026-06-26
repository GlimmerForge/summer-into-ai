// ElevenLabs voice IDs per founder
const VOICE_IDS = {
  jefferson: 'JBFqnCBsd6RMkjVDRZzb', // George — Warm, Captivating Storyteller · British accent
  hamilton:  'pNInz6obpgDQGcFmaJgB', // Adam — Dominant, Firm
  madison:   'onwK4e9ZLuTAKqWW03F9', // Daniel — Steady Broadcaster · British, formal
  mason:     'nPczCjzI2devNBz1zQrb', // Brian — Deep, Resonant · classy, deliberate
  franklin:  'pqHfZKP75CvOlQylNhV4', // Bill — Wise, Mature, Balanced · age: old
};

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { text, founderKey } = body;

  const voiceId = VOICE_IDS[founderKey];
  if (!voiceId) return res.status(400).json({ error: 'Unknown founder' });

  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_turbo_v2_5',
      voice_settings: { stability: 0.45, similarity_boost: 0.75 },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return res.status(response.status).json({ error: err });
  }

  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'no-store');

  const buffer = await response.arrayBuffer();
  res.end(Buffer.from(buffer));
}
