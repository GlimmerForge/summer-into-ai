import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();

export const config = { api: { bodyParser: true } };

const FOUNDER_DATA = {
  washington: {
    name: 'George Washington',
    role: 'Commander-in-Chief, First President',
    quotes: [
      "If freedom of speech is taken away, then dumb and silent we may be led, like sheep to the slaughter.",
      "The basis of our political systems is the right of the people to make and to alter their Constitutions of Government.",
      "Government is not reason; it is not eloquence; it is force. Like fire, it is a dangerous servant and a fearful master."
    ]
  },
  franklin: {
    name: 'Benjamin Franklin',
    role: 'Diplomat, Scientist, Inventor',
    quotes: [
      "Those who would give up essential Liberty, to purchase a little temporary Safety, deserve neither Liberty nor Safety.",
      "An investment in knowledge pays the best interest.",
      "Well done is better than well said."
    ]
  },
  hamilton: {
    name: 'Alexander Hamilton',
    role: 'Secretary of the Treasury, Federalist',
    quotes: [
      "A strong government is the only security against domestic faction and insurrection.",
      "The sacred rights of mankind are not to be rummaged for among old parchments or musty records.",
      "If men were angels, no government would be necessary."
    ]
  },
  madison: {
    name: 'James Madison',
    role: 'Father of the Constitution',
    quotes: [
      "The accumulation of all powers, legislative, executive, and judiciary, in the same hands...may justly be pronounced the very definition of tyranny.",
      "Knowledge will forever govern ignorance; and a people who mean to be their own governors must arm themselves with the power which knowledge gives.",
      "If tyranny and oppression come to this land it will be in the guise of fighting a foreign enemy."
    ]
  },
  jefferson: {
    name: 'Thomas Jefferson',
    role: 'Author of the Declaration, Third President',
    quotes: [
      "The tree of liberty must be refreshed from time to time with the blood of patriots and tyrants.",
      "I hold it that a little rebellion now and then is a good thing, and as necessary in the political world as storms in the physical.",
      "No man has a natural right to commit aggression on the equal rights of another; and this is all from which the laws ought to restrain him."
    ]
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { topic, founderId, topicBrief, round = 1, priorArguments = [] } = body;

  const founder = FOUNDER_DATA[founderId];
  if (!founder) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Unknown founder' })}\n\n`);
    res.end();
    return;
  }

  let systemPrompt, userMessage;

  if (round === 1) {
    systemPrompt = `You are ${founder.name} (${founder.role}), debating a modern constitutional question in 2026, reasoning from your 18th-century principles.

Your writings and positions:
${founder.quotes.map(q => `"${q}"`).join('\n')}

The question: ${topicBrief}

Instructions:
- Reason carefully. Think through constitutional implications step by step.
- Give a substantive argument of 3-4 paragraphs. Cite your own writings specifically.
- Write in plain prose — NO markdown. No # headers, no ** or * emphasis, no bullet lists. Your words are displayed as plain text and read aloud by a voice engine; markdown symbols appear as literal clutter.
- Begin speaking immediately as ${founder.name} — no title line, no preamble.
- At the very end, on its own line, write exactly: [VOTE:FOR] or [VOTE:AGAINST]
- Take a clear position. No hedging.`;
    userMessage = `State your opening position on: ${topic}`;
  } else {
    // Round 2: read all prior arguments, write targeted rebuttal
    const othersText = priorArguments
      .filter(p => p.founderId !== founderId)
      .map(p => `${p.name}:\n"${p.argument.slice(0, 800)}"`)
      .join('\n\n---\n\n');

    const myEntry = priorArguments.find(p => p.founderId === founderId);

    systemPrompt = `You are ${founder.name} (${founder.role}), now in the rebuttal round.

Your established position on ${topic}: You voted ${myEntry?.vote || 'for your stated view'}.

Your writings:
${founder.quotes.map(q => `"${q}"`).join('\n')}

Your colleagues have now spoken. Read their arguments carefully.`;

    userMessage = `Your colleagues said:

${othersText}

---

Choose the SINGLE argument that most directly challenges your position. Identify who made it and write a targeted 1-2 paragraph rebuttal. Be specific — quote or directly reference their claim, then tear it apart with your own documented principles. Name them. Start with something like "Hamilton's assertion that..." or "Jefferson would have us believe...". Write in plain prose — NO markdown symbols (#, **, *). Do NOT add a new vote. Do NOT restate your full position — just attack the strongest opposing argument.`;
  }

  try {
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: round === 1 ? 12000 : 4500,
      thinking: { type: 'enabled', budget_tokens: round === 1 ? 6000 : 3000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      stream: true
    });

    let buffer = '';
    let voteSent = false;

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const d = event.delta;
        if (d.type === 'thinking_delta') {
          res.write(`data: ${JSON.stringify({ type: 'thinking', delta: d.thinking })}\n\n`);
        } else if (d.type === 'text_delta') {
          buffer += d.text;
          res.write(`data: ${JSON.stringify({ type: 'text', delta: d.text })}\n\n`);
          if (round === 1 && !voteSent) {
            const voteMatch = buffer.match(/\[VOTE:(FOR|AGAINST)\]/);
            if (voteMatch) {
              voteSent = true;
              res.write(`data: ${JSON.stringify({ type: 'vote', value: voteMatch[1] })}\n\n`);
            }
          }
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done', round })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
}
