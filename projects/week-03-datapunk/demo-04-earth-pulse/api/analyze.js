import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { vitals } = body;

  if (!vitals) return res.status(400).json({ error: 'Missing vitals' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');

  const userContent = buildUserMessage(vitals);

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 350,
      system:
        'You are EARTH PULSE — a planetary monitoring AI. You receive real-time vital sign data from three Earth systems: seismic activity, financial markets, and atmospheric conditions. Deliver a 4-5 sentence planetary status briefing. Be dramatic, cinematic, specific. Use the actual numbers. Speak as if narrating a nature documentary about a living planet. No markdown, no bullet points, just flowing prose.',
      messages: [{ role: 'user', content: userContent }],
    });

    let fullText = '';

    stream.on('text', (text) => {
      fullText += text;
      res.write(`event: text\ndata: ${JSON.stringify({ text })}\n\n`);
    });

    stream.on('message', () => {
      res.write(`event: done\ndata: ${JSON.stringify({ fullText })}\n\n`);
      res.end();
    });

    stream.on('error', (err) => {
      console.error('stream error:', err);
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
      res.end();
    });
  } catch (err) {
    console.error('analyze error:', err);
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}

function buildUserMessage(vitals) {
  const { seismic, market, atmosphere } = vitals;
  const ts = vitals.timestamp ? new Date(vitals.timestamp).toUTCString() : 'now';

  const seismicLine = `SEISMIC: ${seismic.count} events in the past hour, max magnitude ${seismic.maxMag}, ${seismic.significantCount} events M3.0+. Most recent notable: ${seismic.recentLocation}.`;

  const btcStr = market.btcPrice != null
    ? `BTC $${market.btcPrice.toLocaleString()} (${market.btcChange >= 0 ? '+' : ''}${(market.btcChange ?? 0).toFixed(2)}% 24h)`
    : 'BTC data unavailable';
  const ethStr = market.ethPrice != null
    ? `ETH $${market.ethPrice.toLocaleString()} (${market.ethChange >= 0 ? '+' : ''}${(market.ethChange ?? 0).toFixed(2)}% 24h)`
    : 'ETH data unavailable';
  const marketLine = `MARKETS: ${btcStr}, ${ethStr}.`;

  const atmosLine = atmosphere.maxCity
    ? `ATMOSPHERE: City temps range from ${atmosphere.minTemp}°C (${atmosphere.minCity}) to ${atmosphere.maxTemp}°C (${atmosphere.maxCity}), avg ${atmosphere.avgTemp}°C across 5 global stations.`
    : 'ATMOSPHERE: Temperature data unavailable.';

  return `Timestamp: ${ts}\n\n${seismicLine}\n${marketLine}\n${atmosLine}\n\nDeliver the planetary briefing.`;
}
