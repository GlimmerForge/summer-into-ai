import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const TOOL = {
  name: 'newspaper_edition',
  description: 'Generate a full colonial newspaper edition',
  input_schema: {
    type: 'object',
    properties: {
      mainHeadline: { type: 'string', description: 'Main headline. ALL CAPS. Bold and dramatic. Max 70 chars.' },
      mainByline: { type: 'string', description: 'e.g. "From Our Correspondent in Philadelphia, this 4th Day of July"' },
      mainBody: { type: 'string', description: '4 paragraphs separated by \\n\\n. Period-accurate 1776 English. Specific names, places, amounts. Make it feel like a real dispatch from history.' },
      mainImagePrompt: { type: 'string', description: 'Subject for a woodcut illustration matching the main story. Describe what to show.' },
      mainImageCaption: { type: 'string', description: 'One-sentence caption for the woodcut. Italicized in print.' },
      storyTwoHeadline: { type: 'string', description: 'Headline for second story. Title Case.' },
      storyTwoByline: { type: 'string' },
      storyTwoBody: { type: 'string', description: '2 paragraphs separated by \\n\\n.' },
      storyThreeHeadline: { type: 'string' },
      storyThreeByline: { type: 'string' },
      storyThreeBody: { type: 'string', description: '2 paragraphs.' },
      letterHeadline: { type: 'string', description: 'Headline for letter to editor. Can be heated — either Patriot or Loyalist.' },
      letterAuthor: { type: 'string', description: 'e.g. "A Loyal Subject of Chester County" or "A Son of Liberty, Germantown"' },
      letterBody: { type: 'string', description: '2 passionate paragraphs. Period voice. Strong opinions.' },
      classifieds: {
        type: 'array',
        items: { type: 'string' },
        description: '4 classified advertisements. Period-accurate. Include: a runaway notice, a lost animal, a merchant announcement, something funny or odd. Each 2-3 sentences.'
      },
      announcement: { type: 'string', description: 'Public notice. Could be fireworks tonight, militia muster, town meeting, tavern event.' },
      weather: { type: 'string', description: 'Weather observations for Philadelphia this morning. 2 sentences. Period style.' },
      shipping: { type: 'string', description: 'One shipping news item. Ship name, origin, cargo, arrival. 2 sentences.' },
      wantedName: { type: 'string', description: 'Name on wanted notice.' },
      wantedDescription: { type: 'string', description: 'Physical description and crime. 2-3 sentences.' },
      wantedReward: { type: 'string', description: 'Reward in pounds and shillings.' },
    },
    required: [
      'mainHeadline','mainByline','mainBody','mainImagePrompt','mainImageCaption',
      'storyTwoHeadline','storyTwoByline','storyTwoBody',
      'storyThreeHeadline','storyThreeByline','storyThreeBody',
      'letterHeadline','letterAuthor','letterBody',
      'classifieds','announcement','weather','shipping',
      'wantedName','wantedDescription','wantedReward'
    ],
  },
};

const DISPATCH_TOOL = {
  name: 'breaking_dispatch',
  description: 'Generate a short breaking news dispatch',
  input_schema: {
    type: 'object',
    properties: {
      headline: { type: 'string', description: 'Short urgent headline. ALL CAPS.' },
      body: { type: 'string', description: '2-3 sentences. Urgent, specific, dramatic.' },
      source: { type: 'string', description: 'e.g. "By Express Rider from Trenton"' },
    },
    required: ['headline', 'body', 'source'],
  },
};

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();
  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { mode } = body || {};

  if (mode === 'dispatch') {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 512,
        system: 'You write breaking news dispatches for The Pennsylvania Broadside, July 4th, 1776. A courier has just arrived with urgent news. Make it specific, dramatic, and historically plausible for this exact date.',
        tools: [DISPATCH_TOOL],
        tool_choice: { type: 'tool', name: 'breaking_dispatch' },
        messages: [{ role: 'user', content: 'Generate a breaking dispatch. Make it different each time — could be military news, Congressional drama, British fleet movement, or news from another colony.' }],
      });
      const toolUse = response.content.find(b => b.type === 'tool_use');
      if (!toolUse) return res.status(500).json({ error: 'No dispatch generated' });
      return res.json(toolUse.input);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 3000,
      system: `You are the editor and typesetter of The Pennsylvania Broadside, Philadelphia's most widely-read gazette. Today is Thursday, July 4th, 1776 — the Continental Congress has just voted on independence and the city is in uproar. Generate a complete newspaper edition that feels like a real historical artifact. Use authentic 1776 English. Include specific street names (Market Street, Chestnut Street, Front Street), real tavern names (City Tavern, Indian Queen), plausible colonial names, and amounts in pounds and shillings. Every story should feel like it was written by someone who was there. The classified ads should be specific and slightly amusing — this was real life in 1776. The wanted notice should be for someone credible. The letter to the editor should have strong opinions.`,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'newspaper_edition' },
      messages: [{ role: 'user', content: 'Generate today\'s edition. Vary the stories — do not always make the main headline about the Declaration. Sometimes lead with Washington\'s army, sometimes with British fleet movements, sometimes with a surprising local story. The Declaration can be secondary news. Make it feel like a real day\'s news, not a history lesson.' }],
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) return res.status(500).json({ error: 'No content generated' });
    res.json(toolUse.input);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
