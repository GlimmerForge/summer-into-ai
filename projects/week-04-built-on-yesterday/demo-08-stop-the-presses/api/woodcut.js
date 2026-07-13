export const config = { api: { bodyParser: true } };

// Generates a period woodcut engraving for the lead printed story via Replicate.
// The original Broadside (week 2) designed woodcut prompts but never shipped the
// images — this restores that lost feature. Degrades gracefully to no image.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { headline } = body;

  const token = process.env.REPLICATE_API_TOKEN;
  if (!token || !headline) return res.status(200).json({ image: null });

  try {
    const prompt = `18th century colonial newspaper woodcut engraving illustrating: ${headline}. Black ink on aged cream paper, coarse crosshatching, bold primitive linework, dramatic single scene, no text or letters, 1776 historical broadsheet illustration`;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 50000);
    const r = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Prefer: 'wait'
      },
      signal: controller.signal,
      body: JSON.stringify({
        input: { prompt, aspect_ratio: '3:2', output_format: 'jpg', output_quality: 80 }
      })
    });
    clearTimeout(t);

    if (!r.ok) return res.status(200).json({ image: null });
    const j = await r.json();
    const url = Array.isArray(j.output) ? j.output[0] : j.output;
    return res.status(200).json({ image: url || null });
  } catch (_) {
    return res.status(200).json({ image: null });
  }
}
