export const config = { api: { bodyParser: true } };

const FDA_BASE = 'https://api.fda.gov/drug/event.json';
const LABEL_BASE = 'https://api.fda.gov/drug/label.json';

async function fetchWithTimeout(url, timeoutMs = 20000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    return resp;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

async function fetchDrugData(rawName) {
  const name = rawName.trim().toUpperCase();
  const encoded = encodeURIComponent(`"${name}"`);
  const searchParam = `patient.drug.medicinalproduct:${encoded}`;

  const result = {
    name: rawName.trim(),
    totalEvents: 0,
    topReactions: [],
    seriousPercent: 0,
    monthlyTrend: [],
    labelWarning: '',
    error: null,
  };

  // 1. Top 15 adverse reactions
  try {
    const url = `${FDA_BASE}?search=${searchParam}&count=patient.reaction.reactionmeddrapt.exact&limit=15`;
    const resp = await fetchWithTimeout(url);
    if (resp.status === 404) {
      result.error = `No FDA adverse event records found for "${rawName.trim()}"`;
      return result;
    }
    if (resp.status === 429) {
      result.error = 'FDA rate limit reached — try again in a few seconds';
      return result;
    }
    if (!resp.ok) {
      result.error = `FDA API error ${resp.status}`;
      return result;
    }
    const data = await resp.json();
    result.topReactions = (data.results || []).map(r => ({
      term: r.term,
      count: r.count,
    }));
    result.totalEvents = result.topReactions.reduce((s, r) => s + r.count, 0);
  } catch (err) {
    result.error = err.name === 'AbortError' ? 'FDA request timed out' : err.message;
    return result;
  }

  // 2. Seriousness breakdown
  try {
    const url = `${FDA_BASE}?search=${searchParam}&count=serious`;
    const resp = await fetchWithTimeout(url);
    if (resp.ok) {
      const data = await resp.json();
      const counts = {};
      (data.results || []).forEach(r => { counts[r.term] = r.count; });
      const serious = counts['1'] || counts['2'] || 0;
      const notSerious = counts['0'] || 0;
      const total = serious + notSerious;
      result.seriousPercent = total > 0 ? Math.round((serious / total) * 100) : 0;
    }
  } catch (_) { /* non-fatal */ }

  // 3. Monthly trend — last 24 months
  try {
    const url = `${FDA_BASE}?search=${searchParam}&count=receivedate&limit=36`;
    const resp = await fetchWithTimeout(url);
    if (resp.ok) {
      const data = await resp.json();
      const monthly = {};
      (data.results || []).forEach(r => {
        // receivedate is YYYYMMDD — group by YYYY-MM
        const raw = String(r.term);
        if (raw.length >= 6) {
          const ym = `${raw.slice(0, 4)}-${raw.slice(4, 6)}`;
          monthly[ym] = (monthly[ym] || 0) + r.count;
        }
      });

      // Build last 24 months list
      const now = new Date();
      const trend = [];
      for (let i = 23; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        trend.push({ month: ym, count: monthly[ym] || 0 });
      }
      result.monthlyTrend = trend;
    }
  } catch (_) { /* non-fatal */ }

  // 4. Label warning text
  try {
    const labelEncoded = encodeURIComponent(`"${name}"`);
    const url = `${LABEL_BASE}?search=openfda.brand_name:${labelEncoded}&limit=1`;
    const resp = await fetchWithTimeout(url);
    if (resp.ok) {
      const data = await resp.json();
      const first = (data.results || [])[0];
      if (first) {
        const warnings = first.warnings || first.warnings_and_cautions || first.boxed_warning || [];
        const text = Array.isArray(warnings) ? warnings.join(' ') : String(warnings);
        result.labelWarning = text.slice(0, 900);
      }
    }
  } catch (_) { /* non-fatal */ }

  return result;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const drugs = (body.drugs || []).filter(d => d && d.trim());

  if (!drugs.length || drugs.length > 3) {
    return res.status(400).json({ error: 'Provide 1-3 drug names' });
  }

  try {
    const results = await Promise.all(drugs.map(fetchDrugData));
    return res.status(200).json({ drugs: results });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
