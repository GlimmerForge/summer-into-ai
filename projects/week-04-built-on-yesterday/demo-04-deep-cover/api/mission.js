import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { missionNumber, missionType, previousDecisions = [] } = body;

  const systemPrompt = `You are generating authentic Culper Ring spy mission content for an interactive game set in 1779 Revolutionary War America.
Mission number: ${missionNumber}, Type: ${missionType}.
Previous decisions: ${JSON.stringify(previousDecisions)}

Historical context: The Culper Ring operated 1778-1783. Key agents: Samuel Culper Sr. (Abraham Woodhull, Setauket farmer), Samuel Culper Jr. (Robert Townsend, NYC merchant), Agent 355 (identity unknown, NYC socialite), John Bolton (Benjamin Tallmadge, Continental Army handler), Jonas (Caleb Brewster, whaleboat courier). Washington's codename was 711. The ring used a numbered code system (711=Washington, 745=New York, etc.) and invisible ink ("stain").

For 'decode' missions: Generate a realistic coded message using period-appropriate methods. Mix number codes (Culper system) with simple substitution. Include scenario setup. The message should reveal British troop movements or plans. Make it genuinely cryptic but solvable.

For 'compose' missions: Give the player a scenario where they must write a deceptive dispatch to mislead British forces. Describe exactly what false information Washington needs the British to believe.

For 'decision' missions: Present a genuine moral dilemma about network security versus agent loyalty, loyalty versus mission, or risk versus reward. Make the choice genuinely difficult.

IMPORTANT: Return ONLY valid JSON with no markdown code blocks, no extra text. The JSON must have exactly this structure:
{
  "missionNumber": <number>,
  "type": "<decode|compose|decision>",
  "dispatch": "<encoded message or situation description>",
  "cipherKey": "<hint about cipher system, or empty string for non-decode>",
  "scenario": "<2-3 sentence narrative setup, 1779 context>",
  "options": ["<Option A>", "<Option B>", "<Option C>"],
  "hiddenMission": "<what the dispatch actually reveals or the correct decision rationale>",
  "affectedAgent": "<agent id that this mission involves most, or empty string>"
}

For decision missions, options should be the actual choices (e.g., "Burn Agent 355 — sacrifice her to save the network", "Trust her — continue operations and watch closely", "Stand down — suspend all operations for 30 days").
For decode missions, options should be possible interpretations of the intelligence.
For compose missions, options should be three different disinformation approaches the player can take.`;

  const userMessage = `Generate mission ${missionNumber} of type "${missionType}". ${
    missionNumber === 1 ? 'This is the opening mission — establish the tone, introduce the cipher system gently.' :
    missionNumber === 2 ? 'Increase difficulty. British troop movements threatening a key position.' :
    missionNumber === 3 ? 'Disinformation mission — Washington needs the British to believe he is attacking New York when he plans to march south.' :
    missionNumber === 4 ? 'Crisis — Agent 355 has been seen at a British social function. Her loyalties are in question.' :
    'The final mission — everything is at stake. A dispatch has arrived that could end the war or end the network.'
  }`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    });

    const rawText = response.content[0].text.trim();

    // Strip markdown code fences if present
    let jsonText = rawText;
    const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim();
    }

    let missionData;
    try {
      missionData = JSON.parse(jsonText);
    } catch {
      // Attempt to extract JSON object from response
      const objMatch = jsonText.match(/\{[\s\S]*\}/);
      if (objMatch) {
        missionData = JSON.parse(objMatch[0]);
      } else {
        throw new Error('Could not parse mission JSON from Claude response');
      }
    }

    res.status(200).json(missionData);
  } catch (err) {
    console.error('Mission generation error:', err);
    res.status(500).json({ error: err.message });
  }
}
