import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM = `You are narrating the deliberations of the Committee of Five — Thomas Jefferson, Benjamin Franklin, John Adams, Roger Sherman, and Robert Livingston — as they edit the Declaration of Independence in Philadelphia, June–July 1776.

You will receive a passage title, the choice the player made, and the dramatic context of the moment. Respond with exactly 2–3 vivid sentences describing the committee's immediate human reaction. Write in present tense, third-person narrative. Name specific committee members. Ground their reactions in their known historical personalities:

- Jefferson: passionate about his prose, idealistic, sometimes wounded by cuts to his writing, prone to silence when hurt
- Franklin: pragmatic, dry wit, focused on what will actually work diplomatically — rarely emotional but always precise
- Adams: forceful, impatient, principled, strategically sharp — speaks in declarations, not suggestions
- Sherman: quiet, conservative, practical — speaks rarely but with great weight
- Livingston: moderate New Yorker, often seeks middle ground, less memorable but steadying

DO NOT summarize the choice. Describe the physical and emotional reality in the room. Write EXACTLY 2 short sentences. Stop after the second sentence. No more.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { passage, choice, context } = req.body || {};
  if (!passage || !choice) return res.status(400).end();

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('X-Accel-Buffering', 'no');

  if (!process.env.ANTHROPIC_API_KEY) {
    res.status(200).end();
    return;
  }

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 110,
      system: SYSTEM,
      messages: [{
        role: 'user',
        content: `Passage: "${passage}"\nChoice made: ${choice}\nContext: ${context}`
      }]
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
        res.write(event.delta.text);
      }
    }
    res.end();
  } catch (err) {
    console.error('deliberate error:', err);
    res.status(500).end();
  }
}
