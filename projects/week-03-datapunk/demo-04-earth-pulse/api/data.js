export const config = { api: { bodyParser: false } };

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end();

  try {
    const [seismicData, marketData, atmosData] = await Promise.all([
      fetchSeismic(),
      fetchMarket(),
      fetchAtmosphere(),
    ]);

    res.setHeader('Content-Type', 'application/json');
    res.status(200).json({
      seismic: seismicData,
      market: marketData,
      atmosphere: atmosData,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('data fetch error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function fetchSeismic() {
  const r = await fetch(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/2.5_day.geojson'
  );
  if (!r.ok) throw new Error(`USGS returned ${r.status}`);
  const text = await r.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('USGS non-JSON: ' + text.slice(0, 50)); }

  const features = data.features || [];
  const count = features.length;
  const significant = features.filter(q => q.properties.mag >= 3.0);
  const mags = features.map(q => q.properties.mag).filter(m => m != null);
  const maxMag = mags.length ? Math.max(...mags) : 0;
  const recentSig = significant[0];
  const recentLocation = recentSig
    ? recentSig.properties.place
    : features[0]?.properties.place ?? 'none';

  const quakes = features.map(f => ({
    lat: f.geometry.coordinates[1],
    lon: f.geometry.coordinates[0],
    mag: Math.round((f.properties.mag ?? 0) * 10) / 10,
    depth: Math.round(f.geometry.coordinates[2] ?? 0),
  })).filter(q => q.mag > 0);

  return {
    count,
    maxMag: Math.round(maxMag * 10) / 10,
    significantCount: significant.length,
    recentLocation,
    quakes,
  };
}

async function fetchMarket() {
  const r = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true'
  );
  if (!r.ok) throw new Error(`CoinGecko returned ${r.status}`);
  const data = await r.json();
  return {
    btcPrice: data.bitcoin?.usd ?? null,
    btcChange: data.bitcoin?.usd_24h_change ?? null,
    ethPrice: data.ethereum?.usd ?? null,
    ethChange: data.ethereum?.usd_24h_change ?? null,
  };
}

async function fetchAtmosphere() {
  const cities = [
    { name: 'New York', lat: 40.71, lon: -74.01 },
    { name: 'London', lat: 51.51, lon: -0.13 },
    { name: 'Tokyo', lat: 35.68, lon: 139.69 },
    { name: 'Sydney', lat: -33.87, lon: 151.21 },
    { name: 'Dubai', lat: 25.20, lon: 55.27 },
  ];

  const results = await Promise.all(
    cities.map(async (city) => {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`;
      const r = await fetch(url);
      if (!r.ok) return { city: city.name, temp: null };
      const data = await r.json();
      return { city: city.name, temp: data.current_weather?.temperature ?? null };
    })
  );

  const valid = results.filter(c => c.temp !== null);
  const temps = valid.map(c => c.temp);
  const avg = temps.length ? Math.round(temps.reduce((a, b) => a + b, 0) / temps.length) : null;
  const maxEntry = valid.reduce((a, b) => (b.temp > (a?.temp ?? -Infinity) ? b : a), null);
  const minEntry = valid.reduce((a, b) => (b.temp < (a?.temp ?? Infinity) ? b : a), null);

  return {
    cities: results,
    avgTemp: avg,
    maxTemp: maxEntry?.temp ?? null,
    maxCity: maxEntry?.city ?? null,
    minTemp: minEntry?.temp ?? null,
    minCity: minEntry?.city ?? null,
  };
}
