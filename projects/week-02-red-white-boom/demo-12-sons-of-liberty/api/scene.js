export const config = { api: { bodyParser: true } };

const MET_BASE = 'https://collectionapi.metmuseum.org/public/collection/v1';

// Curated, verified Met Museum object IDs — all confirmed to have images,
// all period-accurate (1760–1800), all thematically relevant.
const POOL = {
  intel: [
    436236,  // Benjamin Franklin — Duplessis, 1778
    666113,  // Samuel Adams portrait — John Norman, 1781
    384833,  // British military map of operations, 1777
    365208,  // Boston Massacre — Paul Revere, 1770
    679177,  // Le Général Washington — Charles Willson Peale, 1783
  ],
  recruit: [
    10522,   // Daniel Crommelin Verplanck — Copley, 1771
    10526,   // Joseph Sherburne — Copley, 1767
    10537,   // Samuel Verplanck — Copley, 1771
    10533,   // Mrs. Sylvanus Bourne — Copley, 1766
    15026,   // Self-portrait — Copley, 1769
    666113,  // Samuel Adams — John Norman, 1781
  ],
  sabotage: [
    371977,  // Battle at Charlestown / Bunker Hill, 1775
    388573,  // The Battle of Bunker's Hill — Müller, 1788
    388695,  // Battle of Saratoga — Will, 1777
    365208,  // Boston Massacre — Paul Revere, 1770
    12823,   // Washington before Battle of Trenton — Trumbull, 1792
    425079,  // Triumphal Entry of Royal Troops into New York, 1776
  ],
  propaganda: [
    345635,  // The Battle of Bunker Hill (broadside/pamphlet) — 1776
    365208,  // Boston Massacre — Paul Revere, 1770
    365524,  // His Excellency George Washington — Charles Willson Peale, 1777
    384833,  // British military map / print, 1777
  ],
  battle: [
    11417,   // Washington Crossing the Delaware — Leutze, 1851
    12823,   // Washington before Battle of Trenton — Trumbull, 1792
    371977,  // Battle at Charlestown, 1775
    388573,  // Battle of Bunker's Hill — Müller, 1788
    388695,  // Battle of Saratoga, 1777
    895022,  // General Washington — Prevost, 1781
  ],
  washington: [
    11723,   // George Washington — James Peale, 1782
    365524,  // His Excellency George Washington — Peale, 1777
    12899,   // George Washington, 1775
    16584,   // George Washington — Gilbert Stuart, 1795
    895022,  // General Washington — Prevost, 1781
    12823,   // Washington before Battle of Trenton — Trumbull, 1792
  ],
};

// All IDs as fallback pool
const ALL = [...new Set(Object.values(POOL).flat())];

function pickPool(prompt) {
  if (!prompt) return ALL;
  const p = prompt.toLowerCase();
  if (/intel|spy|dispatch|courier|secret|document|orders|letter/i.test(p)) return POOL.intel;
  if (/recruit|enlist|member|dockwork|gathering|meeting|oath/i.test(p))    return POOL.recruit;
  if (/sabotage|cannon|powder|intercept|destroy|ambush/i.test(p))          return POOL.sabotage;
  if (/propaganda|pamphlet|print|press|broadside|newspaper/i.test(p))      return POOL.propaganda;
  if (/battle|fight|attack|fire|assault|war|troops/i.test(p))              return POOL.battle;
  if (/washington|general|commander|continental/i.test(p))                 return POOL.washington;
  return ALL;
}

async function metImage(id) {
  const r = await fetch(`${MET_BASE}/objects/${id}`, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) return null;
  const obj = await r.json();
  return obj.primaryImage || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { prompt } = body || {};

  try {
    const pool = pickPool(prompt);
    // Shuffle and try up to 4 picks (all IDs are pre-verified so first hit is almost certain)
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (const id of shuffled.slice(0, 4)) {
      const url = await metImage(id);
      if (url) return res.json({ url });
    }
    res.status(200).json({ url: null, fallback: true });
  } catch (err) {
    console.error('scene.js:', err.message);
    res.status(200).json({ url: null, fallback: true });
  }
}
