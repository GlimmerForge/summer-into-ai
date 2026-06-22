export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(200).json({ text: null });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const prompt = body.prompt;
    const messages = body.messages || [{ role: 'user', content: String(prompt || '') }];

    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5',
        max_tokens: 512,
        messages,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res.status(200).json({ text: null, error: 'upstream ' + r.status, detail });
      return;
    }

    const j = await r.json();
    const text = j?.content?.[0]?.text ?? null;
    res.status(200).json({ text });
  } catch (e) {
    res.status(200).json({ text: null, error: String(e?.message || e) });
  }
}
