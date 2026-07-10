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
  const { drugs } = body;

  if (!drugs || !drugs.length) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: 'No drug data provided' })}\n\n`);
    return res.end();
  }

  const systemPrompt = `You are a clinical pharmacologist analyzing real FDA adverse event data from the FDA Adverse Event Reporting System (FAERS).

Analyze the provided drug data and deliver a structured clinical assessment covering:

1. **Individual Drug Risk Profiles** — for each drug, identify the standout adverse events, how serious the profile looks, and what the trend data suggests
2. **Combination Interaction Risks** — identify potential dangerous interactions if these drugs were taken together; cite specific shared adverse events and additive risk mechanisms
3. **Shared Adverse Event Patterns** — reactions that appear across multiple drugs (synergistic danger zones)
4. **Vulnerable Patient Populations** — specific groups at elevated risk (elderly, renally impaired, etc.) based on the reaction profiles
5. **Top 3 Actionable Recommendations** — specific, concrete guidance a clinician or patient should know

Be specific — always cite actual reaction counts and percentages from the data. This is real FAERS data representing real patient reports. Treat it seriously.

Format: your output renders as PLAIN TEXT in a terminal-style panel — markdown symbols appear as literal clutter. Do NOT use #, ##, **, tables, pipes, or emoji. Write section titles in UPPERCASE on their own line, followed by the section text. Keep each section concise but substantive.`;

  const drugSummary = drugs.map(d => ({
    name: d.name,
    totalAdverseEvents: d.totalEvents,
    seriousnessRate: `${d.seriousPercent}% serious`,
    top10Reactions: d.topReactions.slice(0, 10),
    labelWarningExcerpt: d.labelWarning || 'Not available',
  }));

  const userMessage = `Analyze these ${drugs.length} drug${drugs.length > 1 ? 's' : ''} from FDA FAERS data:\n\n${JSON.stringify(drugSummary, null, 2)}`;

  try {
    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 16000,
      thinking: { type: 'enabled', budget_tokens: 8000 },
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      stream: true,
    });

    let fullText = '';
    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        const d = event.delta;
        if (d.type === 'thinking_delta') {
          res.write(`data: ${JSON.stringify({ type: 'thinking', delta: d.thinking })}\n\n`);
        } else if (d.type === 'text_delta') {
          fullText += d.text;
          res.write(`data: ${JSON.stringify({ type: 'text', delta: d.text })}\n\n`);
        }
      }
    }

    // Second pass: distill the analysis into a structured storm gauge (forced tool call)
    try {
      const gaugeRes = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: 'You are a clinical pharmacologist. Distill the given adverse-event analysis into a storm-severity rating. Be calibrated: a single common drug with routine side effects is a 2-3; a known-dangerous combination (e.g. multiple CNS depressants, anticoagulant stacking) is a 7-9; 10 is reserved for combinations with documented fatal interaction potential.',
        tools: [{
          name: 'set_storm_gauge',
          description: 'Set the storm severity gauge for this drug combination',
          input_schema: {
            type: 'object',
            required: ['riskLevel', 'stormCategory', 'headline', 'keyInteraction'],
            properties: {
              riskLevel: { type: 'integer', minimum: 1, maximum: 10, description: 'Overall risk 1-10' },
              stormCategory: { type: 'string', description: 'Weather-style label, e.g. "LIGHT DRIZZLE", "TROPICAL STORM", "CATEGORY 4 HURRICANE"' },
              headline: { type: 'string', description: 'One-sentence plain-language summary of the overall risk' },
              keyInteraction: { type: 'string', description: 'One sentence naming the single most dangerous interaction or reaction, with the drugs involved' }
            }
          }
        }],
        tool_choice: { type: 'tool', name: 'set_storm_gauge' },
        messages: [{
          role: 'user',
          content: `Drugs analyzed: ${drugs.map(d => d.name).join(', ')}\n\nFull analysis:\n${fullText.slice(0, 6000)}`
        }]
      });
      const gaugeTool = gaugeRes.content.find(b => b.type === 'tool_use');
      if (gaugeTool) {
        res.write(`data: ${JSON.stringify({ type: 'gauge', ...gaugeTool.input })}\n\n`);
      }
    } catch (gaugeErr) {
      console.warn('Gauge call failed:', gaugeErr.message);
    }

    res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
    res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
    res.end();
  }
}
