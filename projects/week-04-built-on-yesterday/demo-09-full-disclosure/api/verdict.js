// Full Disclosure — structured verdict endpoint
// Second AI pass: distills the four datasets + the streamed synthesis into a
// structured DISCLOSURE INDEX via a forced tool call. Deliberately runs WITHOUT
// extended thinking — the API rejects thinking combined with forced tool_choice,
// so the deep reasoning happens in api/synthesize.js and this call only scores it.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

const VERDICT_TOOL = {
  name: 'submit_verdict',
  description: 'Submit the structured joint-inquiry verdict for the investigated company.',
  input_schema: {
    type: 'object',
    required: ['disclosureIndex', 'headline', 'keyFindings', 'oneLiner'],
    properties: {
      disclosureIndex: {
        type: 'integer', minimum: 0, maximum: 100,
        description: 'Overall cross-dataset concern score, 0-100. Higher = more concerning combined federal picture. Calibrate honestly: a company with modest complaints and no environmental or FDA exposure sits in the 15-35 band; heavy volume across three or four datasets with credible cross-links belongs in the 70-90 band. Reserve 90+ for overwhelming multi-agency records.'
      },
      headline: {
        type: 'string',
        description: 'A terse inquiry headline of at most 12 words, plain text, no markdown. Style: declassified report title, e.g. "Political spending shadows a decade of consumer harm".'
      },
      keyFindings: {
        type: 'array', minItems: 3, maxItems: 5,
        description: '3 to 5 cross-dataset findings, strongest first. Each MUST connect at least one dataset to another (or explicitly flag a notable absence in one dataset against presence in another).',
        items: {
          type: 'object',
          required: ['datasets', 'finding', 'severity'],
          properties: {
            datasets: {
              type: 'array', minItems: 1, maxItems: 4,
              items: { type: 'string', enum: ['FEC', 'CFPB', 'EPA', 'FDA'] },
              description: 'Which datasets this finding connects. Prefer 2+ — cross-references are the point of the inquiry.'
            },
            finding: {
              type: 'string',
              description: 'One to two sentences stating the finding with specific figures from the data. Plain prose, no markdown.'
            },
            severity: {
              type: 'integer', minimum: 1, maximum: 10,
              description: 'How concerning this specific finding is, 1 (footnote) to 10 (alarm). Vary honestly across findings.'
            }
          }
        }
      },
      oneLiner: {
        type: 'string',
        description: 'A single shareable sentence summarizing what four federal datasets together reveal about this company. Plain text, no markdown.'
      }
    }
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { company, data, synthesis } = body || {};

  if (!company || !data) {
    return res.status(400).json({ error: 'company and data are required' });
  }

  const userMessage = `SUBJECT COMPANY: ${company}

RAW FEDERAL DATA (four datasets):
FEC: ${JSON.stringify(data.fec ?? { available: false })}
CFPB: ${JSON.stringify(data.cfpb ?? { available: false })}
EPA: ${JSON.stringify(data.epa ?? { available: false })}
FDA: ${JSON.stringify(data.fda ?? { available: false })}

CROSS-REFERENCE ANALYSIS (from the joint inquiry's lead analyst):
${(synthesis || '(analysis unavailable — score from the raw data alone)').slice(0, 7000)}

Score the inquiry and submit the structured verdict.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [VERDICT_TOOL],
      tool_choice: { type: 'tool', name: 'submit_verdict' },
      system: 'You are the review board of a fictional federal joint inquiry. You receive four real federal datasets about one company plus an analyst\'s cross-reference report. Produce the structured verdict. Every finding must cite real figures from the data and name which datasets it connects. Calibrate scores honestly — do not inflate. All text fields are plain prose with NO markdown (no #, no **, no *).',
      messages: [{ role: 'user', content: userMessage }]
    });

    const toolUse = msg.content.find(b => b.type === 'tool_use');
    if (!toolUse?.input?.keyFindings?.length) {
      return res.status(502).json({ error: 'The review board failed to return a verdict. Try again.' });
    }

    return res.status(200).json(toolUse.input);
  } catch (err) {
    return res.status(502).json({ error: err.message || 'Verdict failed' });
  }
}
