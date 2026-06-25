export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  const url = new URL(req.url, `http://localhost`);
  const verdict = url.searchParams.get('verdict') || 'ADEQUATE';
  const v = verdict.toUpperCase();

  const isGood = v === 'SPLENDID' || v === 'ADEQUATE';
  const prompt = isGood
    ? 'colonial american crowd cheering and applauding enthusiastically, triumphant celebration'
    : 'disappointed crowd booing and groaning loudly, jeering and hissing';

  const r = await fetch('https://api.elevenlabs.io/v1/sound-generation', {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: prompt, duration_seconds: 3, prompt_influence: 0.3 }),
  });

  if (!r.ok) {
    res.status(502).end();
    return;
  }

  const buf = await r.arrayBuffer();
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.end(Buffer.from(buf));
}
