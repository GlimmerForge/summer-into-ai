import Anthropic from '@anthropic-ai/sdk';
const client = new Anthropic();
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { brief, colors_used, finale_type, shell_count, shell_details } = body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const colors_met = brief.required_colors?.every(c => colors_used?.includes(c));
  const count_met = shell_count >= brief.min_shells;
  const finale_met = finale_type === brief.finale_type;

  // Build a specific show description from the shell details
  const showDesc = shell_details && shell_details.length > 0
    ? shell_details.map(s =>
        `Shell ${s.position}: ${s.color} ${s.type}${s.dyeApplied ? ' (dyed)' : ''}${s.isFinale ? ' — FINALE' : ''}, fired ${s.delay}s after previous`
      ).join('\n')
    : `${shell_count} shells fired, colors: ${colors_used?.join(', ')}`;

  const stream = await client.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 320,
    messages: [{
      role: 'user',
      content: `You are the Town Council secretary recording the crowd's reaction at a colonial fireworks display, Anno Domini 1776.

OCCASION: ${brief.occasion}
CROWD SIZE: ${brief.crowd_size}
COUNCIL REQUIREMENTS: ${brief.required_colors?.join(', ')} colors, minimum ${brief.min_shells} shells, ${brief.finale_type} finale
COUNCIL NOTE: "${brief.council_note}"

WHAT ACTUALLY HAPPENED — shell by shell:
${showDesc}

RESULTS:
- Required colors (${brief.required_colors?.join(', ')}): ${colors_met ? 'DELIVERED' : 'NOT DELIVERED — had ' + (colors_used?.join(', ') || 'none')}
- Shell count (min ${brief.min_shells}): ${count_met ? shell_count + ' shells — MET' : shell_count + ' shells — INSUFFICIENT'}
- Finale (${brief.finale_type}): ${finale_met ? 'DELIVERED' : 'NOT DELIVERED — fired ' + (finale_type || 'nothing')}

Write a 3-sentence council verdict in colonial voice. Reference specific shells from the show — the crowd's gasp at a particular burst, the colors that lit the harbor, a shell that fell flat or wowed the assembly. Be vivid and specific to THIS show. End with the verdict word on its own line: SPLENDID / ADEQUATE / DISAPPOINTING / A DISGRACE`
    }]
  });

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta?.text) {
      res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
    }
  }
  res.write('data: [DONE]\n\n');
  res.end();
}
