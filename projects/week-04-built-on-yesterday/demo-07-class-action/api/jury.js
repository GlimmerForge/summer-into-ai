import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { companyName, total, exhibits, defenseArgument, rebuttal } = body;

  if (!Array.isArray(exhibits) || exhibits.length !== 3) {
    return res.status(400).json({ error: 'Exactly 3 exhibits required' });
  }

  const exhibitText = exhibits.map(e =>
    `EXHIBIT ${e.exhibitLetter}: "${e.title}" — ${e.complaintCount} supporting complaints, claimed strength ${e.strength}/10. Legal theory: ${e.legalTheory}. Representative narrative: "${(e.sampleNarrative || '').slice(0, 250)}"`
  ).join('\n');

  const verdictTool = {
    name: 'render_verdict',
    description: 'Render the jury verdict on each exhibit and award damages.',
    input_schema: {
      type: 'object',
      properties: {
        verdictPerExhibit: {
          type: 'array',
          description: 'One ruling per exhibit, in order A, B, C.',
          items: {
            type: 'object',
            properties: {
              exhibit: { type: 'string', enum: ['A', 'B', 'C'] },
              ruling: { type: 'string', enum: ['SUSTAINED', 'DISMISSED'] },
              reason: { type: 'string', description: 'One or two sentences explaining the ruling. Plain prose, no markdown.' }
            },
            required: ['exhibit', 'ruling', 'reason']
          }
        },
        damagesAwarded: {
          type: 'integer',
          description: 'Total class damages awarded in US dollars. 0 if all exhibits dismissed. Scale with the count and strength of SUSTAINED exhibits and the total complaint volume — a strong sustained pattern against a company with tens of thousands of complaints should award millions; a single weak sustained exhibit might award only hundreds of thousands.'
        },
        juryStatement: {
          type: 'string',
          description: 'A 3-5 sentence statement read aloud by the jury foreperson summarizing the reasoning, weighing the defense argument against the plaintiff rebuttal. Plain prose, NO markdown (no #, no **, no *).'
        }
      },
      required: ['verdictPerExhibit', 'damagesAwarded', 'juryStatement']
    }
  };

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [verdictTool],
      tool_choice: { type: 'tool', name: 'render_verdict' },
      system: `You are an impartial civil jury in a consumer class action against ${companyName}. Rule on each of the three exhibits independently. Weigh the plaintiff's evidence (complaint counts, narrative quality, legal theory) against the defense's specific attacks and the plaintiff's closing rebuttal. Reward a rebuttal that directly and specifically answers the defense's attacks; punish a rebuttal that ignores them or is empty. Be genuinely willing to dismiss weak exhibits and sustain strong ones — mixed verdicts are common. All prose must be plain text with NO markdown.`,
      messages: [{
        role: 'user',
        content: `CASE: Consumer class v. ${companyName} (${total} total CFPB complaints on file).

PLAINTIFF'S EXHIBITS:
${exhibitText}

DEFENSE CLOSING ARGUMENT:
${(defenseArgument || '(defense argument unavailable)').slice(0, 5000)}

PLAINTIFF'S CLOSING REBUTTAL:
${(rebuttal || '(the plaintiff offered no rebuttal)').slice(0, 2500)}

Render your verdict.`
      }]
    });

    const toolUse = msg.content.find(b => b.type === 'tool_use');
    if (!toolUse?.input?.verdictPerExhibit) {
      return res.status(502).json({ error: 'The jury failed to reach a verdict. Please try again.' });
    }

    const { verdictPerExhibit, damagesAwarded, juryStatement } = toolUse.input;
    res.json({
      verdictPerExhibit,
      damagesAwarded: Math.max(0, Math.round(Number(damagesAwarded) || 0)),
      juryStatement: juryStatement || ''
    });
  } catch (e) {
    console.error('jury error:', e);
    res.status(502).json({ error: 'Jury deliberation failed: ' + (e.message || 'unknown error') });
  }
}
