// Vercel Serverless Function — proxies the game's prompts to Anthropic's Claude.
// Deploy this file at /api/ai.js. The client (index.html) POSTs { prompt }.
//
// SETUP (one time):
//   1. In Vercel:  Project → Settings → Environment Variables
//      add  ANTHROPIC_API_KEY = sk-ant-...   (get one at console.anthropic.com)
//   2. Redeploy. That's it — the game auto-detects this endpoint.
//
// If the key is missing the endpoint returns {text:null} and the game falls
// back to its built-in "demo mode" content, so it never breaks.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    // No key configured — tell the client to use its baked fallback.
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
        // Fast + cheap. Swap to 'claude-sonnet-4-5' for richer prose if you like.
        model: 'claude-haiku-4-5',
        max_tokens: 1024,
        messages,
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      res.status(200).json({ text: null, error: 'upstream ' + r.status, detail });
      return;
    }

    const j = await r.json();
    const text = j && j.content && j.content[0] && j.content[0].text ? j.content[0].text : null;
    res.status(200).json({ text });
  } catch (e) {
    res.status(200).json({ text: null, error: String(e && e.message || e) });
  }
}
