import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const SYSTEM_PROMPT = `You are GHOST — a classified intelligence analyst synthesizing federal government data about American neighborhoods. You are given Census, EPA, and FEMA data for a specific ZIP code. Your job is to write a NEIGHBORHOOD INTELLIGENCE DOSSIER that reveals:

1. What the economic picture actually means (not just numbers — what does it mean to live there?)
2. Environmental exposure risk based on EPA facility data
3. Infrastructure and climate vulnerability from disaster history
4. THE CRITICAL SECTION: Cross-dataset patterns and hidden connections — what do these three data sources reveal TOGETHER that none reveals alone?

Format your dossier with these section headers (use exactly this format):
[ECONOMIC PROFILE]
[ENVIRONMENTAL EXPOSURE]
[DISASTER VULNERABILITY]
[GHOST ANALYSIS — CLASSIFIED FINDINGS]
[RISK ASSESSMENT]

End with a line: OVERALL RISK LEVEL: [NOMINAL / ELEVATED / HIGH / CRITICAL]

Be specific with the numbers. Be honest about what the data suggests. This is about transparency, not alarm — but don't soften uncomfortable findings.

National baseline for comparison: median household income $72,000, poverty rate 11.5%, housing median year 1980.`;

function buildUserMessage(data) {
  const { zip, city, state, census, epa, fema } = data;
  const lines = [`ZIP Code: ${zip} (${city}, ${state})`, '', 'CENSUS DATA:'];

  if (census.error) {
    lines.push(`- ERROR: ${census.error}`);
  } else {
    if (census.medianIncome != null)
      lines.push(`- Median household income: $${census.medianIncome.toLocaleString()} (vs national $72,000)`);
    else
      lines.push(`- Median household income: data unavailable`);
    if (census.povertyRate != null)
      lines.push(`- Poverty rate: ${census.povertyRate}% (vs national 11.5%)`);
    else
      lines.push(`- Poverty rate: data unavailable`);
    if (census.noInternetRate != null)
      lines.push(`- No internet access: ${census.noInternetRate}% of households`);
    if (census.medianYearBuilt != null)
      lines.push(`- Median year structure built: ${census.medianYearBuilt}`);
  }

  lines.push('', 'EPA TOXIC RELEASE INVENTORY DATA:');
  if (epa.error) {
    lines.push(`- ERROR: ${epa.error}`);
  } else {
    lines.push(`- Active TRI facilities (legally required to report toxic chemical releases): ${epa.totalFacilities}`);
    if (epa.topFacilities.length > 0)
      lines.push(`- Facility names include: ${epa.topFacilities.join(', ')}`);
    if (epa.totalFacilities === 0)
      lines.push(`- No TRI-reporting facilities found in this ZIP (may indicate residential area or very light industry)`);
  }

  lines.push('', `FEMA DATA (${fema.stateName}, last 5 years):`);
  if (fema.error) {
    lines.push(`- ERROR: ${fema.error}`);
  } else {
    lines.push(`- Disaster declarations: ${fema.disasterCount}`);
    if (fema.types.length > 0)
      lines.push(`- Types: ${fema.types.join(', ')}`);
    if (fema.mostRecent)
      lines.push(`- Most recent: ${fema.mostRecent}`);
  }

  return lines.join('\n');
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

  if (!body || !body.zip) {
    return res.status(400).json({ error: 'Missing data payload' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const userMessage = buildUserMessage(body);

    const stream = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 8000,
      thinking: { type: 'enabled', budget_tokens: 5000 },
      stream: true,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta') {
        if (event.delta.type === 'thinking_delta') {
          res.write(`event: thinking\ndata: ${JSON.stringify({ text: event.delta.thinking })}\n\n`);
        } else if (event.delta.type === 'text_delta') {
          res.write(`event: text\ndata: ${JSON.stringify({ text: event.delta.text })}\n\n`);
        }
      }
    }

    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (err) {
    const msg = err?.message ?? 'Unknown error';
    res.write(`event: error\ndata: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
}
