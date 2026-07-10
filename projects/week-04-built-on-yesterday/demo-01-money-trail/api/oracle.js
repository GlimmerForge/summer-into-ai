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
  const { question, networkJson } = body;

  // networkJson can be a single network or { a: network, b: network } for compare mode
  const isCompare = networkJson && typeof networkJson === 'object' && ('a' in networkJson || 'b' in networkJson);

  let networkSummary;
  if (isCompare) {
    networkSummary = `COMPARE MODE — Two candidate networks loaded:

NETWORK A:
${JSON.stringify(networkJson.a || {}, null, 2)}

NETWORK B:
${JSON.stringify(networkJson.b || {}, null, 2)}`;
  } else {
    networkSummary = JSON.stringify(networkJson || {}, null, 2);
  }

  const systemPrompt = `You are The Oracle — an AI analyst that investigates political money networks.

You have access to the following network data:
${networkSummary}

Node types in the data:
- "candidate": the politician at the center
- "pac": a PAC or committee that donated to the candidate (diamond node on screen)
- "donor": an individual who donated directly to the candidate
- "pac_donor": an individual who donated to a PAC, which in turn donated to the candidate (3-layer chain)

When analyzing, use the highlight_nodes tool FIRST to identify relevant nodes, then stream your analysis.
Call highlight_nodes with node IDs exactly as they appear in the data.
Be specific: cite actual names, amounts, and PAC chains visible in the data.
Write in plain prose with short paragraphs. Do NOT use markdown syntax — no #, ##, **, tables, pipes, or > quotes. Your output renders as plain text, so markdown symbols appear as literal clutter.
${isCompare ? 'For compare mode: identify shared donors by matching labels across both networks.' : ''}`;

  const tools = [{
    name: 'highlight_nodes',
    description: 'Highlight specific nodes in the network graph to draw the user\'s attention',
    input_schema: {
      type: 'object',
      properties: {
        node_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Exact node IDs to highlight (from the "id" field in network data)'
        }
      },
      required: ['node_ids']
    }
  }];

  try {
    // Turn 1: extended thinking + possible tool use
    // Use client.messages.stream() so we can call finalMessage() after iteration —
    // that gives us the complete message with thinking.signature intact, no manual delta tracking.
    const stream1 = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      thinking: { type: 'enabled', budget_tokens: 10000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: question }],
      tools,
      tool_choice: { type: 'auto' }
    });

    for await (const event of stream1) {
      if (event.type === 'content_block_start' && event.content_block?.type === 'thinking') {
        res.write(`data: ${JSON.stringify({ type: 'thinking_start' })}\n\n`);
      } else if (event.type === 'content_block_delta') {
        const d = event.delta;
        if (d.type === 'thinking_delta') {
          res.write(`data: ${JSON.stringify({ type: 'thinking', delta: d.thinking })}\n\n`);
        } else if (d.type === 'text_delta') {
          res.write(`data: ${JSON.stringify({ type: 'text', delta: d.text })}\n\n`);
        }
      }
    }

    // finalMessage() returns the complete API response — thinking blocks include signature field
    const turn1 = await stream1.finalMessage();
    const toolBlock = turn1.content.find(b => b.type === 'tool_use');

    if (toolBlock?.input?.node_ids?.length) {
      res.write(`data: ${JSON.stringify({ type: 'highlight', node_ids: toolBlock.input.node_ids })}\n\n`);

      // Turn 2: provide tool result, stream the text analysis
      const stream2 = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: systemPrompt,
        messages: [
          { role: 'user', content: question },
          { role: 'assistant', content: turn1.content },
          {
            role: 'user',
            content: [{
              type: 'tool_result',
              tool_use_id: toolBlock.id,
              content: `Nodes highlighted on graph: ${toolBlock.input.node_ids.join(', ')}`
            }]
          }
        ],
        tools,
        stream: true
      });

      for await (const event of stream2) {
        if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
          res.write(`data: ${JSON.stringify({ type: 'text', delta: event.delta.text })}\n\n`);
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Oracle error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  }
}
