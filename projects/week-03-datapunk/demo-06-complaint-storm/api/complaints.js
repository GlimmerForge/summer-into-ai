export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { company } = body;

  if (!company || !company.trim()) {
    return res.status(400).json({ error: 'Company name required' });
  }

  // Try company name as-is, then uppercase, then partial
  const names = [company.trim(), company.trim().toUpperCase()];
  let data = null;

  for (const name of names) {
    try {
      const url = `https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/?company=${encodeURIComponent(name)}&sort=created_date_desc&size=500`;
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (!r.ok) continue;
      const json = await r.json();
      if (json?.hits?.total?.value > 0) {
        data = json;
        break;
      }
    } catch (e) {
      // continue to next variant
    }
  }

  // Fallback: try a looser search
  if (!data || (data?.hits?.total?.value || 0) === 0) {
    try {
      const url = `https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/?search_term=${encodeURIComponent(company.trim())}&sort=created_date_desc&size=500`;
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
      if (r.ok) {
        const json = await r.json();
        if (json?.hits?.total?.value > 0) {
          data = json;
        }
      }
    } catch (e) {
      // ignore
    }
  }

  if (!data || (data?.hits?.hits?.length || 0) === 0) {
    return res.json({
      complaints: [],
      issueBreakdown: {},
      total: 0,
      companyName: company,
      resolutionRate: 0,
      error: 'No complaints found. Try a different company name (e.g. "WELLS FARGO BANK, N.A." or "COINBASE, INC.").'
    });
  }

  const complaints = (data.hits.hits || []).map(h => ({
    id: h._id || Math.random().toString(36).slice(2),
    issue: h._source.issue || 'Other',
    subIssue: h._source.sub_issue || '',
    narrative: h._source.consumer_complaint_narrative || '',
    response: h._source.company_response_to_consumer || '',
    date: h._source.date_received || '',
    product: h._source.product || '',
    state: h._source.state || '',
    company: h._source.company || company
  }));

  // Compute issue breakdown client-side
  const breakdown = {};
  for (const c of complaints) {
    const key = c.issue || 'Other';
    breakdown[key] = (breakdown[key] || 0) + 1;
  }

  const total = data.hits.total.value || complaints.length;
  const companyName = complaints[0]?.company || company;

  // Compute resolution rate
  const resolved = complaints.filter(c =>
    c.response && !c.response.toLowerCase().includes('in progress')
  ).length;
  const resolutionRate = complaints.length
    ? Math.round((resolved / complaints.length) * 100)
    : 0;

  res.json({ complaints, issueBreakdown: breakdown, total, companyName, resolutionRate });
}
