export const config = { api: { bodyParser: true } };

const MET_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';

// Map mission keywords to Met Museum search queries that return period art
const QUERY_MAP = [
  { match: /recruit|enlist|member|dockwork/i,  query: 'colonial american patriots gathering' },
  { match: /intel|spy|courier|document|dispatch|secret|orders/i, query: 'colonial correspondence letter american revolution' },
  { match: /sabotage|cannon|powder|intercept|destroy/i, query: 'american revolution battle patriots' },
  { match: /propaganda|pamphlet|print|press|broadside/i, query: 'american revolution declaration colonial printing' },
  { match: /tavern|green dragon|meeting|cellar/i, query: 'colonial tavern american 18th century interior' },
  { match: /boston|harbor|wharf|ship/i, query: 'boston harbor colonial american revolution' },
];

async function metSearch(query) {
  const url = `${MET_BASE}/search?q=${encodeURIComponent(query)}&hasImages=true&isPublicDomain=true`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!resp.ok) return [];
  const data = await resp.json();
  return data.objectIDs || [];
}

async function metObject(id) {
  const resp = await fetch(`${MET_BASE}/objects/${id}`, { signal: AbortSignal.timeout(6000) });
  if (!resp.ok) return null;
  const obj = await resp.json();
  return obj.primaryImage || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { prompt } = body || {};

  if (!prompt) return res.status(200).json({ url: null, fallback: true });

  try {
    // Pick a search query based on prompt content
    const match = QUERY_MAP.find(m => m.match.test(prompt));
    const query = match ? match.query : 'colonial american revolution painting patriots';

    const ids = await metSearch(query);
    if (!ids.length) return res.status(200).json({ url: null, fallback: true });

    // Try a few random picks until we find one with an image
    for (let i = 0; i < 5; i++) {
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
