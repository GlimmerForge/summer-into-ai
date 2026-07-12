// Sworn Testimony — verifier endpoint
// A second, independent AI call that audits each witness answer against the raw
// fetched JSON record and returns a structured verdict via a forced tool call.
// NOTE: forced tool_choice must NOT be combined with thinking — this call uses
// neither thinking nor streaming.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

const VERIFIER_SYSTEM = `You are THE VERIFIER — a forensic records auditor for a federal tribunal. You are given three things: the official raw data record for a ZIP code, a question asked by counsel, and the sworn answer given by the witness (a personified case file).

Your job: determine whether the checkable factual claims in the answer are supported by the official record.

Verdict definitions:
SUPPORTED — every specific factual claim in the answer (numbers, facility names, chemicals, dates, percentages) matches the record. Rounding and paraphrase are fine.
UNVERIFIED — the answer contains no checkable factual claims (pure evasion, attitude, or opinion), or it makes claims the record neither confirms nor contradicts (general knowledge about the area, hedged speculation).
CONTRADICTED — at least one specific claim stated as fact from the record conflicts with the record or does not appear in it: a fabricated or altered number, an invented facility or chemical name, a wrong date, an exaggerated count.

Rules:
1. Judge ONLY checkable factual claims. Ignore tone, rhetoric, and evasiveness.
2. A refusal to answer or an admission that the record is silent is UNVERIFIED, not CONTRADICTED.
3. In "evidence", quote the exact relevant values from the record (or note their absence). In "explanation", state your reasoning in 1 to 3 sentences.
4. Plain prose only in string fields. NO markdown: no #, no **, no *, no tables, no bullet lists.`;

const VERDICT_TOOL = {
  name: 'render_verdict',
  description: 'Render the forensic audit verdict on the witness answer.',
  input_schema: {
    type: 'object',
    properties: {
      verdict: {
        type: 'string',
        enum: ['SUPPORTED', 'UNVERIFIED', 'CONTRADICTED'],
        description: 'The audit verdict on the factual claims in the answer.',
      },
      evidence: {
        type: 'string',
        description: 'The specific values from (or missing from) the official record that support this verdict.',
      },
      explanation: {
        type: 'string',
        description: 'One to three plain-prose sentences explaining the verdict.',
      },
    },
    required: ['verdict', 'evidence', 'explanation'],
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { rawData, question, answer } = body ?? {};

  if (!rawData || !question || !answer) {
    return res.status(400).json({ error: 'Missing rawData, question, or answer' });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: VERIFIER_SYSTEM,
      tools: [VERDICT_TOOL],
      tool_choice: { type: 'tool', name: 'render_verdict' },
      messages: [{
        role: 'user',
        content:
          `OFFICIAL RECORD:\n${JSON.stringify(rawData, null, 2)}\n\n` +
          `QUESTION FROM COUNSEL:\n${question}\n\n` +
          `SWORN ANSWER FROM THE WITNESS:\n${answer}`,
      }],
    });

    const toolUse = response.content.find(b => b.type === 'tool_use' && b.name === 'render_verdict');
    if (!toolUse) {
      return res.status(500).json({ error: 'Verifier returned no verdict' });
    }

    const { verdict, evidence, explanation } = toolUse.input;
    const valid = ['SUPPORTED', 'UNVERIFIED', 'CONTRADICTED'];
    return res.status(200).json({
      verdict: valid.includes(verdict) ? verdict : 'UNVERIFIED',
      evidence: String(evidence ?? ''),
      explanation: String(explanation ?? ''),
    });
  } catch (err) {
    return res.status(500).json({ error: err?.message ?? 'Unknown error' });
  }
}
