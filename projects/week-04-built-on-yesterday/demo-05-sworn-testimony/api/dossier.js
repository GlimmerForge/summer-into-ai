// Sworn Testimony — dossier endpoint
// Built on FOIA Ghost (Week 3): the data-fetching pipeline below is reused from
// projects/week-03-datapunk/demo-01-foia-ghost/api/fetch.js (Census + EPA TRI + FEMA).
// This endpoint fetches the same real federal data, then has Claude synthesize a
// terse classified case-file summary. The raw data is returned so the Verifier
// endpoint can audit the witness's answers against it.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

// ── Data fetching (reused from FOIA Ghost, Week 3) ──────────────────────────
async function fetchZipData(zip) {
  // 1. City/state from zippopotam.us
  let city = 'Unknown', stateAbbr = 'XX', stateName = 'Unknown';
  try {
    const geoResp = await fetch(`https://api.zippopotam.us/us/${zip}`);
    if (geoResp.ok) {
      const geoData = await geoResp.json();
      city = geoData.places?.[0]?.['place name'] ?? 'Unknown';
      stateAbbr = geoData.places?.[0]?.['state abbreviation'] ?? 'XX';
      stateName = geoData.places?.[0]?.['state'] ?? 'Unknown';
    }
  } catch (_) { /* fall through with defaults */ }

  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const fiveYearsAgoISO = fiveYearsAgo.toISOString().split('T')[0];

  const censusKey = process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : '';
  const censusUrl =
    `https://api.census.gov/data/2022/acs/acs5?get=B19013_001E,B17001_002E,B17001_001E,` +
    `B28002_013E,B28002_001E,B25035_001E,NAME&for=zip%20code%20tabulation%20area:${zip}${censusKey}`;

  const epaUrl = `https://data.epa.gov/efservice/tri_facility/ZIP_CODE/${zip}/JSON`;
  const nominatimUrl = `https://nominatim.openstreetmap.org/search?postalcode=${zip}&country=US&format=json&addressdetails=1&limit=1`;

  const [censusResult, epaResult, nominatimResult] = await Promise.allSettled([
    fetch(censusUrl).then(r => {
      if (!r.ok || !r.headers.get('content-type')?.includes('json')) {
        throw new Error(`Census HTTP ${r.status}`);
      }
      return r.json();
    }),
    fetch(epaUrl, { headers: { 'User-Agent': 'Sworn-Testimony/1.0' } }).then(r => r.json()),
    fetch(nominatimUrl, { headers: { 'User-Agent': 'Sworn-Testimony/1.0' } }).then(r => r.json()),
  ]);

  // 3. Parse Census
  let census;
  try {
    if (censusResult.status === 'rejected') throw new Error('fetch failed');
    const raw = censusResult.value;
    if (!Array.isArray(raw) || raw.length < 2) throw new Error('no data');
    const headers = raw[0];
    const row = raw[1];
    const get = (field) => {
      const idx = headers.indexOf(field);
      return idx === -1 ? null : Number(row[idx]);
    };
    const income = get('B19013_001E');
    const povCount = get('B17001_002E');
    const povTotal = get('B17001_001E');
    const noIntCount = get('B28002_013E');
    const noIntTotal = get('B28002_001E');
    const yearBuilt = get('B25035_001E');
    const NULL_VAL = -666666666;
    census = {
      medianIncome: income === NULL_VAL ? null : income,
      povertyRate: (povTotal > 0 && povCount !== NULL_VAL)
        ? Math.round((povCount / povTotal) * 1000) / 10 : null,
      noInternetRate: (noIntTotal > 0 && noIntCount !== NULL_VAL)
        ? Math.round((noIntCount / noIntTotal) * 1000) / 10 : null,
      medianYearBuilt: yearBuilt === NULL_VAL ? null : yearBuilt,
      nationalMedianIncome: 72000,
      error: null,
    };
  } catch (_) {
    census = { error: 'No Census data for this ZIP', medianIncome: null, povertyRate: null, noInternetRate: null, medianYearBuilt: null, nationalMedianIncome: 72000 };
  }

  // 4. Parse EPA TRI + carcinogen/PFAS counts per facility
  let epa;
  try {
    if (epaResult.status === 'rejected') throw new Error('fetch failed');
    const raw = epaResult.value;
    if (!Array.isArray(raw)) throw new Error('unexpected shape');
    const active = raw.filter(f => f.fac_closed_ind !== '1');
    const triCounty = active[0]?.county_name ?? null;

    const chemResults = await Promise.allSettled(
      active.slice(0, 5).map(f =>
        fetch(`https://data.epa.gov/efservice/tri_chem_info/TRI_FACILITY_ID/${f.tri_facility_id}/JSON`, {
          headers: { 'User-Agent': 'Sworn-Testimony/1.0' }
        }).then(r => r.json())
      )
    );

    let carcinogenCount = 0, pfasCount = 0, totalChemicals = 0;
    for (const cr of chemResults) {
      if (cr.status === 'fulfilled' && Array.isArray(cr.value)) {
        totalChemicals += cr.value.length;
        carcinogenCount += cr.value.filter(c => c.carc_ind === 'YES').length;
        pfasCount += cr.value.filter(c => c.pfas_ind === 'YES').length;
      }
    }

    epa = {
      totalFacilities: active.length,
      topFacilities: active.slice(0, 5).map(f => f.facility_name).filter(Boolean),
      totalChemicals,
      carcinogenCount,
      pfasCount,
      triCounty,
      error: null,
    };
  } catch (_) {
    epa = { error: 'EPA data unavailable', totalFacilities: 0, topFacilities: [], totalChemicals: 0, carcinogenCount: 0, pfasCount: 0, triCounty: null };
  }

  // 5. Resolve county for FEMA filter
  let county = null, countyLevel = false;
  if (epa.triCounty) {
    county = epa.triCounty.charAt(0) + epa.triCounty.slice(1).toLowerCase();
  } else if (nominatimResult.status === 'fulfilled') {
    const raw = nominatimResult.value?.[0]?.address?.county ?? '';
    county = raw.replace(/\s+(county|parish|borough|municipality)$/i, '').trim() || null;
  }

  // 6. FEMA disaster declarations (county-level if possible)
  let fema;
  try {
    let femaFilter;
    if (county) {
      const femaCounty = `${county} (County)`;
      femaFilter = encodeURIComponent(
        `state eq '${stateAbbr}' and designatedArea eq '${femaCounty}' and declarationDate gt '${fiveYearsAgoISO}T00:00:00.000z'`
      );
      countyLevel = true;
    } else {
      femaFilter = encodeURIComponent(
        `state eq '${stateAbbr}' and declarationDate gt '${fiveYearsAgoISO}T00:00:00.000z'`
      );
    }
    const femaUrl = `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=${femaFilter}&$top=100&$orderby=declarationDate%20desc`;

    const femaResp = await fetch(femaUrl);
    const raw = await femaResp.json();
    const declarations = raw?.DisasterDeclarationsSummaries ?? [];
    const types = [...new Set(declarations.map(d => d.incidentType).filter(Boolean))];
    fema = {
      disasterCount: declarations.length,
      types,
      mostRecent: declarations[0]?.declarationDate?.split('T')[0] ?? null,
      stateName,
      county: countyLevel ? county : null,
      countyLevel,
      error: null,
    };
  } catch (_) {
    fema = { error: 'FEMA data unavailable', disasterCount: 0, types: [], mostRecent: null, stateName, county: null, countyLevel: false };
  }

  return { zip, city, state: stateAbbr, stateName, census, epa, fema };
}

// ── Case-file synthesis ──────────────────────────────────────────────────────
const SYNTH_SYSTEM = `You are the CUSTODIAN OF RECORDS for a federal records tribunal. You are given raw government data (Census, EPA Toxic Release Inventory, FEMA disaster declarations) for one American ZIP code. Write a terse, official CASE FILE SUMMARY of roughly 150 to 220 words that a court clerk would read aloud before a witness is examined.

Use exactly these four section headers on their own lines:
SUBJECT
ECONOMIC RECORD
ENVIRONMENTAL RECORD
DISASTER RECORD

Under each header write one to three plain sentences citing the specific figures in the data. If a data source errored or is empty, state that the record is silent on the matter. Do not editorialize beyond what the data supports. Do not invent any figure.

FORMATTING RULES: Plain prose only. NO markdown of any kind: no #, no **, no *, no tables, no bullet lists, no dashes as list markers.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const zip = String(body?.zip ?? '').trim();
  if (!/^\d{5}$/.test(zip)) {
    return res.status(400).json({ error: 'Invalid ZIP code. Must be 5 digits.' });
  }

  try {
    const rawData = await fetchZipData(zip);

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: SYNTH_SYSTEM,
      messages: [{
        role: 'user',
        content: `Raw federal data record for ZIP ${zip}:\n\n${JSON.stringify(rawData, null, 2)}`,
      }],
    });

    const caseFile = response.content
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('')
      .trim();

    return res.status(200).json({ rawData, caseFile });
  } catch (err) {
    return res.status(500).json({ error: err?.message ?? 'Unknown error' });
  }
}
