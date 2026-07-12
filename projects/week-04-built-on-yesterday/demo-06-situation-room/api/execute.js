// SITUATION ROOM — allocation judgment endpoint.
// Second forced tool call: Claude adjudicates the Flight Director's unit allocation
// against the actual threat severities and returns structured outcomes.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

const JUDGMENT_TOOL = {
  name: 'file_judgment',
  description: 'File the after-action judgment of the Flight Director\'s response allocation.',
  input_schema: {
    type: 'object',
    properties: {
      outcomes: {
        type: 'array',
        description: 'One entry per threat, in the same order the threats were briefed.',
        items: {
          type: 'object',
          properties: {
            threatId: { type: 'string' },
            result: {
              type: 'string',
              enum: ['CONTAINED', 'MITIGATED', 'PARTIAL', 'UNCHECKED', 'CATASTROPHIC'],
              description:
                'CONTAINED: fully handled. MITIGATED: mostly handled. PARTIAL: some damage. UNCHECKED: allocation clearly insufficient. CATASTROPHIC: high-severity threat left effectively unaddressed.',
            },
            detail: {
              type: 'string',
              description: '1-2 sentence outcome narration in plain prose, no markdown.',
            },
          },
          required: ['threatId', 'result', 'detail'],
        },
      },
      casualtiesAverted: {
        type: 'integer',
        minimum: 0,
        description: 'Estimated casualties averted this round by the allocation. Plausible scale for the scenario.',
      },
      score: {
        type: 'integer',
        minimum: 0,
        maximum: 100,
        description: 'Round score 0-100 grading allocation quality against the actual severities.',
      },
      assessment: {
        type: 'string',
        description:
          '3-5 sentence after-action assessment addressed to the Flight Director. Plain prose, NO markdown. Reference specific threats and unit counts.',
      },
      nextComplication: {
        type: 'string',
        description:
          'One sentence: a new complication that carries into the next round, growing out of the weakest outcome. On the final round instead give a one-sentence shift-closing note.',
      },
    },
    required: ['outcomes', 'casualtiesAverted', 'score', 'assessment', 'nextComplication'],
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { threats, allocations, situation } = body;
  const round = Math.min(3, Math.max(1, parseInt(body.round, 10) || 1));
  const unitsRemaining = Math.max(0, parseInt(body.unitsRemaining, 10) || 0);
  const totalPool = Math.max(1, parseInt(body.totalPool, 10) || 10);

  if (!Array.isArray(threats) || !threats.length || !allocations || typeof allocations !== 'object') {
    return res.status(400).json({ error: 'Missing threats or allocations' });
  }

  const threatLines = threats
    .slice(0, 4)
    .map((t) => {
      const units = Math.max(0, parseInt(allocations[t.id], 10) || 0);
      return `${t.id} — ${String(t.name).slice(0, 80)} | severity ${t.severity}/10 | region: ${String(
        t.region
      ).slice(0, 60)} | UNITS ASSIGNED: ${units}`;
    })
    .join('\n');

  const spent = threats.reduce((s, t) => s + (Math.max(0, parseInt(allocations[t.id], 10) || 0)), 0);

  const system =
    'You are WATCHFLOOR, the AI duty analyst of a global crisis operations center, now acting as after-action judge. Grade the Flight Director\'s response-unit allocation STRICTLY against the briefed threat severities. Rules of thumb: a threat generally needs units roughly proportional to severity (severity 8-10 demands 3+ units; severity 1-3 can often be monitored with 0-1). Over-allocating to low-severity threats while starving high-severity ones is the cardinal error. The shift pool does NOT replenish: holding some reserve in rounds 1-2 is prudent statecraft, but hoarding units in the final round is waste. Zero units on a severity 8+ threat should read CATASTROPHIC and crater the score. A well-balanced allocation under scarcity deserves a generous score even if not every threat is CONTAINED. Keep casualtiesAverted plausible for the scenario scale. All prose must be plain prose with NO markdown formatting.';

  const userMsg = `ROUND ${round} OF 3 — AFTER-ACTION JUDGMENT REQUEST

SITUATION BRIEFED: ${String(situation || '').slice(0, 1500)}

THREAT BOARD AND ALLOCATION:
${threatLines}

RESOURCE STATE: ${spent} units committed this round. ${unitsRemaining} units remain in the shift pool of ${totalPool} (pool does not replenish; ${
    round < 3 ? `${3 - round} round(s) still ahead` : 'this was the FINAL round — unspent units are wasted'
  }).

File the after-action judgment now using the file_judgment tool.`;

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1800,
      system,
      tools: [JUDGMENT_TOOL],
      tool_choice: { type: 'tool', name: 'file_judgment' },
      messages: [{ role: 'user', content: userMsg }],
    });

    const toolUse = msg.content.find((b) => b.type === 'tool_use');
    if (!toolUse) throw new Error('No tool output from model');
    const judgment = toolUse.input;

    judgment.score = Math.min(100, Math.max(0, Math.round(Number(judgment.score) || 0)));
    judgment.casualtiesAverted = Math.max(0, Math.round(Number(judgment.casualtiesAverted) || 0));
    judgment.outcomes = (judgment.outcomes || []).map((o) => ({
      threatId: String(o.threatId || ''),
      result: String(o.result || 'PARTIAL'),
      detail: String(o.detail || ''),
    }));

    res.status(200).json({ judgment });
  } catch (err) {
    console.error('execute error:', err);
    res.status(500).json({ error: err.message });
  }
}
