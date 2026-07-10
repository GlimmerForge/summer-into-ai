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

function getPacSector(name = '') {
  const text = name.toLowerCase();
  if (/bank|investment|capital|securities|hedge|financ|wall st|asset|portfolio|equity/.test(text)) return 'Finance';
  if (/oil|gas|energy|petroleum|coal|mining|power|refin/.test(text)) return 'Energy';
  if (/tech|software|google|apple|microsoft|amazon|meta|facebook|silicon|digital/.test(text)) return 'Tech';
  if (/law|attorney|legal|counsel|bar assoc/.test(text)) return 'Law';
  if (/real estate|property|mortgage|housing|developer|construction/.test(text)) return 'Real Estate';
  if (/health|medical|pharma|hospital|doctor|physician|nurse|biotech/.test(text)) return 'Health';
  if (/education|university|school|teacher|academic/.test(text)) return 'Education';
  return 'Other';
}

function formatAmount(n) {
  if (!n) return '$0';
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n).toLocaleString()}`;
  return `$${Math.round(n)}`;
}

async function fecFetch(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = Object.assign(new Error(`FEC API error ${res.status}`), { status: res.status, body: text });
    throw err;
  }
  return res.json();
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { query, mode } = body;
  const key = process.env.FEC_API_KEY || 'DEMO_KEY';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000);
  const signal = controller.signal;

  try {
    if (mode === 'candidate') {
      // Step 1: Search candidates
      let searchData;
      try {
        searchData = await fecFetch(
          `${FEC_BASE}/candidates/search/?q=${encodeURIComponent(query)}&api_key=${key}&per_page=5`,
          signal
        );
      } catch (err) {
        if (err.status === 422) {
          clearTimeout(timeoutId);
          return res.status(200).json({ nodes: [], edges: [], meta: { error: 'Invalid search. Try a candidate name like "Biden" or "Trump".' } });
        }
        throw err;
      }

      const results = searchData.results || [];
      if (!results.length) {
        clearTimeout(timeoutId);
        return res.status(200).json({ nodes: [], edges: [], meta: { error: `No candidates found for '${query}'. Try 'Biden', 'Trump', 'Harris', 'DeSantis'.` } });
      }

      const candidate = results[0];
      const candidateId = candidate.candidate_id;
      const candidateName = candidate.name;
      const party = candidate.party || 'UNK';

      // Step 2: Get committees
      const comData = await fecFetch(
        `${FEC_BASE}/candidate/${candidateId}/committees/?api_key=${key}&cycle=2024`,
        signal
      );
      const committees = comData.results || [];
      if (!committees.length) {
        clearTimeout(timeoutId);
        return res.status(200).json({
          nodes: [{ id: candidateId, label: candidateName, type: 'candidate', party, amount: 0 }],
          edges: [],
          meta: { totalRaised: 0, totalRaisedFormatted: '$0', topDonor: 'N/A', topSector: 'N/A', donorCount: 0, pacCount: 0, candidateName, party }
        });
      }

      // Prefer primary committee (designation P), fallback to first
      const primaryCom = committees.find(c => c.designation === 'P') || committees[0];
      const committeeId = primaryCom.committee_id;

      // Step 3: Get top contributors — try 2024, fallback 2022, then no filter
      // In parallel, fetch real fundraising totals (committees endpoint returns no total_receipts)
      const totalsPromise = fecFetch(
        `${FEC_BASE}/candidate/${candidateId}/totals/?api_key=${key}&election_full=true&per_page=5`,
        signal
      ).catch(() => null);

      let contribData = await fecFetch(
        `${FEC_BASE}/schedules/schedule_a/?committee_id=${committeeId}&api_key=${key}&sort=-contribution_receipt_amount&per_page=20&two_year_transaction_period=2024`,
        signal
      );
      if (!contribData.results?.length) {
        contribData = await fecFetch(
          `${FEC_BASE}/schedules/schedule_a/?committee_id=${committeeId}&api_key=${key}&sort=-contribution_receipt_amount&per_page=20&two_year_transaction_period=2022`,
          signal
        );
      }
      if (!contribData.results?.length) {
        contribData = await fecFetch(
          `${FEC_BASE}/schedules/schedule_a/?committee_id=${committeeId}&api_key=${key}&sort=-contribution_receipt_amount&per_page=20`,
          signal
        );
      }
      const contributions = contribData.results || [];

      // Resolve real fundraising totals — latest election year first
      const totalsData = await totalsPromise;
      const latestTotals = (totalsData?.results || [])
        .sort((a, b) => (b.candidate_election_year || 0) - (a.candidate_election_year || 0))[0];
      const realTotalRaised = latestTotals?.receipts || primaryCom.total_receipts || 0;

      // Build candidate node
      const candidateNode = {
        id: candidateId,
        label: candidateName,
        type: 'candidate',
        party,
        amount: realTotalRaised,
        office: candidate.office,
        state: candidate.state
      };

      // Step 4: Categorize contributions — PAC (contributor_id starts with 'C') vs individual
      const donorMap = new Map();    // individual donors
      const pacMap = new Map();      // PAC/committee donors
      const edgeMap = new Map();

      for (const c of contributions) {
        const donorName = c.contributor_name || 'Unknown';
        const isPac = typeof c.contributor_id === 'string' && c.contributor_id.startsWith('C');
        const amount = c.contribution_receipt_amount || 0;

        if (isPac) {
          const pacId = `pac_${c.contributor_id}`;
          const sector = getPacSector(donorName);
          if (!pacMap.has(pacId)) {
            pacMap.set(pacId, {
              id: pacId,
              label: donorName,
              type: 'pac',
              amount: 0,
              sector,
              committeeId: c.contributor_id
            });
          }
          pacMap.get(pacId).amount += amount;

          const edgeKey = `${pacId}|${candidateId}`;
          if (!edgeMap.has(edgeKey)) {
            edgeMap.set(edgeKey, { source: pacId, target: candidateId, amount: 0, sector, depth: 1 });
          }
          edgeMap.get(edgeKey).amount += amount;
        } else {
          const zip = (c.contributor_zip || '').substring(0, 5);
          const donorId = `donor_${donorName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}_${zip || 'x'}`;
          const sector = getSector(c.contributor_occupation, c.contributor_employer);
          if (!donorMap.has(donorId)) {
            donorMap.set(donorId, {
              id: donorId,
              label: donorName,
              type: 'donor',
              sector,
              occupation: c.contributor_occupation || '',
              employer: c.contributor_employer || '',
              amount: 0
            });
          }
          donorMap.get(donorId).amount += amount;

          const edgeKey = `${donorId}|${candidateId}`;
          if (!edgeMap.has(edgeKey)) {
            edgeMap.set(edgeKey, { source: donorId, target: candidateId, amount: 0, sector, depth: 1 });
          }
          edgeMap.get(edgeKey).amount += amount;
        }
      }

      // Step 5: PAC traversal — fetch top 3 PAC donors' own contributors (keep calls low for DEMO_KEY)
      const sortedPacs = [...pacMap.values()].sort((a, b) => b.amount - a.amount).slice(0, 3);
      const pacDonorMap = new Map();

      for (const pac of sortedPacs) {
        try {
          let pd;
          try {
            pd = await fecFetch(
              `${FEC_BASE}/schedules/schedule_a/?committee_id=${pac.committeeId}&api_key=${key}&sort=-contribution_receipt_amount&per_page=10`,
              signal
            );
          } catch {
            pd = { results: [] };
          }

          for (const c of pd.results || []) {
            const pdName = c.contributor_name || 'Unknown';
            const pdId = `pac_donor_${pac.id}_${pdName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}`;
            const sector = getSector(c.contributor_occupation, c.contributor_employer);
            const amount = c.contribution_receipt_amount || 0;

            if (!pacDonorMap.has(pdId)) {
              pacDonorMap.set(pdId, {
                id: pdId,
                label: pdName,
                type: 'pac_donor',
                sector,
                occupation: c.contributor_occupation || '',
                employer: c.contributor_employer || '',
                amount: 0,
                pacId: pac.id
              });
            }
            pacDonorMap.get(pdId).amount += amount;

            const edgeKey = `${pdId}|${pac.id}`;
            if (!edgeMap.has(edgeKey)) {
              edgeMap.set(edgeKey, { source: pdId, target: pac.id, amount: 0, sector, depth: 2 });
            }
            edgeMap.get(edgeKey).amount += amount;
          }
        } catch (pacErr) {
          // Non-fatal: skip this PAC's traversal
          console.warn(`PAC traversal failed for ${pac.id}: ${pacErr.message}`);
        }
      }

      // Compile everything
      const allNodes = [
        candidateNode,
        ...donorMap.values(),
        ...pacMap.values(),
        ...pacDonorMap.values()
      ];
      const allEdges = [...edgeMap.values()];

      // Meta stats
      const totalRaised = realTotalRaised;
      const allContributors = [...donorMap.values(), ...pacMap.values()];
      const topDonorNode = allContributors.sort((a, b) => b.amount - a.amount)[0];
      const topDonor = topDonorNode?.label || 'N/A';

      const sectorTotals = {};
      for (const n of [...donorMap.values(), ...pacMap.values(), ...pacDonorMap.values()]) {
        sectorTotals[n.sector] = (sectorTotals[n.sector] || 0) + n.amount;
      }
      const topSector = Object.entries(sectorTotals).sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

      clearTimeout(timeoutId);
      return res.status(200).json({
        nodes: allNodes,
        edges: allEdges,
        meta: {
          totalRaised,
          totalRaisedFormatted: formatAmount(totalRaised),
          topDonor,
          topSector,
          donorCount: donorMap.size + pacMap.size,
          pacCount: pacMap.size,
          candidateName,
          party
        }
      });

    } else {
      // Donor mode — search by contributor name
      const contribData = await fecFetch(
        `${FEC_BASE}/schedules/schedule_a/?contributor_name=${encodeURIComponent(query)}&api_key=${key}&sort=-contribution_receipt_amount&per_page=50&two_year_transaction_period=2024`,
        signal
      );
      const contributions = contribData.results || [];
      if (!contributions.length) {
        clearTimeout(timeoutId);
        return res.status(200).json({ nodes: [], edges: [], meta: { error: `No contributions found for '${query}'.` } });
      }

      const firstC = contributions[0];
      const donorName = firstC.contributor_name || query;
      const donorId = `donor_${donorName.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_]/g, '').toLowerCase()}`;
      const sector = getSector(firstC.contributor_occupation, firstC.contributor_employer);

      const donorNode = {
        id: donorId,
        label: donorName,
        type: 'donor',
        sector,
        occupation: firstC.contributor_occupation || '',
        employer: firstC.contributor_employer || '',
        amount: contributions.reduce((s, c) => s + (c.contribution_receipt_amount || 0), 0)
      };

      const recipientMap = new Map();
      for (const c of contributions) {
        const comId = c.committee_id || `com_${(c.committee_name || 'unknown').replace(/\s+/g, '_').toLowerCase()}`;
        const comName = c.committee_name || 'Unknown Committee';
        let party = 'OTH';
        if (/republican|gop|rnc/i.test(comName)) party = 'REP';
        if (/democrat|dnc|progressive/i.test(comName)) party = 'DEM';

        if (!recipientMap.has(comId)) {
          recipientMap.set(comId, { id: comId, label: comName, type: 'pac', party, amount: 0, sector: getPacSector(comName) });
        }
        recipientMap.get(comId).amount += c.contribution_receipt_amount || 0;
      }

      const recipientNodes = [...recipientMap.values()];
      const nodes = [donorNode, ...recipientNodes];

      const edgeMap = new Map();
      for (const c of contributions) {
        const comId = c.committee_id || `com_${(c.committee_name || 'unknown').replace(/\s+/g, '_').toLowerCase()}`;
        const edgeKey = `${donorId}|${comId}`;
        if (!edgeMap.has(edgeKey)) {
          edgeMap.set(edgeKey, { source: donorId, target: comId, amount: 0, sector, depth: 1 });
        }
        edgeMap.get(edgeKey).amount += c.contribution_receipt_amount || 0;
      }

      const totalGiven = donorNode.amount;
      const topRecipient = recipientNodes.sort((a, b) => b.amount - a.amount)[0]?.label || 'N/A';

      clearTimeout(timeoutId);
      return res.status(200).json({
        nodes,
        edges: [...edgeMap.values()],
        meta: {
          totalRaised: totalGiven,
          totalRaisedFormatted: formatAmount(totalGiven),
          topDonor: donorName,
          topRecipient,
          topSector: sector,
          donorCount: recipientNodes.length,
          pacCount: recipientNodes.filter(n => n.type === 'pac').length,
          candidateName: donorName,
          party: 'N/A'
        }
      });
    }
  } catch (err) {
    clearTimeout(timeoutId);
    console.error('FEC error:', err);
    if (err.name === 'AbortError') {
      return res.status(504).json({ error: 'FEC API timed out. Try again in a moment.' });
    }
    const status = err.status || 500;
    if (status === 422) {
      return res.status(500).json({ error: 'Invalid search parameters. Try a different name.' });
    }
    if (status === 429 || (err.body && err.body.includes('rate limit'))) {
      return res.status(429).json({ error: 'FEC API rate limit reached (DEMO_KEY: ~20 req/hour). Set FEC_API_KEY env var with a free key from api.data.gov/signup — that raises the limit to 1,000/hour.' });
    }
    return res.status(500).json({ error: err.message });
  }
}
