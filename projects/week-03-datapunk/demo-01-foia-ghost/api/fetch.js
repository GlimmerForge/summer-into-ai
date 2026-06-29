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

  // ── 2. Parallel fetch: Census + EPA + FEMA ───────────────────────────────
  const fiveYearsAgo = new Date();
  fiveYearsAgo.setFullYear(fiveYearsAgo.getFullYear() - 5);
  const fiveYearsAgoISO = fiveYearsAgo.toISOString().split('T')[0];

  const censusKey = process.env.CENSUS_API_KEY ? `&key=${process.env.CENSUS_API_KEY}` : '';
  const censusUrl =
    `https://api.census.gov/data/2022/acs/acs5?get=B19013_001E,B17001_002E,B17001_001E,` +
    `B28002_013E,B28002_001E,B25035_001E,NAME&for=zip%20code%20tabulation%20area:${zip}${censusKey}`;

  const epaUrl =
    `https://echodata.epa.gov/echo/echo_rest_services.get_facilities?output=JSON` +
    `&p_zip=${zip}&p_act=Y&responseset=100`;

  const femaUrl =
    `https://www.fema.gov/api/open/v2/disasterDeclarationsSummaries?state=${stateAbbr}` +
    `&declarationDate=gt${fiveYearsAgoISO}&$top=50&$orderby=declarationDate%20desc`;

  const [censusResult, epaResult, femaResult] = await Promise.allSettled([
    fetch(censusUrl).then(r => {
      if (!r.ok || !r.headers.get('content-type')?.includes('json')) {
        throw new Error(`Census HTTP ${r.status} — check CENSUS_API_KEY env var`);
      }
      return r.json();
    }),
    fetch(epaUrl, { headers: { 'User-Agent': 'FOIA-Ghost/1.0' } }).then(r => r.json()),
    fetch(femaUrl).then(r => r.json()),
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
        ? Math.round((povCount / povTotal) * 1000) / 10
        : null,
      noInternetRate: (noIntTotal > 0 && noIntCount !== NULL_VAL)
        ? Math.round((noIntCount / noIntTotal) * 1000) / 10
        : null,
      medianYearBuilt: yearBuilt === NULL_VAL ? null : yearBuilt,
      nationalMedianIncome: 72000,
    };
  } catch (e) {
    census = { error: 'No Census data available for this ZIP', medianIncome: null, povertyRate: null, noInternetRate: null, medianYearBuilt: null, nationalMedianIncome: 72000 };
  }

  // ── 4. Parse EPA ──────────────────────────────────────────────────────────
  let epa;
  try {
    if (epaResult.status === 'rejected') throw new Error('fetch failed');
    const raw = epaResult.value;
    const facilities = raw?.Results?.Results ?? [];
    if (!Array.isArray(facilities)) throw new Error('unexpected shape');
    const violations = facilities.filter(
      f => f.CWPSNCFlag === 'Y' || f.CAACurrentHpvFlag === 'Y'
    ).length;
    const topFacilities = facilities.slice(0, 5).map(f => f.FacName ?? 'Unknown').filter(Boolean);
    epa = {
      totalFacilities: facilities.length,
      violations,
      topFacilities,
      error: null,
    };
  } catch (_) {
    epa = { error: 'EPA data unavailable', totalFacilities: 0, violations: 0, topFacilities: [] };
  }

  // ── 5. Parse FEMA ─────────────────────────────────────────────────────────
  let fema;
  try {
    if (femaResult.status === 'rejected') throw new Error('fetch failed');
    const raw = femaResult.value;
    const declarations = raw?.DisasterDeclarationsSummaries ?? [];
    const types = [...new Set(declarations.map(d => d.incidentType).filter(Boolean))];
    const mostRecent = declarations[0]?.declarationDate?.split('T')[0] ?? null;
    fema = {
      disasterCount: declarations.length,
      types,
      mostRecent,
      stateName,
    };
  } catch (_) {
    fema = { error: 'FEMA data unavailable', disasterCount: 0, types: [], mostRecent: null, stateName };
  }

  return res.status(200).json({ zip, city, state: stateAbbr, census, epa, fema });
}
