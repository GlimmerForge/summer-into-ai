import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

const FACTION_DETAILS = {
  louis: {
    name: 'King Louis XVI',
    personality: 'You are King Louis XVI of France, a cautious and indecisive monarch. You crave military glory to restore French prestige lost in the Seven Years\' War, but you are deeply anxious about the massive expense of war and the risk of defeat. You are swayed by arguments about honor and legacy, but you flinch at financial ruin. You speak with royal authority but underlying uncertainty. You are wary of openly backing rebels against a fellow monarch, which sets a dangerous precedent.'
  },
  vergennes: {
    name: 'Foreign Minister Vergennes',
    personality: 'You are Charles Gravier, Comte de Vergennes, French Foreign Minister. You are cool, strategic, and professional — the most capable diplomat in Versailles. Your singular goal is to weaken Britain and restore French dominance in Europe. You evaluate everything through a geopolitical lens: alliances, balance of power, trade routes. You are methodical, not easily swayed by sentiment, but you respond to strategic logic and concrete advantage.'
  },
  philosophes: {
    name: 'Philosophe Circle / Académie',
    personality: 'You are the collective voice of the French Philosophes and Académie française — Voltaire\'s circle, Condorcet, and the intellectuals who see America as a living experiment in Enlightenment ideals. You are passionately in favor of liberty, natural rights, and republicanism. You love Franklin personally — he is one of you, a man of science and reason. You are swayed by idealism, the purity of the American cause, and the idea that France is backing the future of civilization.'
  },
  merchants: {
    name: 'Merchant Consortium',
    personality: 'You are the leading French merchant interests and financiers — the Compagnie des Indes crowd and their allies. You care about exactly one thing: profit. Trade routes, letters of marque, contracts to supply the Continental Army, access to American ports. You are skeptical of idealism and wary of losing ships to the Royal Navy. You respond to concrete financial proposals, risk-reward analysis, and guaranteed commercial arrangements. You speak in terms of livres, cargo, and margins.'
  }
};

const EVALUATE_DIPLOMACY_TOOL = {
  name: 'evaluate_diplomacy',
  description: 'Evaluate Benjamin Franklin\'s diplomatic argument from your faction\'s perspective and return structured feedback.',
  input_schema: {
    type: 'object',
    properties: {
      alignment_shift: {
        type: 'integer',
        description: 'Change in your support for the American cause (-20 to +30). Positive means more aligned with American cause. Base this on how well the argument matched your specific interests.'
      },
      what_worked: {
        type: 'string',
        description: 'One sentence: what about Franklin\'s argument resonated with your interests or values.'
      },
      what_failed: {
        type: 'string',
        description: 'One sentence: what missed the mark, concerned you, or failed to address your needs.'
      },
      counter_demand: {
        type: 'string',
        description: 'One sentence: what you want in return for increased support — a concrete ask or condition.'
      },
      faction_voice: {
        type: 'string',
        description: '1-2 sentences spoken in character as your faction, directly responding to Franklin. Period-accurate tone and voice.'
      }
    },
    required: ['alignment_shift', 'what_worked', 'what_failed', 'counter_demand', 'faction_voice']
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const {
    faction,
    playerArgument,
    currentAlignment,
    roundNum,
    priorRoundSummary,
    openingGambit
  } = body;

  if (!faction || !playerArgument) {
    return res.status(400).json({ error: 'Missing faction or playerArgument' });
  }

  const factionInfo = FACTION_DETAILS[faction];
  if (!factionInfo) {
    return res.status(400).json({ error: 'Unknown faction' });
  }

  const systemPrompt = `${factionInfo.personality}

It is February 1778. Benjamin Franklin has come to Versailles seeking a formal Treaty of Alliance. You are meeting with him in a private audience.

Your current alignment with the American cause: ${currentAlignment}% (0 = openly hostile, 100 = fully committed).
This is Round ${roundNum} of 4.

${openingGambit ? `Franklin established his approach early: "${openingGambit}"` : ''}
${priorRoundSummary ? `Prior interactions with Franklin: ${priorRoundSummary}` : ''}

Evaluate his argument carefully based on YOUR specific interests. Be honest — a weak argument should shift alignment downward or minimally. A brilliant argument that speaks directly to your concerns should move you significantly. Do not be generous for its own sake.

Return your evaluation using the evaluate_diplomacy tool.`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      tools: [EVALUATE_DIPLOMACY_TOOL],
      tool_choice: { type: 'any' },
      messages: [
        {
          role: 'user',
          content: `Franklin's argument to you: "${playerArgument}"`
        }
      ]
    });

    const toolUse = response.content.find(block => block.type === 'tool_use');
    if (!toolUse) {
      return res.status(500).json({ error: 'No tool response from Claude' });
    }

    const result = toolUse.input;

    // Clamp alignment shift
    const shift = Math.max(-20, Math.min(30, result.alignment_shift));
    const newAlignment = Math.max(0, Math.min(100, currentAlignment + shift));

    return res.status(200).json({
      alignment_shift: shift,
      new_alignment: newAlignment,
      what_worked: result.what_worked,
      what_failed: result.what_failed,
      counter_demand: result.counter_demand,
      faction_voice: result.faction_voice,
      faction_name: factionInfo.name
    });
  } catch (err) {
    console.error('negotiate error:', err);
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
}
