import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { witnessId, witnessName, testimonyText, question, defenseStrategy, priorCredibilityShift } = body;

  const strategyDescriptions = {
    'self-defense': 'Self-Defense Under Provocation — the mob attacked first with ice, clubs, and oyster shells; the soldiers had no choice but to fire in self-defense',
    'mistaken-command': 'Mistaken Command — soldiers heard a civilian shout "Fire!" not a military order; there was confusion, not criminal intent',
    'lawful-duty': 'Lawful Military Duty — soldiers were lawfully posted under military authority and followed legal military protocol; they cannot be held criminally liable'
  };

  const strategyText = strategyDescriptions[defenseStrategy] || strategyDescriptions['self-defense'];

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 600,
      system: `You are evaluating John Adams' cross-examination of ${witnessName} at the Boston Massacre trial, December 1770.

Adams' defense strategy: ${strategyText}

The witness just testified: "${testimonyText}"

Adams has now asked: "${question}"

Evaluate how effective this cross-examination question was for Adams' defense. Consider:
- Does the question expose an inconsistency, contradiction, or weakness in the testimony?
- Does it establish facts consistent with the defense strategy (provocation, mistaken command, or lawful duty)?
- Does it cast doubt on the witness's credibility, position, or motive?
- Is it historically plausible for the 1770 courtroom context?

A skilled question earns a credibility shift of -15 to -30 (witness becomes less credible = good for defense).
A moderate question earns -5 to -15.
A weak or irrelevant question earns -3 to +5.
A question that helps the prosecution or is badly off-strategy earns +5 to +20.

Be historically grounded. John Adams was a brilliant lawyer. If the question shows lawyerly skill — catching inconsistency, pinning down testimony, establishing provocation — reward it. If it's vague, accusatory without basis, or misses an obvious opening, note that.`,
      tools: [
        {
          name: 'evaluate_crossexamination',
          description: 'Evaluate the effectiveness of Adams\' cross-examination question',
          input_schema: {
            type: 'object',
            properties: {
              credibility_shift: {
                type: 'integer',
                description: 'Change to witness credibility score (-30 to +20). Negative = witness becomes less credible = good for defense. Positive = witness becomes more credible = bad for defense.'
              },
              key_point_landed: {
                type: 'string',
                description: 'The most effective point Adams made with this question, in one sentence. Return null string if nothing meaningful landed.'
              },
              opportunity_missed: {
                type: 'string',
                description: 'What a more skilled cross-examination might have exposed or pressed on instead — one sentence of honest lawyerly coaching.'
              },
              witness_reaction: {
                type: 'string',
                description: '1-2 sentences: how the witness responded to Adams\' question, in character, in period-accurate voice. Show the witness reacting emotionally or strategically to the pressure.'
              }
            },
            required: ['credibility_shift', 'opportunity_missed', 'witness_reaction']
          }
        }
      ],
      tool_choice: { type: 'tool', name: 'evaluate_crossexamination' },
      messages: [
        {
          role: 'user',
          content: 'Evaluate this cross-examination question and return your assessment.'
        }
      ]
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) {
      return res.status(500).json({ error: 'No tool response from Claude' });
    }

    return res.status(200).json(toolUse.input);
  } catch (err) {
    console.error('Cross-examine error:', err);
    return res.status(500).json({ error: err.message });
  }
}
