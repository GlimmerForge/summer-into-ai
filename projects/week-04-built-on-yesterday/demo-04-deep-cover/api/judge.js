import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { missionNumber, missionType, missionData, playerResponse, networkState } = body;

  const systemPrompt = `You are General George Washington, Commander-in-Chief of the Continental Army. It is 1779 and you are reviewing a field report from Agent 711 — your most trusted operative within the Culper Ring intelligence network.

Speak as Washington would: formal, measured, strategic. You weigh every word. The fate of the Revolution depends on the integrity of your intelligence network. Individual glory means nothing — the network's survival means everything.

Evaluate the agent's performance with historical authenticity. Reference real tradecraft concerns: courier security, cipher integrity, plausible deniability, the danger of British counterintelligence (particularly Major John André).

End your assessment with exactly one of these outcome markers on its own line:
[SUCCESS]
[PARTIAL]
[FAILURE]

Then on the following line, end with a network integrity change marker:
[NETWORK: +10] or [NETWORK: +5] or [NETWORK: 0] or [NETWORK: -5] or [NETWORK: -10] or [NETWORK: -15]

SUCCESS = +5 to +10 network integrity
PARTIAL = 0 to +5 network integrity
FAILURE = -5 to -15 network integrity

Current network integrity: ${networkState?.networkIntegrity ?? 75}%`;

  const userMessage = `Mission ${missionNumber} (${missionType}):

Scenario: ${missionData?.scenario || 'Field operation'}
Original dispatch: ${missionData?.dispatch || 'N/A'}
Correct answer: ${missionData?.hiddenMission || 'N/A'}
Player's response: ${playerResponse}

Evaluate this operative's response and give your strategic assessment. Be specific about what they got right or wrong from an 18th-century intelligence tradecraft perspective.`;

  try {
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      thinking: { type: 'enabled', budget_tokens: 6000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      stream: true
    });

    let fullText = '';
    let outcomeSent = false;
    let networkSent = false;

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const d = event.delta;
        if (d.type === 'thinking_delta') {
          res.write(`data: ${JSON.stringify({ type: 'thinking', delta: d.thinking })}\n\n`);
        } else if (d.type === 'text_delta') {
          fullText += d.text;
          res.write(`data: ${JSON.stringify({ type: 'text', delta: d.text })}\n\n`);

          if (!outcomeSent) {
            const outcomeMatch = fullText.match(/\[(SUCCESS|PARTIAL|FAILURE)\]/);
            if (outcomeMatch) {
              res.write(`data: ${JSON.stringify({ type: 'outcome', value: outcomeMatch[1] })}\n\n`);
              outcomeSent = true;
            }
          }

          if (!networkSent) {
            const networkMatch = fullText.match(/\[NETWORK:\s*([+-]?\d+)\]/);
            if (networkMatch) {
              res.write(`data: ${JSON.stringify({ type: 'network_change', value: parseInt(networkMatch[1]) })}\n\n`);
              networkSent = true;
            }
          }
        }
      }
    }

    // Fallbacks if markers were not emitted
    if (!outcomeSent) {
      res.write(`data: ${JSON.stringify({ type: 'outcome', value: 'PARTIAL' })}\n\n`);
    }
    if (!networkSent) {
      res.write(`data: ${JSON.stringify({ type: 'network_change', value: 0 })}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Judge error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
}
