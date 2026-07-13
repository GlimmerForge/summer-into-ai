// Full Disclosure — cross-reference synthesis endpoint
// Streams Claude's extended thinking + prose synthesis over SSE.
// The prompt demands CROSS-DATASET findings — connections between FEC money,
// CFPB complaints, EPA toxic releases, and FDA adverse events that no
// single-dataset tool (i.e. no single Week 4 demo) could see on its own.
// NOTE: thinking is enabled here; the structured verdict lives in api/verdict.js
// because the API rejects thinking combined with a forced tool_choice.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

const SYSTEM = `You are the lead analyst of a fictional federal JOINT INQUIRY task force. You have been handed four real federal datasets about one company, pulled minutes ago from live government APIs:

1. FEC — itemized political contributions from the company's employees and executives (2023-24 cycle)
2. CFPB — consumer complaints filed against the company, with real consumer narratives
3. EPA — Toxic Release Inventory facilities registered under the company's name, with carcinogen counts
4. FDA — adverse event reports naming the company as a drug manufacturer

Write a CROSS-REFERENCE ANALYSIS. The entire point of this inquiry is connections BETWEEN datasets — findings that no single agency could see alone. Do NOT write four separate summaries. Instead:

- Compare the scale of political giving against the volume of regulatory complaints. Does money flow toward committees and candidates positioned to oversee the very agencies receiving these complaints?
- Look at WHO donates (executives' names, occupations) versus WHAT consumers allege in their narratives.
- Weigh the environmental footprint (facilities, states, carcinogens) against consumer-facing harm. Is this a company whose harms are physical, financial, or both?
- If the FDA dataset is empty, say plainly the company has no pharmaceutical exposure and move on — absence is itself a finding.
- If a dataset is unavailable or empty, note the gap in one sentence and work with what exists.

Ground every claim in the specific numbers, names, and quotes in the data. Never invent a figure. Where the data is thin, say so — calibrated honesty reads as competence.

Length: roughly 350-500 words. Tone: terse, declarative, inter-agency briefing prose.

FORMATTING RULES (critical): Plain prose only, rendered verbatim in a monospace terminal panel. NO markdown of any kind: no #, no ##, no **, no *, no bullet lists, no numbered lists, no tables, and absolutely NO code fences or backticks (\`\`\`) anywhere — start directly with the first line of the report. Section headers, if you use them, are a short UPPERCASE phrase alone on its own line.`;

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (obj) => res.write(`data: ${JSON.stringify(obj)}\n\n`);

  if (!process.env.ANTHROPIC_API_KEY) {
    send({ type: 'error', message: 'ANTHROPIC_API_KEY not configured' });
    return res.end();
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { company, data } = body || {};

  if (!company || !data) {
    send({ type: 'error', message: 'company and data are required' });
    return res.end();
  }

  const userMessage = `SUBJECT COMPANY: ${company}

FEC POLITICAL CONTRIBUTIONS (via Money Trail, demo-01):
${JSON.stringify(data.fec ?? { available: false, error: 'not fetched' }, null, 2)}

CFPB CONSUMER COMPLAINTS (via Class Action, demo-07):
${JSON.stringify(data.cfpb ?? { available: false, error: 'not fetched' }, null, 2)}

EPA TOXIC RELEASE INVENTORY (via Sworn Testimony, demo-05):
${JSON.stringify(data.epa ?? { available: false, error: 'not fetched' }, null, 2)}

FDA ADVERSE EVENTS (via Side Effect Storm, demo-03):
${JSON.stringify(data.fda ?? { available: false, error: 'not fetched' }, null, 2)}

Deliver the cross-reference analysis.`;

  try {
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 12000,
      thinking: { type: 'enabled', budget_tokens: 6000 },
      system: SYSTEM,
      messages: [{ role: 'user', content: userMessage }],
      stream: true,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const d = event.delta;
        if (d.type === 'thinking_delta') {
          send({ type: 'thinking', delta: d.thinking });
        } else if (d.type === 'text_delta') {
          send({ type: 'text', delta: d.text });
        }
      }
    }

    send({ type: 'done' });
    res.end();
  } catch (err) {
    send({ type: 'error', message: err.message || 'Synthesis failed' });
    res.end();
  }
}
