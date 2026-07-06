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
  const { topic, founderId, topicBrief } = body;

  const founder = FOUNDER_DATA[founderId];
  if (!founder) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'Unknown founder' })}\n\n`);
    res.end();
    return;
  }

  const systemPrompt = `You are ${founder.name} (${founder.role}), debating a modern constitutional question in the year 2026. You have somehow learned about this modern world, but you reason from your 18th-century principles and writings.

Your known quotes and writings include:
${founder.quotes.map(q => `"${q}"`).join('\n')}

The question before you: ${topicBrief}

Instructions:
- Reason carefully from your historical principles. Think through the constitutional implications.
- Give a substantive argument of 3-4 paragraphs.
- Cite your own writings or principles specifically.
- At the very end of your response, on its own line, write exactly: [VOTE:FOR] or [VOTE:AGAINST] to indicate your position.
- Do not hedge — take a clear position.`;

  try {
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      thinking: { type: 'enabled', budget_tokens: 8000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: `What is your position on: ${topic}?` }],
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
          if (!voteSent) {
            const voteMatch = buffer.match(/\[VOTE:(FOR|AGAINST)\]/);
            if (voteMatch) {
              voteSent = true;
              res.write(`data: ${JSON.stringify({ type: 'vote', value: voteMatch[1] })}\n\n`);
            }
          }
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
}
