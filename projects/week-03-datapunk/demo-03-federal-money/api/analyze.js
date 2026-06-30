import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

const DOSSIER_SYSTEM = `You are a federal spending analyst reviewing USASpending.gov contract data. Write a FEDERAL SPENDING INTELLIGENCE REPORT for this contractor.

Use these exact section headers:
[CONTRACTOR PROFILE]
[TOP CONTRACTS]
[AGENCY BREAKDOWN]
[WHAT THE CONTRACTS REVEAL]
[PATTERNS AND ANOMALIES]

In WHAT THE CONTRACTS REVEAL: analyze what the contract descriptions say about the company's actual work for the government. In PATTERNS AND ANOMALIES: note concentration risk, unusual contract sizes, and anything a watchdog would flag.

End with: TOTAL FEDERAL OBLIGATION: $X.XX BILLION (or MILLION)

FORMATTING RULES: Plain text only. No markdown. No asterisks. Use numbers for lists. Be specific but concise — 2-4 sentences per section max. Cite actual dollar amounts from the data.`;

const FOLLOWUP_SYSTEM = `You are a federal spending analyst. The user has questions about a specific company's federal contracts. Answer concisely and directly using the contract data provided. Plain text, no markdown. Be specific — cite dollar amounts and agency names when relevant.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { mode } = body;

  if (mode === 'initial') {
    return handleInitialDossier(req, res, body);
  } else if (mode === 'chat') {
    return handleFollowupChat(req, res, body);
  } else {
    return res.status(400).json({ error: 'Invalid mode. Must be "initial" or "chat".' });
  }
}

async function handleInitialDossier(req, res, body) {
  const { spendingData } = body;

  if (!spendingData) {
    return res.status(400).json({ error: 'Missing spendingData.' });
  }

  // Slim the payload — top 15 contracts, essential fields only
  const slimAwards = (spendingData.awards ?? []).slice(0, 15).map(a => ({
    amount: a['Award Amount'],
    agency: a['Awarding Agency Name'],
    subagency: a['Awarding Sub Agency Name'],
    description: (a['Description'] ?? '').slice(0, 120),
    type: a['Award Type'],
    start: a['Period of Performance Start Date'],
    end: a['Period of Performance Current End Date'],
  }));

  const slim = {
    company: spendingData.company,
    totalObligated: spendingData.totalObligated,
    totalAwards: spendingData.totalAwards,
    topAgencies: spendingData.topAgencies,
    topContracts: slimAwards,
  };

  const userMessage = `Analyze this federal contractor spending data and write the FEDERAL SPENDING INTELLIGENCE REPORT:

${JSON.stringify(slim, null, 2)}`;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2500,
      thinking: { type: 'enabled', budget_tokens: 1024 },
      system: DOSSIER_SYSTEM,
      messages: [{ role: 'user', content: userMessage }]
    });

    for await (const event of stream) {
      if (event.type === 'content_block_start') {
        if (event.content_block.type === 'thinking') {
          res.write(`event: thinking_start\ndata: {}\n\n`);
        }
      } else if (event.type === 'content_block_delta') {
        if (event.delta.type === 'thinking_delta') {
          res.write(`event: thinking\ndata: ${JSON.stringify({ text: event.delta.thinking })}\n\n`);
        } else if (event.delta.type === 'text_delta') {
          res.write(`event: text\ndata: ${JSON.stringify({ text: event.delta.text })}\n\n`);
        }
      } else if (event.type === 'content_block_stop') {
        // no-op
      } else if (event.type === 'message_stop') {
        res.write(`event: done\ndata: {}\n\n`);
      }
    }

    res.end();
  } catch (err) {
    console.error('Streaming error:', err);
    res.write(`event: error\ndata: ${JSON.stringify({ message: err.message || 'Analysis failed.' })}\n\n`);
    res.end();
  }
}

async function handleFollowupChat(req, res, body) {
  const { question, context } = body;

  if (!question || !context) {
    return res.status(400).json({ error: 'Missing question or context.' });
  }

  try {
    const result = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 800,
      system: FOLLOWUP_SYSTEM,
      messages: [
        {
          role: 'user',
          content: `Context:\n${context}\n\nQuestion: ${question}`
        }
      ]
    });

    return res.status(200).json({ answer: result.content[0].text });
  } catch (err) {
    console.error('Chat error:', err);
    return res.status(500).json({ error: err.message || 'Follow-up analysis failed.' });
  }
}
