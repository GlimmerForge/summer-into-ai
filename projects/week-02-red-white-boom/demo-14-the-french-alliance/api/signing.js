import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { finalAlignments, playerHistory, outcome } = body;

  const systemPrompt = `You are a dramatic narrator of history, in the style of a 18th-century pamphleteer — vivid, elevated, slightly theatrical. Write about the moment France enters the American cause.`;

  const userPrompt = outcome === 'win'
    ? `The Treaty of Alliance has been signed. Benjamin Franklin's diplomatic mission succeeded.
Final faction alignments: King Louis XVI at ${finalAlignments.louis}%, Foreign Minister Vergennes at ${finalAlignments.vergennes}%, the Philosophes at ${finalAlignments.philosophes}%, the Merchant Consortium at ${finalAlignments.merchants}%.
Write exactly 3 sentences narrating the signing ceremony and what it means for the Revolution. Make it feel momentous and historically specific. Mention at least one faction.`
    : `Benjamin Franklin's mission has failed. France will not sign a Treaty of Alliance.
Final faction alignments: King Louis XVI at ${finalAlignments.louis}%, Foreign Minister Vergennes at ${finalAlignments.vergennes}%, the Philosophes at ${finalAlignments.philosophes}%, the Merchant Consortium at ${finalAlignments.merchants}%.
Write exactly 3 sentences narrating what happens next — the Revolution left to fight alone, what was lost, the historical weight of this moment.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }]
    });

    const text = response.content.find(b => b.type === 'text')?.text || '';
    return res.status(200).json({ narration: text });
  } catch (err) {
    console.error('signing error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
