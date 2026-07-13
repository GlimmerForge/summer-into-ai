export const config = { api: { bodyParser: true } };

// lat/lon → ZIP (ZCTA) via the Census Bureau geocoder — authoritative coverage
// for every inhabited corner of the US, including small towns. Nominatim fallback.
export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { lat, lng } = body;
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return res.status(400).json({ error: 'lat/lng required' });
  }

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 15000);

  try {
    const r = await fetch(
      `https://geocoding.geo.census.gov/geocoder/geographies/coordinates?x=${lng}&y=${lat}&benchmark=Public_AR_Current&vintage=Current_Current&layers=all&format=json`,
      { signal: controller.signal }
    );
    if (r.ok) {
      const j = await r.json();
      const g = (j.result && j.result.geographies) || {};
      const zctaKey = Object.keys(g).find(k => /zip code tabulation/i.test(k));
      const zip = zctaKey && g[zctaKey][0] && g[zctaKey][0].ZCTA5;
      if (zip) {
        const placesKey = Object.keys(g).find(k => /incorporated places/i.test(k));
        const place = (placesKey && g[placesKey][0] && g[placesKey][0].BASENAME)
          || (g.Counties && g.Counties[0] && g.Counties[0].BASENAME + ' County') || '';
        clearTimeout(t);
        return res.status(200).json({ zip, place });
      }
    }
  } catch (_) { /* fall through */ }

  // Fallback: Nominatim reverse
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1&zoom=14`,
      { signal: controller.signal, headers: { 'User-Agent': 'sworn-testimony-demo/1.0' } }
    );
    clearTimeout(t);
    if (r.ok) {
      const j = await r.json();
      if (j.address && j.address.country_code === 'us') {
        const zip = ((j.address.postcode || '').match(/\d{5}/) || [])[0];
        const place = j.address.city || j.address.town || j.address.village || j.address.county || '';
        if (zip) return res.status(200).json({ zip, place });
      }
    }
  } catch (_) {}

  clearTimeout(t);
  return res.status(200).json({ zip: null });
}
