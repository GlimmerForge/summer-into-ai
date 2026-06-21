// Vercel Serverless Function — turns the witnesses' lines into real spoken
// audio via ElevenLabs. Deploy at /api/tts.js. The game POSTs { text, voiceId }
// and gets back an MP3 stream.
//
// SETUP (one time):
//   1. In Vercel:  Project → Settings → Environment Variables
//      add  ELEVENLABS_API_KEY = ...   (from elevenlabs.io → Profile → API Keys)
//   2. Redeploy. The game auto-detects this endpoint and uses cinematic voices;
//      if the key is missing or the call fails, it silently falls back to the
//      browser's built-in voices, so nothing ever breaks.
//
// Want different voices? Change the IDs in the game's ELEVEN list (Hall of the
// Republic.dc.html) — any voice ID from your ElevenLabs Voice Library works.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    // No key — signal the client to use browser speech synthesis.
    res.status(501).json({ error: 'no key' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const text = String(body.text || '').slice(0, 800);
    const voiceId = String(body.voiceId || '').trim() || 'JBFqnCBsd6RMkjVDRZzb'; // George (warm, mature)
    if (!text) { res.status(400).json({ error: 'no text' }); return; }

    const r = await fetch('https://api.elevenlabs.io/v1/text-to-speech/' + encodeURIComponent(voiceId) + '?output_format=mp3_44100_128', {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'content-type': 'application/json',
        'accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        // Turbo = low latency, good for an interactive game. Swap to
        // 'eleven_multilingual_v2' for maximum quality if you prefer.
        model_id: 'eleven_turbo_v2_5',
        voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35, use_speaker_boost: true },
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res.status(502).json({ error: 'upstream ' + r.status, detail: detail.slice(0, 300) });
      return;
    }

    const buf = Buffer.from(await r.arrayBuffer());
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // cache identical lines for a day
    res.status(200).send(buf);
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
}
