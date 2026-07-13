// Full Disclosure — gather endpoint
// Built on FOUR Week 4 demos. Each dataset fetcher below is adapted directly from
// a sibling demo's api/ folder — that reuse IS this week's theme ("Built on Yesterday"):
//   FEC  → demo-01-money-trail/api/fec.js        (schedule_a queries, amount formatting)
//   CFPB → demo-07-class-action/api/discover.js  (_suggest_company fuzzy resolution, has_narrative)
//   EPA  → demo-05-sworn-testimony/api/dossier.js (TRI facility + tri_chem_info carcinogen counts)
//   FDA  → demo-03-side-effect-storm/api/drug.js  (FAERS reaction counts, seriousness breakdown)
//
// POST { company, dataset? } — dataset is one of 'fec'|'cfpb'|'epa'|'fda'.
// If omitted, all four are fetched in parallel. Every dataset degrades gracefully:
// a failure returns { available:false, error } instead of failing the investigation.

export const config = { api: { bodyParser: true } };

const TIMEOUT_MS = 20000;

async function fetchJson(url, headers = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json', ...headers }, signal: controller.signal });
    if (!r.ok) {
      const err = new Error(`HTTP ${r.status}`);
      err.status = r.status;
      throw err;
    }
    return await r.json();
  } finally {
    clearTimeout(timer);
  }
}

// ── FEC political money (adapted from demo-01-money-trail/api/fec.js) ────────
async function fetchFec(company) {
  const key = process.env.FEC_API_KEY || 'DEMO_KEY';
  const url =
    `https://api.open.fec.gov/v1/schedules/schedule_a/?contributor_employer=${encodeURIComponent(company)}` +
    `&api_key=${key}&sort=-contribution_receipt_amount&per_page=40&two_year_transaction_period=2024`;

  try {
    const data = await fetchJson(url);
    const results = data.results || [];
    if (!results.length) {
      return { available: true, empty: true, note: `No 2023-24 FEC contributions found with employer matching "${company}".` };
    }

    let totalAmount = 0;
    const recipientMap = new Map();
    const donorMap = new Map();

    for (const c of results) {
      const amount = c.contribution_receipt_amount || 0;
      totalAmount += amount;

      const comName = c.committee?.name || c.committee_name || 'Unknown Committee';
      recipientMap.set(comName, (recipientMap.get(comName) || 0) + amount);

      const donorName = c.contributor_name || 'Unknown';
      const dKey = donorName.toUpperCase();
      if (!donorMap.has(dKey)) {
        donorMap.set(dKey, { name: donorName, occupation: c.contributor_occupation || '', amount: 0 });
      }
      donorMap.get(dKey).amount += amount;
    }

    const topRecipients = [...recipientMap.entries()]
      .map(([name, amount]) => ({ name, amount: Math.round(amount) }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);

    const topDonors = [...donorMap.values()]
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6)
      .map(d => ({ ...d, amount: Math.round(d.amount) }));

    return {
      available: true,
      cycle: '2023-2024',
      sampleSize: results.length,
      totalAmount: Math.round(totalAmount),
      topRecipients,
      topDonors,
      note: `Top ${results.length} itemized contributions by amount where the donor listed "${company}" as employer.`
    };
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'FEC API timed out'
      : e.status === 429 ? 'FEC rate limit reached (set FEC_API_KEY for 1,000 req/hr)'
      : `FEC API error: ${e.message}`;
    return { available: false, error: msg };
  }
}

// ── CFPB consumer complaints (adapted from demo-07-class-action/api/discover.js) ──
async function fetchCfpb(company) {
  const API = 'https://www.consumerfinance.gov/data-research/consumer-complaints/search/api/v1/';
  try {
    // Fuzzy-resolve to the CFPB's canonical company name first (demo-07's trick)
    let canonical = null;
    try {
      const suggestions = await fetchJson(`${API}_suggest_company/?text=${encodeURIComponent(company)}`);
      if (Array.isArray(suggestions) && suggestions.length > 0) canonical = suggestions[0];
    } catch (_) { /* fall through to loose search */ }

    let data = null;
    let totalOnFile = 0;

    if (canonical) {
      const [narrJson, totalJson] = await Promise.all([
        fetchJson(`${API}?company=${encodeURIComponent(canonical)}&sort=created_date_desc&size=100&has_narrative=true`).catch(() => null),
        fetchJson(`${API}?company=${encodeURIComponent(canonical)}&size=1`).catch(() => null)
      ]);
      if (narrJson?.hits?.hits?.length > 0) data = narrJson;
      totalOnFile = totalJson?.hits?.total?.value || narrJson?.hits?.total?.value || 0;
    }

    if (!data) {
      const json = await fetchJson(`${API}?search_term=${encodeURIComponent(company)}&sort=created_date_desc&size=100&has_narrative=true`).catch(() => null);
      if (json?.hits?.hits?.length > 0) {
        data = json;
        totalOnFile = totalOnFile || json.hits.total.value || 0;
      }
    }

    if (!data) {
      return { available: true, empty: true, note: `No consumer complaints found in the CFPB database for "${company}".` };
    }

    const hits = data.hits.hits || [];
    const breakdown = {};
    for (const h of hits) {
      const issue = h._source.issue || 'Other';
      breakdown[issue] = (breakdown[issue] || 0) + 1;
    }
    const topIssues = Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([issue, count]) => ({ issue, count }));

    const narratives = hits
      .filter(h => (h._source.complaint_what_happened || '').length > 120)
      .slice(0, 3)
      .map(h => ({
        issue: h._source.issue || 'Other',
        product: h._source.product || '',
        state: h._source.state || '',
        date: (h._source.date_received || '').slice(0, 10),
        excerpt: h._source.complaint_what_happened.slice(0, 320).replace(/\s+/g, ' ').trim()
      }));

    return {
      available: true,
      canonicalName: canonical || hits[0]?._source?.company || company,
      totalComplaints: totalOnFile,
      recentSample: hits.length,
      topIssues,
      narratives,
      note: 'Issue breakdown from the 100 most recent complaints with consumer narratives.'
    };
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'CFPB API timed out' : `CFPB API error: ${e.message}`;
    return { available: false, error: msg };
  }
}

// ── EPA Toxic Release Inventory (adapted from demo-05-sworn-testimony/api/dossier.js) ──
async function fetchEpa(company) {
  const name = company.toUpperCase();
  const url = `https://data.epa.gov/efservice/tri_facility/facility_name/CONTAINING/${encodeURIComponent(name)}/rows/0:25/JSON`;
  try {
    const raw = await fetchJson(url, { 'User-Agent': 'Full-Disclosure/1.0' });
    if (!Array.isArray(raw) || raw.length === 0) {
      return { available: true, empty: true, note: `No EPA Toxic Release Inventory facilities found matching "${company}".` };
    }

    const active = raw.filter(f => f.fac_closed_ind !== '1');
    const states = [...new Set(raw.map(f => f.state_abbr).filter(Boolean))].sort();
    const topFacilities = raw.slice(0, 5).map(f => ({
      name: f.facility_name,
      city: f.city_name || '',
      state: f.state_abbr || ''
    }));

    // Carcinogen/PFAS chemical counts for the first 3 facilities (demo-05's tri_chem_info trick)
    let totalChemicals = 0, carcinogenCount = 0, pfasCount = 0, chemFacilities = 0;
    const chemResults = await Promise.allSettled(
      raw.slice(0, 3).map(f =>
        fetchJson(`https://data.epa.gov/efservice/tri_chem_info/TRI_FACILITY_ID/${encodeURIComponent(f.tri_facility_id)}/JSON`,
          { 'User-Agent': 'Full-Disclosure/1.0' })
      )
    );
    for (const cr of chemResults) {
      if (cr.status === 'fulfilled' && Array.isArray(cr.value)) {
        chemFacilities++;
        totalChemicals += cr.value.length;
        carcinogenCount += cr.value.filter(c => c.carc_ind === 'YES').length;
        pfasCount += cr.value.filter(c => c.pfas_ind === 'YES').length;
      }
    }

    return {
      available: true,
      facilityCount: raw.length,
      facilityCountCapped: raw.length >= 25,
      activeFacilities: active.length,
      states,
      topFacilities,
      chemFacilitiesSampled: chemFacilities,
      totalChemicals,
      carcinogenCount,
      pfasCount,
      note: `TRI facilities whose registered name contains "${company}"${raw.length >= 25 ? ' (first 25 shown — more may exist)' : ''}. Chemical counts sampled from ${chemFacilities} facilities.`
    };
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'EPA API timed out' : `EPA API error: ${e.message}`;
    return { available: false, error: msg };
  }
}

// ── FDA adverse events (adapted from demo-03-side-effect-storm/api/drug.js) ──
async function fetchFda(company) {
  const encoded = encodeURIComponent(`"${company.toUpperCase()}"`);
  const searchParam = `patient.drug.openfda.manufacturer_name:${encoded}`;
  try {
    let data;
    try {
      data = await fetchJson(`https://api.fda.gov/drug/event.json?search=${searchParam}&count=patient.reaction.reactionmeddrapt.exact&limit=10`);
    } catch (e) {
      if (e.status === 404) {
        return { available: true, empty: true, note: `No FDA adverse event reports name "${company}" as a drug manufacturer — no FDA exposure (expected for non-pharma companies).` };
      }
      throw e;
    }

    const topReactions = (data.results || []).map(r => ({ term: r.term, count: r.count }));
    if (!topReactions.length) {
      return { available: true, empty: true, note: `No FDA adverse event reports for manufacturer "${company}".` };
    }
    const reportedReactionCount = topReactions.reduce((s, r) => s + r.count, 0);

    // Seriousness breakdown (demo-03's second pass) — non-fatal if it fails
    let seriousPercent = null;
    try {
      const sData = await fetchJson(`https://api.fda.gov/drug/event.json?search=${searchParam}&count=serious`);
      const counts = {};
      (sData.results || []).forEach(r => { counts[r.term] = r.count; });
      const serious = counts['1'] || 0;
      const notSerious = counts['2'] || 0;
      const total = serious + notSerious;
      if (total > 0) seriousPercent = Math.round((serious / total) * 100);
    } catch (_) { /* non-fatal */ }

    return {
      available: true,
      topReactions,
      reportedReactionCount,
      seriousPercent,
      note: `Top 10 reported adverse reactions across FAERS reports naming "${company}" as manufacturer.`
    };
  } catch (e) {
    const msg = e.name === 'AbortError' ? 'FDA API timed out'
      : e.status === 429 ? 'FDA rate limit reached — try again shortly'
      : `FDA API error: ${e.message}`;
    return { available: false, error: msg };
  }
}

// ── Handler ──────────────────────────────────────────────────────────────────
const FETCHERS = { fec: fetchFec, cfpb: fetchCfpb, epa: fetchEpa, fda: fetchFda };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const company = String(body?.company ?? '').trim();
  const dataset = body?.dataset;

  if (!company || company.length < 2) {
    return res.status(400).json({ error: 'Company name required (e.g. "Wells Fargo", "Pfizer", "Exxon").' });
  }

  try {
    if (dataset && FETCHERS[dataset]) {
      const result = await FETCHERS[dataset](company);
      return res.status(200).json({ company, dataset, result });
    }

    // All four federal datasets in parallel
    const [fec, cfpb, epa, fda] = await Promise.all([
      fetchFec(company), fetchCfpb(company), fetchEpa(company), fetchFda(company)
    ]);
    return res.status(200).json({ company, fec, cfpb, epa, fda, fetchedAt: new Date().toISOString() });
  } catch (err) {
    return res.status(500).json({ error: err?.message ?? 'Unknown error' });
  }
}
