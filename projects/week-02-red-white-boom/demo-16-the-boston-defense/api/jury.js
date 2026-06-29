import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { defenseStrategy, witnessResults } = body;

  const strategyDescriptions = {
    'self-defense': 'Self-Defense Under Provocation — the mob attacked first; soldiers had no choice',
    'mistaken-command': 'Mistaken Command — soldiers heard a civilian shout "Fire!"; confused, not malicious',
    'lawful-duty': 'Lawful Military Duty — soldiers followed legal military protocol; cannot be criminally liable'
  };

  const strategyText = strategyDescriptions[defenseStrategy] || strategyDescriptions['self-defense'];

  // Summarize witness results for the prompt
  const witnessNames = {
    maverick: 'Nathan Maverick (grief-stricken brother)',
    preston: 'Capt. Thomas Preston (commanding officer)',
    palmes: 'Richard Palmes (merchant witness)',
    church: 'Dr. Benjamin Church (Patriot physician)',
    montgomery: 'Pvt. Hugh Montgomery (accused soldier)'
  };

  const witnessResultsSummary = witnessResults.map(w => {
    const shift = w.credibilityShift;
    const impact = shift < -20 ? 'severely damaged (excellent cross-examination)' :
                   shift < -10 ? 'notably damaged (good cross-examination)' :
                   shift < 0 ? 'slightly damaged (weak cross-examination)' :
                   shift < 10 ? 'unchanged or slightly reinforced' :
                   'significantly reinforced (cross-examination backfired)';
    return `${witnessNames[w.witnessId] || w.witnessId}: credibility ${impact} (shift: ${shift})`;
  }).join('\n');

  // Calculate overall defense effectiveness for guidance
  const totalShift = witnessResults.reduce((sum, w) => sum + w.credibilityShift, 0);
  const effectivenessNote = totalShift < -50 ? 'Adams performed brilliantly — strong case for acquittal' :
                             totalShift < -20 ? 'Adams performed competently — mixed verdict likely' :
                             totalShift < 0 ? 'Adams struggled — manslaughter or worse likely' :
                             'Adams failed — conviction possible, though historical context matters';

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system: `You are simulating jury deliberations for the Boston Massacre trial, December 1770, Superior Court of Judicature, Massachusetts Bay Colony.

The eight accused soldiers (from the 29th Regiment of Foot) face charges of murder for killing five colonists on King Street, March 5, 1770. The jury must choose: NOT GUILTY, MANSLAUGHTER, or MURDER.

Defense strategy used: ${strategyText}

Witness credibility results after cross-examination:
${witnessResultsSummary}

Overall defense effectiveness assessment: ${effectivenessNote}

Historical context you must honor:
- The actual verdict (December 1770): 6 soldiers acquitted, 2 convicted of manslaughter only (not murder). This was a landmark verdict defending rule of law.
- The jury was composed of colonial citizens — merchants, tradespeople, farmers, craftsmen. NOT all Patriots; Boston had loyalists and moderates too.
- The political atmosphere was inflamed — many Bostonians wanted blood. But the jury was sworn to the law.
- If Adams cross-examined well (total credibility shift very negative), lean toward acquittal for most jurors.
- If Adams cross-examined poorly (total shift positive or close to zero), lean toward more MANSLAUGHTER or even MURDER votes.
- The verdict should reflect the player's actual performance.

Generate exactly 12 historically-plausible colonial Boston jurors. Mix of occupations: merchants, coopers, tailors, shipwrights, farmers, innkeepers, clergymen, blacksmiths, ropemakers, printers. Give them authentic colonial-era names.`,
      tools: [
        {
          name: 'render_verdict',
          description: 'Return the jury deliberation results and verdict',
          input_schema: {
            type: 'object',
            properties: {
              jurors: {
                type: 'array',
                description: 'Exactly 12 jurors with their votes and reasoning',
                items: {
                  type: 'object',
                  properties: {
                    name: {
                      type: 'string',
                      description: 'Historically plausible colonial New England name'
                    },
                    occupation: {
                      type: 'string',
                      description: 'Colonial-era occupation (e.g., Merchant, Cooper, Shipwright)'
                    },
                    vote: {
                      type: 'string',
                      enum: ['NOT GUILTY', 'MANSLAUGHTER', 'MURDER'],
                      description: 'The juror\'s verdict'
                    },
                    reasoning: {
                      type: 'string',
                      description: 'One sentence explaining why this juror voted this way — specific to the evidence and testimony'
                    }
                  },
                  required: ['name', 'occupation', 'vote', 'reasoning']
                }
              },
              verdict: {
                type: 'string',
                enum: ['acquittal', 'manslaughter', 'murder'],
                description: 'The overall verdict: acquittal if majority NOT GUILTY, manslaughter if most severe is MANSLAUGHTER, murder if any MURDER convictions'
              },
              verdict_narrative: {
                type: 'string',
                description: '2-3 sentences describing the verdict, what it means for Adams and the soldiers, and its significance for American law and independence. Make it feel historically weighty.'
              }
            },
            required: ['jurors', 'verdict', 'verdict_narrative']
          }
        }
      ],
      tool_choice: { type: 'tool', name: 'render_verdict' },
      messages: [
        {
          role: 'user',
          content: 'The jury has concluded deliberations. Please render the verdict.'
        }
      ]
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) {
      return res.status(500).json({ error: 'No tool response from Claude' });
    }

    return res.status(200).json(toolUse.input);
  } catch (err) {
    console.error('Jury error:', err);
    return res.status(500).json({ error: err.message });
  }
}
