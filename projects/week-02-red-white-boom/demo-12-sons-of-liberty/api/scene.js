export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { prompt } = body || {};

  if (!process.env.FAL_KEY) {
    return res.status(200).json({ url: null, fallback: true });
  }

  try {
    const response = await fetch('https://fal.run/fal-ai/flux/schnell', {
      method: 'POST',
      headers: {
        'Authorization': `Key ${process.env.FAL_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        prompt: prompt + ', 18th century oil painting style, dramatic lighting, historically accurate',
        image_size: 'landscape_4_3',
        num_inference_steps: 4,
        num_images: 1
      })
    });

    if (!response.ok) {
      const err = await response.text();
      return res.status(200).json({ url: null, fallback: true, error: err });
    }

    const data = await response.json();
    res.json({ url: data.images?.[0]?.url || null });
  } catch (err) {
    res.status(200).json({ url: null, fallback: true });
  }
}
