export const config = { api: { bodyParser: true } };

const FEC_BASE = 'https://api.open.fec.gov/v1';

function getSector(occupation = '', employer = '') {
  const text = `${occupation} ${employer}`.toLowerCase();
  if (/bank|investment|capital|securities|hedge|financ|wall st|asset|portfolio|equity/.test(text)) return 'Finance';
  if (/oil|gas|energy|petroleum|coal|mining|power plant|refin/.test(text)) return 'Energy';
  if (/tech|software|google|apple|microsoft|amazon|meta|facebook|silicon|digital|cyber/.test(text)) return 'Tech';
  if (/law|attorney|legal|counsel|esquire|litigation|partner|firm/.test(text)) return 'Law';
  if (/retire|not employed|unemployed|homemaker|housewife|househusband/.test(text)) return 'Retired';
  if (/real estate|property|mortgage|housing|developer|construction/.test(text)) return 'Real Estate';
  if (/health|medical|pharma|hospital|doctor|physician|nurse|biotech/.test(text)) return 'Health';
  if (/education|university|school|professor|teacher|academic/.test(text)) return 'Education';
  return 'Other';
}

function formatAmount(n) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n).toLocaleString()}`;
  return `$${Math.round(n)}`;
}

async function fecFetch(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    throw Object.assign(new Error(`FEC API error ${res.status}`), { status: res.status, body: text });
  }
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { query, mode } = body;
  const key = process.env.FEC_API_KEY || 'DEMO_KEY';

  try {
    if (mode === 'candidate') {
      // Step 1: Search candidates
      const searchData = await fecFetch(
        `${FEC_BASE}/candidates/search/?q=${encodeURIComponent(query)}&api_key=${key}&per_page=5`
      );
      const results = searchData.results || [];
      if (!results.length) {
        return res.status(200).json({ nodes: [], edges: [], meta: { error: `No results found for '${query}'.` } });
      }

      const candidate = results[0];
      const candidateId = candidate.candidate_id;
      const candidateName = candidate.name;
      const party = candidate.party || 'UNK';

      // Step 2: Get committees
      const comData = await fecFetch(
        `${FEC_BASE}/candidate/${candidateId}/committees/?api_key=${key}&cycle=2024`
      );
      const committees = comData.results || [];
      if (!committees.length) {
        return res.status(200).json({
          nodes: [{ id: candidateId, label: candidateName, type: 'candidate', party, amount: 0 }],
          edges: [],
          meta: { totalRaised: 0, topDonor: 'N/A', topSector: 'N/A' }
        });
      }

      // Prefer primary committee (designation P), fallback to first
      const primaryCom = committees.find(c => c.designation === 'P') || committees[0];
      const committeeId = primaryCom.committee_id;

      // Step 3: Get top contributors — try 2024, fall back to 2022
      let contribData = await fecFetch(
        `${FEC_BASE}/schedules/schedule_a/?committee_id=${committeeId}&api_key=${key}&sort=-contribution_receipt_amount&per_page=25&two_year_transaction_period=2024`
      );
      if (!contribData.results?.length) {
        contribData = await fecFetch(
          `${FEC_BASE}/schedules/schedule_a/?committee_id=${committeeId}&api_key=${key}&sort=-contribution_receipt_amount&per_page=25&two_year_transaction_period=2022`
        );
      }
      if (!contribData.results?.length) {
        contribData = await fecFetch(
          `${FEC_BASE}/schedules/schedule_a/?committee_id=${committeeId}&api_key=${key}&sort=-contribution_receipt_amount&per_page=25`
        );
      }
      const contributions = contribData.results || [];

      // Build nodes
      const candidateNode = {
        id: candidateId,
        label: candidateName,
        type: 'candidate',
        party,
        amount: primaryCom.total_receipts || 0,
        office: candidate.office,
        state: candidate.state
      };

      const donorMap = new Map();
      for (const c of contributions) {
        const donorName = c.contributor_name || 'Unknown';
        const donorId = `donor_${donorName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}`;
        if (!donorMap.has(donorId)) {
          const sector = getSector(c.contributor_occupation, c.contributor_employer);
          donorMap.set(donorId, {
            id: donorId,
            label: donorName,
            type: 'donor',
            sector,
            occupation: c.contributor_occupation || '',
            employer: c.contributor_employer || '',
            amount: 0,
            totalGiven: 0
          });
        }
        donorMap.get(donorId).amount += c.contribution_receipt_amount || 0;
        donorMap.get(donorId).totalGiven += c.contribution_receipt_amount || 0;
      }

      const donorNodes = Array.from(donorMap.values());
      const nodes = [candidateNode, ...donorNodes];

      // Build edges
      const edgeMap = new Map();
      for (const c of contributions) {
        const donorName = c.contributor_name || 'Unknown';
        const donorId = `donor_${donorName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}`;
        const edgeKey = `${donorId}_${candidateId}`;
        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, {
            source: donorId,
            target: candidateId,
            amount: 0,
            date: c.contribution_receipt_date,
            occupation: c.contributor_occupation || '',
            sector: getSector(c.contributor_occupation, c.contributor_employer)
          });
        }
        edgeMap.get(edgeKey).amount += c.contribution_receipt_amount || 0;
      }
      const edges = Array.from(edgeMap.values());

      // Meta
      const totalRaised = primaryCom.total_receipts || 0;
      const sorted = donorNodes.sort((a, b) => b.amount - a.amount);
      const topDonor = sorted[0]?.label || 'N/A';
      const sectorTotals = {};
      for (const d of donorNodes) {
        sectorTotals[d.sector] = (sectorTotals[d.sector] || 0) + d.amount;
      }
      const topSector = Object.entries(sectorTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      return res.status(200).json({
        nodes,
        edges,
        meta: {
          totalRaised,
          totalRaisedFormatted: formatAmount(totalRaised),
          topDonor,
          topSector,
          donorCount: donorNodes.length,
          candidateName,
          party
        }
      });
    } else {
      // Donor mode
      const contribData = await fecFetch(
        `${FEC_BASE}/schedules/schedule_a/?contributor_name=${encodeURIComponent(query)}&api_key=${key}&sort=-contribution_receipt_amount&per_page=50&two_year_transaction_period=2024`
      );
      const contributions = contribData.results || [];
      if (!contributions.length) {
        return res.status(200).json({ nodes: [], edges: [], meta: { error: `No contributions found for '${query}'.` } });
      }

      const firstContrib = contributions[0];
      const donorName = firstContrib.contributor_name || query;
      const donorId = `donor_${donorName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}`;
      const sector = getSector(firstContrib.contributor_occupation, firstContrib.contributor_employer);

      const donorNode = {
        id: donorId,
        label: donorName,
        type: 'donor',
        sector,
        occupation: firstContrib.contributor_occupation || '',
        employer: firstContrib.contributor_employer || '',
        amount: contributions.reduce((s, c) => s + (c.contribution_receipt_amount || 0), 0),
        totalGiven: contributions.reduce((s, c) => s + (c.contribution_receipt_amount || 0), 0)
      };

      // Build recipient committee nodes (deduplicated)
      const recipientMap = new Map();
      for (const c of contributions) {
        const comId = c.committee_id || `com_${(c.committee_name || 'unknown').replace(/\s+/g, '_').toLowerCase()}`;
        const comName = c.committee_name || 'Unknown Committee';
        // Try to guess party from committee name
        let party = 'OTH';
        if (/republican|gop|rnc/i.test(comName)) party = 'REP';
        if (/democrat|dnc|progressive/i.test(comName)) party = 'DEM';

        if (!recipientMap.has(comId)) {
          recipientMap.set(comId, {
            id: comId,
            label: comName,
            type: 'pac',
            party,
            amount: 0
          });
        }
        recipientMap.get(comId).amount += c.contribution_receipt_amount || 0;
      }

      const recipientNodes = Array.from(recipientMap.values());
      const nodes = [donorNode, ...recipientNodes];

      // Build edges
      const edges = [];
      for (const c of contributions) {
        const comId = c.committee_id || `com_${(c.committee_name || 'unknown').replace(/\s+/g, '_').toLowerCase()}`;
        const existing = edges.find(e => e.source === donorId && e.target === comId);
        if (existing) {
          existing.amount += c.contribution_receipt_amount || 0;
        } else {
          edges.push({
            source: donorId,
            target: comId,
            amount: c.contribution_receipt_amount || 0,
            date: c.contribution_receipt_date,
            occupation: c.contributor_occupation || '',
            sector
          });
        }
      }

      const totalGiven = donorNode.totalGiven;
      const sorted = recipientNodes.sort((a, b) => b.amount - a.amount);
      const topRecipient = sorted[0]?.label || 'N/A';

      return res.status(200).json({
        nodes,
        edges,
        meta: {
          totalRaised: totalGiven,
          totalRaisedFormatted: formatAmount(totalGiven),
          topDonor: donorName,
          topRecipient,
          topSector: sector,
          donorCount: recipientNodes.length,
          donorName
        }
      });
    }
  } catch (err) {
    console.error('FEC error:', err);
    const status = err.status || 500;
    if (status === 403 || (err.body && err.body.includes('rate limit'))) {
      return res.status(429).json({ error: 'FEC API rate limit reached. Using DEMO_KEY — limited to 20 requests/hour.' });
    }
    return res.status(500).json({ error: err.message });
  }
}
