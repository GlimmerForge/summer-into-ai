export const config = { api: { bodyParser: true } };

// Cast for maximum contrast (all from the account's current voice list):
// Washington: Adam — dominant, firm commander
// Franklin:   Bill — old, wise, balanced (the sage)
// Hamilton:   Liam — young, energetic (the firebrand)
// Madison:    Charlie — deep, confident (the scholar)
// Jefferson:  Callum — husky character voice
// Marshall:   Daniel — steady British broadcaster (the bench)
const VOICE_IDS = {
  washington: 'pNInz6obpgDQGcFmaJgB',
  franklin: 'pqHfZKP75CvOlQylNhV4',
  hamilton: 'TX3LPaxmHKxFdv7VOQHJ',
  madison: 'IKne3meq5aSn9XLyUdCD',
  jefferson: 'N2lVS1w4EtoT3dr4eOWO',
  marshall: 'onwK4e9ZLuTAKqWW03F9'
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { text, founderId } = body;

  const voiceId = VOICE_IDS[founderId];
  if (!voiceId) return res.status(400).json({ error: 'Unknown founder' });

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ElevenLabs not configured' });

  try {
    const cleanText = text.replace(/\[VOTE:(FOR|AGAINST)\]/g, '').trim();

    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: cleanText,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 }
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(response.status).json({ error: err });
    }

    const audioBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(audioBuffer).toString('base64');
    res.json({ audio: base64, mimeType: 'audio/mpeg' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
