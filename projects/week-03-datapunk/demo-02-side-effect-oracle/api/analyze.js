import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are a clinical data analyst reviewing FDA post-market surveillance data. Write a DRUG SAFETY DOSSIER comparing official FDA label language to actual adverse event reporting from the FDA's Adverse Event Reporting System (FAERS).

Include these section headers (use exactly this format):
[DRUG PROFILE]
[TOP REPORTED REACTIONS — POST-MARKET DATA]
[LABEL vs REALITY]
[UNDERSTANDING THE NUMBERS]
[QUESTIONS FOR YOUR DOCTOR]

In the LABEL vs REALITY section, identify:
1. Reactions that appear frequently in FAERS but are absent from or minimized in the official label
2. Any reactions the label calls "rare" that appear in large numbers of reports
3. What gaps between label language and reporting data might mean (reporting lag, label not updated, etc.)

Important FAERS context to apply: FAERS is a voluntary reporting system. Actual real-world incidence is estimated to be 10-100x higher than reported counts. A "rare" FDA designation means <1/10,000 patients by FDA definition.

FORMATTING RULES: Plain text only. No markdown. No asterisks, no bold, no italics. Use numbers (1. 2. 3.) for lists. Clear prose sentences.`;

function buildUserMessage(data) {
  const { drug, totalFaersReports, topReactions, officialWarnings, labelFound } = data;
  const lines = [
    `DRUG: ${drug}`,
    ``,
    `FDA FAERS POST-MARKET SURVEILLANCE DATA:`,
    `Total adverse event reports on file: ${(totalFaersReports ?? 0).toLocaleString()}`,
    ``,
    `Top 20 reported adverse reactions (sorted by report frequency):`,
  ];

  const reactions = topReactions ?? [];
  reactions.slice(0, 20).forEach((r, i) => {
    lines.push(`${i + 1}. ${r.term}: ${r.count.toLocaleString()} reports`);
  });

  lines.push('');
  lines.push(
    'NOTE: FAERS is a voluntary, passive reporting system. ' +
    'Real-world incidence is estimated to be 10-100x higher than these report counts. ' +
    'A reaction with 1,000 FAERS reports may represent 10,000-100,000 actual patient experiences. ' +
    'FDA defines "rare" as occurring in fewer than 1 in 10,000 patients.'
  );

  if (labelFound && officialWarnings) {
    lines.push('');
    lines.push('OFFICIAL FDA LABEL — ADVERSE REACTIONS / WARNINGS:');
    lines.push(officialWarnings);
  } else {
    lines.push('');
    lines.push(
      'OFFICIAL FDA LABEL: Not retrieved from FDA database. ' +
      'Analyze FAERS data only and note the absence of label comparison data.'
    );
  }

  return lines.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  if (!body || !body.drug) {
    return res.status(400).json({ error: 'Missing data payload' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const userMessage = buildUserMessage(body);

    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      thinking: { type: 'enabled', budget_tokens: 6000 },
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'thinking_delta') {
          res.write(`event: thinking\ndata: ${JSON.stringify({ text: event.delta.thinking })}\n\n`);
        } else if (event.delta.type === 'text_delta') {
          res.write(`event: text\ndata: ${JSON.stringify({ text: event.delta.text })}\n\n`);
        }
      }
    }

    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err) {
    const msg = err?.message ?? 'Unknown error';
    res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
}
