export const config = { api: { bodyParser: true } };

// Finds a REAL 18th-century print for the lead printed story via the Met Museum
// open-access API (keyless, public domain). The original Broadside designed
// woodcut illustrations but never shipped them — this delivers the idea with
// genuine period plates instead of generated ones. Degrades gracefully to null.
const MET = 'https://collectionapi.metmuseum.org/public/collection/v1';

const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'at', 'in', 'on', 'to', 'and', 'for', 'with', 'his', 'her', 'their', 'from', 'upon', 'near', 'by', 'is', 'are', 'was', 'were', 'be', 'this', 'that', 'its']);

function keywords(headline) {
  return (headline || '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w))
    .slice(0, 3)
    .join(' ');
}

async function fetchJson(url, signal) {
  const r = await fetch(url, { signal });
  if (!r.ok) return null;
  return r.json();
}

async function findPlate(query, signal) {
  const search = await fetchJson(
    `${MET}/search?q=${encodeURIComponent(query)}&hasImages=true&dateBegin=1700&dateEnd=1830`,
    signal
  );
  const ids = (search && search.objectIDs) || [];
  for (const id of ids.slice(0, 8)) {
    const o = await fetchJson(`${MET}/objects/${id}`, signal);
    if (!o || !o.isPublicDomain || !o.primaryImageSmall) continue;
    return {
      image: o.primaryImageSmall,
      title: o.title || 'Period engraving',
      date: o.objectDate || '18th century'
    };
  }
  return null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { headline } = body;
  if (!headline) return res.status(200).json({ image: null });

  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 20000);

  try {
    let plate = await findPlate(keywords(headline), controller.signal);
    if (!plate) plate = await findPlate('american revolution war', controller.signal);
    clearTimeout(t);
    return res.status(200).json(plate || { image: null });
  } catch (_) {
    clearTimeout(t);
    return res.status(200).json({ image: null });
  }
}
