export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { zip } = req.query;
  if (!zip || !/^\d{5}$/.test(zip)) {
    return res.status(400).json({ error: 'Invalid ZIP code. Must be 5 digits.' });
  }

  // ── 1. Get city/state from zippopotam.us ─────────────────────────────────
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

  // ── 2. Parallel fetch: Census + EPA TRI + Nominatim county ───────────────
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
        throw new Error(`Census HTTP ${r.status} — check CENSUS_API_KEY env var`);
      }
      return r.json();
    }),
    fetch(epaUrl, { headers: { 'User-Agent': 'FOIA-Ghost/1.0' } }).then(r => r.json()),
    fetch(nominatimUrl, { headers: { 'User-Agent': 'FOIA-Ghost/1.0' } }).then(r => r.json()),
  ]);

  // ── 3. Parse Census ───────────────────────────────────────────────────────
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
    };
  } catch (_) {
    census = { error: 'No Census data for this ZIP', medianIncome: null, povertyRate: null, noInternetRate: null, medianYearBuilt: null, nationalMedianIncome: 72000 };
  }

  // ── 4. Parse EPA TRI + fetch carcinogen/PFAS counts per facility ──────────
  let epa;
  try {
    if (epaResult.status === 'rejected') throw new Error('fetch failed');
    const raw = epaResult.value;
    if (!Array.isArray(raw)) throw new Error('unexpected shape');
    const active = raw.filter(f => f.fac_closed_ind !== '1');

    // Get county from TRI data if available (primary county source)
    const triCounty = active[0]?.county_name ?? null; // e.g. "HARRIS"

    // Fetch carcinogen/PFAS chemical info for each active facility (up to 5)
    const chemResults = await Promise.allSettled(
      active.slice(0, 5).map(f =>
        fetch(`https://data.epa.gov/efservice/tri_chem_info/TRI_FACILITY_ID/${f.tri_facility_id}/JSON`, {
          headers: { 'User-Agent': 'FOIA-Ghost/1.0' }
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

  // ── 5. Resolve county for FEMA filter ────────────────────────────────────
  // Priority: TRI county_name → Nominatim → fall back to state-level
  let county = null, countyLevel = false;
  if (epa.triCounty) {
    // TRI returns e.g. "HARRIS" — FEMA expects "Harris (County)"
    county = epa.triCounty.charAt(0) + epa.triCounty.slice(1).toLowerCase();
  } else if (nominatimResult.status === 'fulfilled') {
    const raw = nominatimResult.value?.[0]?.address?.county ?? '';
    county = raw.replace(/\s+(county|parish|borough|municipality)$/i, '').trim() || null;
  }

  // ── 6. Fetch FEMA (county-level if possible, state-level fallback) ────────
  let fema;
  try {
    let femaUrl, femaFilter;
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
    femaUrl = `https://www.fema.gov/api/open/v2/DisasterDeclarationsSummaries?$filter=${femaFilter}&$top=100&$orderby=declarationDate%20desc`;

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
    };
  } catch (_) {
    fema = { error: 'FEMA data unavailable', disasterCount: 0, types: [], mostRecent: null, stateName, county: null, countyLevel: false };
  }

  return res.status(200).json({ zip, city, state: stateAbbr, census, epa, fema });
}
