export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const { drug } = req.query;
  if (!drug || !drug.trim()) {
    return res.status(400).json({ error: 'Missing drug name parameter' });
  }

  const drugName = drug.trim();
  const encoded = encodeURIComponent(`"${drugName}"`);

  // Query FAERS adverse event counts, total report count, and label in parallel
  const faersCountUrl =
    `https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:${encoded}` +
    `&count=patient.reaction.reactionmeddrapt.exact&limit=25`;
  const faersTotalUrl =
    `https://api.fda.gov/drug/event.json?search=patient.drug.medicinalproduct:${encoded}&limit=1`;
  const labelGenericUrl =
    `https://api.fda.gov/drug/label.json?search=openfda.generic_name:${encoded}&limit=1`;

  const [countResult, totalResult, labelResult] = await Promise.allSettled([
    fetch(faersCountUrl).then(r => r.json()),
    fetch(faersTotalUrl).then(r => r.json()),
    fetch(labelGenericUrl).then(r => r.json()),
  ]);

  // ── Parse FAERS reaction counts ────────────────────────────────────────────
  let topReactions = [];
  let totalFaersReports = 0;
  let faersError = null;

  if (countResult.status === 'fulfilled' && countResult.value?.results) {
    topReactions = countResult.value.results.slice(0, 25).map(r => ({
      term: r.term,
      count: r.count,
    }));
  } else if (
    countResult.status === 'fulfilled' &&
    countResult.value?.error?.code === 'NOT_FOUND'
  ) {
    faersError =
      "Drug not found in FDA FAERS database. Try the generic name (e.g., 'ibuprofen' not 'Advil').";
  } else if (countResult.status === 'rejected') {
    faersError = 'Failed to connect to FDA FAERS database.';
  }

  if (totalResult.status === 'fulfilled' && totalResult.value?.meta) {
    totalFaersReports = totalResult.value.meta.results?.total ?? 0;
  }

  // If no data at all, return drug-not-found error
  if (!faersError && topReactions.length === 0 && totalFaersReports === 0) {
    return res.status(200).json({
      error:
        "Drug not found in FDA FAERS database. Try the generic name (e.g., 'ibuprofen' not 'Advil').",
    });
  }

  // ── Parse FDA label ────────────────────────────────────────────────────────
  let officialWarnings = null;
  let labelFound = false;

  function extractLabelText(labelObj) {
    const parts = [];
    for (const field of ['adverse_reactions', 'warnings', 'warnings_and_cautions']) {
      const val = labelObj[field];
      if (!val) continue;
      const arr = Array.isArray(val) ? val : [val];
      parts.push(...arr);
    }
    return parts.length > 0 ? parts.join('\n\n').slice(0, 5000) : null;
  }

  if (labelResult.status === 'fulfilled' && labelResult.value?.results?.length > 0) {
    const text = extractLabelText(labelResult.value.results[0]);
    if (text) { officialWarnings = text; labelFound = true; }
  }

  // Fallback: try brand name search
  if (!labelFound) {
    try {
      const brandUrl =
        `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${encoded}&limit=1`;
      const brandData = await fetch(brandUrl).then(r => r.json());
      if (brandData?.results?.length > 0) {
        const text = extractLabelText(brandData.results[0]);
        if (text) { officialWarnings = text; labelFound = true; }
      }
    } catch (_) { /* proceed without label */ }
  }

  return res.status(200).json({
    drug: drugName.toUpperCase(),
    totalFaersReports,
    topReactions,
    officialWarnings,
    labelFound,
    error: faersError,
  });
}
