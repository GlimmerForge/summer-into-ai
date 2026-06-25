export const config = { api: { bodyParser: true } };

const MET_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';

// Distil Claude's scene_prompt to 3-4 key search terms for the Met API
function promptToQuery(prompt) {
  if (!prompt) return 'american revolution colonial patriots 1775';

  // Mission-type phrases → focused search terms
  if (/recruit|enlist|member|dockwork/i.test(prompt))
    return 'colonial american patriots gathering meeting 1775';
  if (/intel|spy|courier|document|dispatch|secret|orders/i.test(prompt))
    return 'colonial american letter writing correspondence revolution';
  if (/sabotage|cannon|powder|intercept|destroy/i.test(prompt))
    return 'american revolution battle patriots minutemen';
  if (/propaganda|pamphlet|print|press|broadside/i.test(prompt))
    return 'colonial american printing press broadside revolution';
  if (/tavern|green dragon|meeting|cellar/i.test(prompt))
    return 'colonial american tavern interior 18th century';
  if (/boston|harbor|wharf|ship/i.test(prompt))
    return 'boston harbor colonial american ships revolution';

  // Fallback: strip non-ASCII art-speak and use the first meaningful words
  return prompt
    .replace(/oil painting|chiaroscuro|dramatic|candlelight|shadows?|scene/gi, '')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .slice(0, 6)
    .join(' ') || 'american revolution colonial patriots 1775';
}

async function metSearch(query) {
  // Date range anchors results to the Revolutionary War era
  const url = `${MET_BASE}/search?q=${encodeURIComponent(query)}&hasImages=true&isPublicDomain=true&dateBegin=1740&dateEnd=1820`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.objectIDs || [];
}

async function metObject(id) {
  const resp = await fetch(`${MET_BASE}/objects/${id}`, { signal: AbortSignal.timeout(6000) });
  if (!resp.ok) return null;
  const obj = await resp.json();
  // Sanity-check: only return if the object is actually from the right period
  const begin = obj.objectBeginDate || 0;
  const end   = obj.objectEndDate   || 9999;
  if (begin > 1830 || end < 1720) return null;
  return obj.primaryImage || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { prompt } = body || {};

  if (!prompt) return res.status(200).json({ url: null, fallback: true });

  try {
    const query = promptToQuery(prompt);
    const ids = await metSearch(query);

    if (!ids.length) {
      // Broaden to generic revolution search if specific query returns nothing
      const fallbackIds = await metSearch('american revolution colonial patriots');
      if (!fallbackIds.length) return res.status(200).json({ url: null, fallback: true });
      ids.push(...fallbackIds);
    }

    // Try up to 8 random picks — date-validated inside metObject
    for (let i = 0; i < 8; i++) {
      const id = ids[Math.floor(Math.random() * Math.min(50, ids.length))];
      const imageUrl = await metObject(id);
      if (imageUrl) return res.json({ url: imageUrl });
    }

    res.status(200).json({ url: null, fallback: true });
  } catch (err) {
    console.error('scene.js:', err.message);
    res.status(200).json({ url: null, fallback: true });
  }
}
