import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

async function fetchCfpb(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const r = await fetch(url, {
      headers: { 'Accept': 'application/json' },
      signal: controller.signal
    });
    if (!r.ok) return null;
    return await r.json();
  } catch (e) {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { company } = body;

  if (!company || !company.trim()) {
    return res.status(400).json({ error: 'Company name required' });
  }

  const API = 'https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/';

  // Evolved from Complaint Storm (week 3): resolve the fuzzy user input to the
  // CFPB's canonical company name first, then pull complaints WITH narratives.
  let canonical = null;
  const suggestions = await fetchCfpb(`${API}_suggest_company/?text=${encodeURIComponent(company.trim())}`);
  if (Array.isArray(suggestions) && suggestions.length > 0) {
    canonical = suggestions[0];
  }

  let data = null;
  let totalOnFile = 0;

  if (canonical) {
    const [narrJson, totalJson] = await Promise.all([
      fetchCfpb(`${API}?company=${encodeURIComponent(canonical)}&sort=created_date_desc&size=200&has_narrative=true`),
      fetchCfpb(`${API}?company=${encodeURIComponent(canonical)}&size=1`)
    ]);
    if (narrJson?.hits?.hits?.length > 0) data = narrJson;
    totalOnFile = totalJson?.hits?.total?.value || narrJson?.hits?.total?.value || 0;
  }

  // Fallback (Complaint Storm's original path): loose search across all fields
  if (!data) {
    const json = await fetchCfpb(`${API}?search_term=${encodeURIComponent(company.trim())}&sort=created_date_desc&size=200&has_narrative=true`);
    if (json?.hits?.hits?.length > 0) {
      data = json;
      totalOnFile = totalOnFile || json.hits.total.value || 0;
    }
  }

  if (!data || (data?.hits?.hits?.length || 0) === 0) {
    return res.json({
      patterns: [],
      total: 0,
      companyName: company,
      error: 'No complaints found in the CFPB database. Try a different name (e.g. "Wells Fargo", "Equifax", "Coinbase"). The CFPB API can also be slow — try again in a moment.'
    });
  }

  const complaints = (data.hits.hits || []).map(h => ({
    issue: h._source.issue || 'Other',
    subIssue: h._source.sub_issue || '',
    narrative: h._source.complaint_what_happened || '',
    product: h._source.product || '',
    state: h._source.state || '',
    date: h._source.date_received || ''
  }));

  const total = totalOnFile || data.hits.total.value || complaints.length;
  const companyName = canonical || data.hits.hits[0]?._source?.company || company;

  // Issue breakdown across the full sample
  const breakdown = {};
  for (const c of complaints) {
    const key = c.issue || 'Other';
    breakdown[key] = (breakdown[key] || 0) + 1;
  }
  const breakdownText = Object.entries(breakdown)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([issue, count]) => `${issue}: ${count} complaints`)
    .join('\n');

  // Real narratives for Claude to cluster
  const withNarratives = complaints
    .filter(c => c.narrative && c.narrative.length > 60)
    .slice(0, 40);

  const narrativeText = withNarratives
    .map((c, i) => `[#${i + 1}] (${c.product} / ${c.issue}${c.state ? ' / ' + c.state : ''}): "${c.narrative.slice(0, 350).replace(/\s+/g, ' ')}"`)
    .join('\n');

  const clusterTool = {
    name: 'submit_patterns',
    description: 'Submit the candidate patterns of alleged misconduct discovered in the complaint data.',
    input_schema: {
      type: 'object',
      properties: {
        patterns: {
          type: 'array',
          description: '5 to 6 distinct candidate patterns, ordered strongest first.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Short slug id, e.g. "hidden-fees"' },
              title: { type: 'string', description: 'Punchy pattern name, e.g. "Systematic Fee Stacking" (plain text, no markdown)' },
              complaintCount: { type: 'integer', description: 'How many complaints in the provided sample support this pattern' },
              strength: { type: 'integer', description: 'Legal strength of this pattern as a class-action exhibit, 1 (weak) to 10 (devastating)' },
              sampleNarrative: { type: 'string', description: 'A short verbatim excerpt (1-2 sentences) from a real complaint narrative above that best illustrates this pattern' },
              legalTheory: { type: 'string', description: 'One-sentence legal theory this pattern supports, in plain English (e.g. breach of contract, UDAAP violation, FCRA violation). Plain prose, no markdown.' }
            },
            required: ['id', 'title', 'complaintCount', 'strength', 'sampleNarrative', 'legalTheory']
          }
        }
      },
      required: ['patterns']
    }
  };

  try {
    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      tools: [clusterTool],
      tool_choice: { type: 'tool', name: 'submit_patterns' },
      system: 'You are a plaintiff-side class action attorney reviewing raw CFPB consumer complaint data during discovery. Cluster the complaints into distinct patterns of alleged corporate misconduct that could each serve as an exhibit in a class action lawsuit. Base every pattern strictly on the data provided — real counts, real narrative excerpts. Vary the strength scores honestly: some patterns should be strong (many complaints, clear harm), others weak (few complaints, vague harm). All text fields must be plain prose with NO markdown formatting (no #, no **, no *).',
      messages: [{
        role: 'user',
        content: `Company: ${companyName}
Total complaints on file with the CFPB: ${total}
Sample analyzed: ${complaints.length} most recent complaints.

ISSUE BREAKDOWN (sample):
${breakdownText}

REAL COMPLAINT NARRATIVES (sample):
${narrativeText || '(few narratives available — cluster using the issue breakdown instead, and use issue/sub-issue text for sampleNarrative)'}

Cluster this into 5-6 candidate exhibit patterns for a class action against ${companyName}.`
      }]
    });

    const toolUse = msg.content.find(b => b.type === 'tool_use');
    const patterns = toolUse?.input?.patterns || [];

    if (!patterns.length) {
      return res.status(502).json({ error: 'The AI failed to cluster the complaints. Please try again.' });
    }

    res.json({ patterns, total, companyName, sampleSize: complaints.length });
  } catch (e) {
    console.error('discover error:', e);
    res.status(502).json({ error: 'AI clustering failed: ' + (e.message || 'unknown error') });
  }
}
