// SITUATION ROOM — crisis briefing endpoint.
// Live-data fetching adapted from Earth Pulse (week-03-datapunk/demo-04-earth-pulse/api/data.js),
// upgraded with fetch timeouts, NOAA space weather, and a forced tool call that turns
// raw planetary signals into a structured crisis briefing.

import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

const BRIEFING_TOOL = {
  name: 'file_crisis_briefing',
  description: 'File the structured crisis briefing for the incoming Flight Director.',
  input_schema: {
    type: 'object',
    properties: {
      headline: {
        type: 'string',
        description: 'Terse all-caps-style situation headline, under 12 words. Plain text, no markdown.',
      },
      situation: {
        type: 'string',
        description:
          '4-7 sentence situation report in plain prose. NO markdown, no bullet points, no asterisks. Cite the real numbers from the data feed (magnitudes, Kp index, temperatures, wind speeds).',
      },
      threats: {
        type: 'array',
        minItems: 2,
        maxItems: 4,
        items: {
          type: 'object',
          properties: {
            id: { type: 'string', description: 'Short id like T1, T2, T3.' },
            name: { type: 'string', description: 'Short threat name, e.g. SUMATRA AFTERSHOCK CLUSTER. Plain text.' },
            severity: { type: 'integer', minimum: 1, maximum: 10 },
            region: { type: 'string', description: 'Geographic region affected.' },
            lat: { type: 'number', description: 'Approximate latitude of the threat center, -90 to 90.' },
            lon: { type: 'number', description: 'Approximate longitude of the threat center, -180 to 180.' },
          },
          required: ['id', 'name', 'severity', 'region', 'lat', 'lon'],
        },
      },
      recommendation: {
        type: 'string',
        description: '1-2 sentence allocation recommendation from the duty analyst. Plain prose, no markdown.',
      },
    },
    required: ['headline', 'situation', 'threats', 'recommendation'],
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const round = Math.min(3, Math.max(1, parseInt(body.round, 10) || 1));
  const complication = typeof body.complication === 'string' ? body.complication.slice(0, 600) : null;

  try {
    // Fetch all live feeds in parallel; a failed feed degrades gracefully.
    const safe = (fn) => fn().catch((e) => ({ _error: e.message }));
    const [seismic, spaceWeather, atmosphere] = await Promise.all([
      safe(fetchSeismic),
      safe(fetchSpaceWeather),
      safe(fetchAtmosphere),
    ]);

    const dataBlock = buildDataBlock(seismic, spaceWeather, atmosphere);

    const system =
      'You are WATCHFLOOR, the AI duty analyst of a global crisis operations center. You receive a snapshot of REAL live planetary data: USGS seismic feed, NOAA planetary K-index (space weather), and city weather stations. Your job: brief the incoming Flight Director. Anchor everything in the real signals — real quake locations and magnitudes, real Kp values, real temperatures and winds — then escalate PLAUSIBLY into an operational crisis scenario (aftershock risk, infrastructure exposure, satellite/grid vulnerability from geomagnetic activity, heat or wind stress on cities). Fictional escalation is expected, but it must grow out of the actual numbers; never invent earthquakes or storms that contradict the feed. Severity 1-10 must reflect genuine relative danger: a M6.5 quake near population outranks a Kp of 3. If a feed is marked UNAVAILABLE, work with the others. All prose fields must be plain prose with NO markdown formatting of any kind.';

    let userMsg = `ROUND ${round} OF 3 — SHIFT BRIEFING REQUEST\n\nLIVE DATA SNAPSHOT (${new Date().toUTCString()}):\n\n${dataBlock}`;
    if (complication) {
      userMsg += `\n\nCARRY-OVER COMPLICATION FROM PREVIOUS ROUND (this MUST appear as one of the threats or directly shape the situation): ${complication}`;
    }
    if (round === 3) {
      userMsg += '\n\nThis is the FINAL round of the shift. Raise the stakes accordingly.';
    }
    userMsg += '\n\nFile the crisis briefing now using the file_crisis_briefing tool.';

    const msg = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      system,
      tools: [BRIEFING_TOOL],
      tool_choice: { type: 'tool', name: 'file_crisis_briefing' },
      messages: [{ role: 'user', content: userMsg }],
    });

    const toolUse = msg.content.find((b) => b.type === 'tool_use');
    if (!toolUse) throw new Error('No tool output from model');
    const briefing = toolUse.input;

    // Normalize threats defensively.
    briefing.threats = (briefing.threats || []).slice(0, 4).map((t, i) => ({
      id: String(t.id || `T${i + 1}`),
      name: String(t.name || 'UNIDENTIFIED THREAT'),
      severity: Math.min(10, Math.max(1, Math.round(Number(t.severity) || 5))),
      region: String(t.region || 'UNKNOWN'),
      lat: clampNum(t.lat, -90, 90, 0),
      lon: clampNum(t.lon, -180, 180, 0),
    }));

    res.status(200).json({
      briefing,
      data: {
        quakes: seismic?.quakes || [],
        quakeCount: seismic?.count ?? null,
        maxMag: seismic?.maxMag ?? null,
        kp: spaceWeather?.kp ?? null,
        kpTime: spaceWeather?.timeTag ?? null,
        cities: atmosphere?.cities || [],
        feedErrors: {
          seismic: seismic?._error || null,
          spaceWeather: spaceWeather?._error || null,
          atmosphere: atmosphere?._error || null,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('briefing error:', err);
    res.status(500).json({ error: err.message });
  }
}

function clampNum(v, min, max, dflt) {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}

async function fetchJson(url, ms = 20000) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { signal: ctl.signal });
    if (!r.ok) throw new Error(`${new URL(url).host} returned ${r.status}`);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

// Adapted from Earth Pulse fetchSeismic() — widened to the full all_day feed and
// returns the strongest events with coordinates for the war-room map.
async function fetchSeismic() {
  const data = await fetchJson(
    'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson'
  );
  const features = data.features || [];
  const mags = features.map((q) => q.properties.mag).filter((m) => m != null);
  const maxMag = mags.length ? Math.max(...mags) : 0;
  const significant = features.filter((q) => (q.properties.mag ?? 0) >= 4.5);

  const quakes = features
    .map((f) => ({
      lat: f.geometry.coordinates[1],
      lon: f.geometry.coordinates[0],
      mag: Math.round((f.properties.mag ?? 0) * 10) / 10,
      depth: Math.round(f.geometry.coordinates[2] ?? 0),
      place: f.properties.place ?? '',
    }))
    .filter((q) => q.mag > 0)
    .sort((a, b) => b.mag - a.mag);

  return {
    count: features.length,
    maxMag: Math.round(maxMag * 10) / 10,
    significantCount: significant.length,
    top: quakes.slice(0, 8),
    quakes: quakes.slice(0, 60),
  };
}

// New for Situation Room: NOAA planetary K-index (geomagnetic activity, 1-minute cadence).
async function fetchSpaceWeather() {
  const data = await fetchJson(
    'https://services.swpc.noaa.gov/json/planetary_k_index_1m.json'
  );
  if (!Array.isArray(data) || !data.length) throw new Error('empty NOAA feed');
  const last = data[data.length - 1];
  const kp = Number(last.estimated_kp ?? last.kp_index ?? 0);
  const recent = data.slice(-180); // ~3 hours
  const maxRecent = Math.max(...recent.map((d) => Number(d.estimated_kp ?? d.kp_index ?? 0)));
  return {
    kp: Math.round(kp * 100) / 100,
    maxKp3h: Math.round(maxRecent * 100) / 100,
    timeTag: last.time_tag ?? null,
  };
}

// Adapted from Earth Pulse fetchAtmosphere() — same cities, adds wind speed.
async function fetchAtmosphere() {
  const cities = [
    { name: 'New York', lat: 40.71, lon: -74.01 },
    { name: 'London', lat: 51.51, lon: -0.13 },
    { name: 'Tokyo', lat: 35.68, lon: 139.69 },
    { name: 'Sydney', lat: -33.87, lon: 151.21 },
    { name: 'Dubai', lat: 25.2, lon: 55.27 },
  ];
  const results = await Promise.all(
    cities.map(async (city) => {
      try {
        const data = await fetchJson(
          `https://api.open-meteo.com/v1/forecast?latitude=${city.lat}&longitude=${city.lon}&current_weather=true`,
          15000
        );
        return {
          city: city.name,
          lat: city.lat,
          lon: city.lon,
          temp: data.current_weather?.temperature ?? null,
          wind: data.current_weather?.windspeed ?? null,
        };
      } catch {
        return { city: city.name, lat: city.lat, lon: city.lon, temp: null, wind: null };
      }
    })
  );
  return { cities: results };
}

function buildDataBlock(seismic, spaceWeather, atmosphere) {
  const lines = [];

  if (seismic && !seismic._error) {
    lines.push(
      `SEISMIC (USGS, past 24h): ${seismic.count} events detected worldwide, max magnitude M${seismic.maxMag}, ${seismic.significantCount} events at M4.5+.`
    );
    lines.push('Strongest events:');
    for (const q of seismic.top) {
      lines.push(
        `  M${q.mag} — ${q.place || 'unnamed location'} (lat ${q.lat.toFixed(1)}, lon ${q.lon.toFixed(1)}, depth ${q.depth} km)`
      );
    }
  } else {
    lines.push(`SEISMIC: FEED UNAVAILABLE (${seismic?._error || 'unknown error'})`);
  }

  if (spaceWeather && !spaceWeather._error) {
    lines.push(
      `SPACE WEATHER (NOAA SWPC): current estimated planetary Kp index ${spaceWeather.kp} (3-hour peak ${spaceWeather.maxKp3h}) as of ${spaceWeather.timeTag}. Kp 0-3 quiet, 4 unsettled, 5+ geomagnetic storm with satellite/grid risk.`
    );
  } else {
    lines.push(`SPACE WEATHER: FEED UNAVAILABLE (${spaceWeather?._error || 'unknown error'})`);
  }

  if (atmosphere && !atmosphere._error) {
    const ok = atmosphere.cities.filter((c) => c.temp != null);
    if (ok.length) {
      lines.push(
        'ATMOSPHERE (Open-Meteo stations): ' +
          ok.map((c) => `${c.city} ${c.temp}°C wind ${c.wind} km/h`).join('; ') + '.'
      );
    } else {
      lines.push('ATMOSPHERE: all city stations unreachable.');
    }
  } else {
    lines.push(`ATMOSPHERE: FEED UNAVAILABLE (${atmosphere?._error || 'unknown error'})`);
  }

  return lines.join('\n');
}
