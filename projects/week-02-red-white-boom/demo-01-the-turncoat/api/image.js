export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { prompt } = body || {};
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  try {
    // Create prediction
    const createRes = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-1.1-pro/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}`,
        'Content-Type': 'application/json',
        'Prefer': 'wait',
      },
      body: JSON.stringify({
        input: {
          prompt,
          aspect_ratio: '16:9',
          output_format: 'webp',
          output_quality: 90,
          safety_tolerance: 2,
        }
      })
    });

    const prediction = await createRes.json();

    if (prediction.error) return res.status(500).json({ error: prediction.error });

    // If Prefer:wait timed out, poll until done
    if (prediction.status !== 'succeeded') {
      let result = prediction;
      for (let i = 0; i < 30; i++) {
        await new Promise(r => setTimeout(r, 2000));
        const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${result.id}`, {
          headers: { 'Authorization': `Bearer ${process.env.REPLICATE_API_TOKEN}` }
        });
        result = await pollRes.json();
        if (result.status === 'succeeded') break;
        if (result.status === 'failed') return res.status(500).json({ error: 'Image generation failed' });
      }
      return res.json({ url: result.output });
    }

    res.json({ url: prediction.output });
  } catch (err) {
    console.error('Image API error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
}
