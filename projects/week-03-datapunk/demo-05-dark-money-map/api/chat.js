import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { messages, networkContext } = body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const networkSummary = networkContext
    ? JSON.stringify({
        nodes: networkContext.nodes?.map(n => ({
          id: n.id,
          label: n.label,
          type: n.type,
          party: n.party,
          sector: n.sector,
          amount: n.amount,
          occupation: n.occupation,
          employer: n.employer
        })),
        edges: networkContext.edges?.map(e => ({
          source: e.source,
          target: e.target,
          amount: e.amount,
          date: e.date,
          occupation: e.occupation,
          sector: e.sector
        })),
        meta: networkContext.meta
      })
    : '{}';

  const systemPrompt = `You are The Oracle — a campaign finance intelligence analyst with access to a live political donation network graph. The user sees this network visualization on screen right now.

Network data:
${networkSummary}

When the user asks about specific donors, candidates, relationships, or patterns:
1. Use the highlight_nodes tool FIRST to highlight relevant nodes on the graph — use the node "id" field exactly as it appears in the data
2. Then provide a concise, insightful analysis (2-4 sentences)

Be direct, factual, and slightly sardonic — like a seasoned investigative journalist who has seen too many fundraising dinners. Reference specific names and dollar amounts from the data. If the user asks a general question, pick the most interesting nodes to highlight.

If no network data is loaded, tell the user to search for a candidate or donor first.`;

  const tools = [
    {
      name: 'highlight_nodes',
      description: 'Highlight specific nodes on the network graph to draw the user\'s attention to them. Call this before giving your analysis.',
      input_schema: {
        type: 'object',
        properties: {
          node_ids: {
            type: 'array',
            items: { type: 'string' },
            description: 'IDs of nodes to highlight on the graph. Use the exact "id" field from the network data.'
          }
        },
        required: ['node_ids']
      }
    }
  ];

  try {
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: systemPrompt,
      tools,
      messages
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'text_delta') {
          res.write(`data: ${JSON.stringify({ type: 'text', delta: event.delta.text })}\n\n`);
        }
      }
    }

    // Get final message to check for tool calls
    const finalMessage = await stream.finalMessage();

    for (const block of finalMessage.content) {
      if (block.type === 'tool_use' && block.name === 'highlight_nodes') {
        // Emit highlight event to frontend
        res.write(`data: ${JSON.stringify({ type: 'highlight', node_ids: block.input.node_ids })}\n\n`);

        // Send follow-up to get the text analysis after the tool call
        const followUp = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 400,
          system: systemPrompt,
          tools,
          messages: [
            ...messages,
            { role: 'assistant', content: finalMessage.content },
            {
              role: 'user',
              content: [
                {
                  type: 'tool_result',
                  tool_use_id: block.id,
                  content: `Nodes highlighted on graph: ${block.input.node_ids.join(', ')}`
                }
              ]
            }
          ]
        });

        for await (const ev of followUp) {
          if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') {
            res.write(`data: ${JSON.stringify({ type: 'text', delta: ev.delta.text })}\n\n`);
          }
        }
      }
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    console.error('Chat error:', err);
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  }
}
