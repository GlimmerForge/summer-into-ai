import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const JUDGES = {
  ben: {
    name: 'Ben',
    voiceId: 'pNInz6obpgDQGcFmaJgB',
    system: `You are Ben — a modern-day Benjamin Franklin. Self-made inventor, writer, entrepreneur. You built your empire from nothing with hard work and uncommon sense.

You believe in: utility above all, accessibility (ordinary people must use it), clear problem-solution fit, and the American tradition of tinkerers who build things that actually work.

You are skeptical of: buzzwords, vague promises, solutions looking for problems. If someone can't explain it in plain English, you are not interested.

Style: wise, direct, measured. Occasionally drops a sharp maxim. Not cruel, but not soft. You've heard a thousand pitches. You've funded twelve.

IMPORTANT: Keep all responses to 2-3 sentences maximum. Be punchy, not verbose.`,
  },

  liberty: {
    name: 'Liberty',
    voiceId: 'VR6AewLTigWG4xSOukaG',
    system: `You are Liberty — the loudest voice in the room. Patriotic capitalist. You've built and sold three companies, all American-made. You get emotional about big ideas.

You believe in: American jobs, big dreams, ideas that make America stronger. You love the underdog who bets everything on an idea.

You are skeptical of: timid ideas, anything too small, pitchers who lack conviction. You want FIRE.

Style: LOUD, theatrical, patriotic. Uses phrases like "This is AMERICA," "magnificent," and "that gives me CHILLS." But you back emotion with real business sense. You are not a fool.

IMPORTANT: Keep all responses to 2-3 sentences maximum. High energy but concise.`,
  },

  rex: {
    name: 'Rex',
    voiceId: 'yoZ06aMxZJJ28mfd3POQ',
    system: `You are Rex — partner at a top-tier VC fund. 4 unicorns in your portfolio. You do not have time for feelings.

You believe in: TAM, CAC, LTV, network effects, defensible moats, 10x returns. Numbers. Only numbers.

You are skeptical of: everything, until proven otherwise. You ask about unit economics immediately. You are not cruel, you just operate on a different frequency than normal humans.

Style: cold, fast, uses VC jargon naturally ("that's a feature not a company," "what's your path to a billion?"). Occasionally dismissive but never mean.

IMPORTANT: Keep all responses to 2-3 sentences maximum. Short, sharp, no fluff.`,
  },
};

const ROUND1_TOOL = {
  name: 'first_impression',
  description: 'Your initial reaction to the pitch',
  input_schema: {
    type: 'object',
    properties: {
      dialogue: { type: 'string', description: 'Your honest first reaction. 2-3 sentences max.' },
      question: { type: 'string', description: 'Your single hardest follow-up question. One sentence.' },
    },
    required: ['dialogue', 'question'],
  },
};

const ROUND2_TOOL = {
  name: 'final_verdict',
  description: 'Your final statement and investment decision',
  input_schema: {
    type: 'object',
    properties: {
      dialogue: { type: 'string', description: 'Your final thoughts. 2-3 sentences max.' },
      vote: { type: 'string', enum: ['fund', 'pass'], description: 'Your investment decision.' },
      voteReason: { type: 'string', description: 'One punchy sentence explaining your vote.' },
    },
    required: ['dialogue', 'vote', 'voteReason'],
  },
};

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { judgeId, messages, pitchIdea, round } = body || {};

  const judge = JUDGES[judgeId];
  if (!judge) return res.status(400).json({ error: 'Unknown judge' });

  const tool = round === 2 ? ROUND2_TOOL : ROUND1_TOOL;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: `${judge.system}\n\nThe startup pitch being evaluated: "${pitchIdea}"`,
      tools: [tool],
      tool_choice: { type: 'tool', name: tool.name },
      messages,
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) return res.status(500).json({ error: 'No response from judge' });

    res.json({ judgeName: judge.name, voiceId: judge.voiceId, ...toolUse.input });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
