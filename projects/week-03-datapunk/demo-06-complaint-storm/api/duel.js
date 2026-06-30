import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { complaints, issueBreakdown, total, companyName, resolutionRate } = body;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Sample complaints with narratives for context
  const withNarratives = (complaints || [])
    .filter(c => c.narrative && c.narrative.length > 20)
    .slice(0, 15);

  const topIssues = Object.entries(issueBreakdown || {})
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([issue, count]) => `${issue}: ${count}`)
    .join('; ');

  const narrativeSamples = withNarratives
    .slice(0, 8)
    .map((c, i) => `[${i + 1}] ${c.issue}: "${c.narrative.slice(0, 150)}..."`)
    .join('\n');

  const prompt = `You are a debate AI presenting BOTH sides of consumer complaint data about ${companyName}.

DATA SUMMARY:
- Total federal complaints on file: ${total}
- Sample shown: ${(complaints || []).length}
- Top issue categories: ${topIssues || 'Various'}
- Resolution rate (complaints with a company response): ${resolutionRate}%
- Sample complaint narratives from real consumers:
${narrativeSamples || '(no narratives available in this sample)'}

INSTRUCTIONS:
Present a structured courtroom debate. Each paragraph MUST start with exactly one of these markers:
  [P] for prosecution arguments
  [D] for defense arguments
  [VERDICT] for the final impartial assessment

Do 4-5 rounds alternating [P] then [D], then one [VERDICT] section at the end.

[P] paragraphs — make the strongest possible case that this data reveals systematic wrongdoing, predatory practices, or willful consumer harm. Cite specific numbers and complaint patterns. Be prosecutorial and precise.

[D] paragraphs — make the strongest possible case for the company. High complaint volume reflects market share, not wrongdoing. CFPB is a reporting mechanism, not a court. Many complaints are unverified. Resolution rates show responsiveness. Industry benchmarks matter.

[VERDICT] — What would an impartial financial analyst conclude from this data alone? Be measured but honest. End with exactly 3 numbered consumer action items for someone who banks or invests with this company.

Rules:
- Keep each paragraph to 2-3 punchy sentences
- Be direct, specific, and dramatic — this is a debate, not a memo
- Never start a paragraph without one of the three markers
- Do NOT use markdown headers, bullets, or asterisks — plain text only
- The [VERDICT] section should be one cohesive paragraph followed by a blank line, then "1. ...", "2. ...", "3. ..."`;

  const stream = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1800,
    messages: [{ role: 'user', content: prompt }],
    stream: true
  });

  let buffer = '';
  let currentType = null;

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      buffer += event.delta.text;

      let changed = true;
      while (changed) {
        changed = false;

        // Check for markers at start of buffer (possibly with leading whitespace/newlines)
        const pMatch = buffer.match(/^[\s]*\[P\]\s*/);
        const dMatch = buffer.match(/^[\s]*\[D\]\s*/);
        const vMatch = buffer.match(/^[\s]*\[VERDICT\]\s*/);

        if (pMatch) {
          currentType = 'prosecution';
          buffer = buffer.slice(pMatch[0].length);
          changed = true;
        } else if (dMatch) {
          currentType = 'defense';
          buffer = buffer.slice(dMatch[0].length);
          changed = true;
        } else if (vMatch) {
          currentType = 'verdict';
          buffer = buffer.slice(vMatch[0].length);
          changed = true;
        }

        if (currentType && buffer.length > 0) {
          // Find the next marker
          const nextMarker = buffer.search(/\[P\]|\[D\]|\[VERDICT\]/);

          if (nextMarker === -1) {
            // No marker found yet — emit safe portion (keep 12 chars in case marker is split across chunks)
            const safeLength = Math.max(0, buffer.length - 12);
            if (safeLength > 0) {
              const toEmit = buffer.slice(0, safeLength);
              res.write(`data: ${JSON.stringify({ type: currentType, text: toEmit })}\n\n`);
              buffer = buffer.slice(safeLength);
              changed = true;
            }
          } else {
            // Emit everything before the next marker
            if (nextMarker > 0) {
              res.write(`data: ${JSON.stringify({ type: currentType, text: buffer.slice(0, nextMarker) })}\n\n`);
            }
            buffer = buffer.slice(nextMarker);
            changed = true;
          }
        }
      }
    }
  }

  // Flush remaining buffer
  if (buffer.trim() && currentType) {
    const clean = buffer.replace(/\[P\]|\[D\]|\[VERDICT\]/g, '').trim();
    if (clean) {
      res.write(`data: ${JSON.stringify({ type: currentType, text: clean })}\n\n`);
    }
  }

  res.write(`data: ${JSON.stringify({ type: 'done' })}\n\n`);
  res.end();
}
