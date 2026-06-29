import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const CHARACTERS = {
  narrator:   { name: 'Narrator',           voiceId: 'pqHfZKP75CvOlQylNhV4' },
  hancock:    { name: 'John Hancock',        voiceId: 'pNInz6obpgDQGcFmaJgB' },
  franklin:   { name: 'Benjamin Franklin',   voiceId: 'pqHfZKP75CvOlQylNhV4' },
  adams:      { name: 'John Adams',          voiceId: 'nPczCjzI2devNBz1zQrb' },
  jefferson:  { name: 'Thomas Jefferson',    voiceId: 'JBFqnCBsd6RMkjVDRZzb' },
  dickinson:  { name: 'John Dickinson',      voiceId: 'onwK4e9ZLuTAKqWW03F9' },
  washington: { name: 'George Washington',   voiceId: 'pNInz6obpgDQGcFmaJgB' },
  hamilton:   { name: 'Alexander Hamilton',  voiceId: 'JBFqnCBsd6RMkjVDRZzb' },
  revere:     { name: 'Paul Revere',         voiceId: 'pNInz6obpgDQGcFmaJgB' },
  warren:     { name: 'Dr. Joseph Warren',   voiceId: 'nPczCjzI2devNBz1zQrb' },
  soldier:    { name: 'A Soldier',           voiceId: 'onwK4e9ZLuTAKqWW03F9' },
  knox:       { name: 'Henry Knox',          voiceId: 'nPczCjzI2devNBz1zQrb' },
};

const SCENES = {
  signing: {
    title: 'The Signing',
    date: 'Philadelphia · July 4th, 1776',
    description: 'The final hours before men commit treason.',
    brief: `Philadelphia, July 4th, 1776. The Declaration of Independence is about to be signed.
These men are committing treason against the British Crown — the penalty is death by hanging.
Use: narrator, jefferson, adams, franklin, hancock, dickinson (the one man who refused to sign).
Franklin actually said: "We must all hang together, or we shall most assuredly all hang separately."
Hancock signed his name large so King George could read it without his spectacles.
Jefferson spent three weeks writing this; Congress spent two days cutting it apart.
The tension: will every man sign? What does it mean to put your name on this?`,
    characters: ['narrator', 'jefferson', 'adams', 'franklin', 'hancock', 'dickinson']
  },
  ride: {
    title: 'The Ride',
    date: 'Boston · April 18th, 1775',
    description: 'One hour before Paul Revere rides.',
    brief: `Boston, the night of April 18th, 1775. Dr. Joseph Warren has received intelligence:
700 British Regulars are moving tonight to seize colonial arms at Concord and arrest Samuel Adams and John Hancock.
Paul Revere is about to ride to warn them. William Dawes rides a different route.
Robert Newman will hang lanterns in the Old North Church steeple: one if by land, two if by sea.
The British are moving by sea — across the Charles River. Two lanterns.
Use: narrator, revere, warren, and one or two others (a church sexton, a waiting militiaman).
The tension: they may not make it. The British have patrols on every road.`,
    characters: ['narrator', 'revere', 'warren', 'soldier']
  },
  valley: {
    title: 'The Winter',
    date: 'Valley Forge · December 19th, 1777',
    description: 'The lowest point of the Revolution.',
    brief: `Valley Forge, December 19th, 1777. George Washington's Continental Army has arrived at winter quarters.
12,000 men. 1 in 4 will not survive this winter — not from battle, but from cold, hunger, and disease.
Men are sleeping in the open. Shoes have worn through. Some men leave bloody footprints in the snow.
Washington knows that if morale breaks here, the Revolution dies.
Hamilton is his young aide-de-camp, 22 years old, brilliant and loyal.
Knox commands the artillery; he has no ammunition.
Use: narrator, washington, hamilton, knox, soldier.
The tension: Washington must hold men who have every reason to leave. He writes a letter to Congress that night that they do not answer for two weeks.`,
    characters: ['narrator', 'washington', 'hamilton', 'knox', 'soldier']
  }
};

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { sceneKey } = body;

  const scene = SCENES[sceneKey];
  if (!scene) return res.status(400).json({ error: 'Unknown scene' });

  const characterList = scene.characters
    .map(k => `- ${k}: ${CHARACTERS[k].name}`)
    .join('\n');

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2500,
    system: `You are a radio drama writer. Write dramatically compelling audio drama for the American Revolution.

Rules:
- Period-accurate language — 1770s idiom, not modern phrasing
- Short, actable lines — 1 to 3 sentences each. Radio means listeners cannot re-read.
- Narrator sets scenes tersely; characters reveal everything through action and conflict
- Real dramatic tension — not historical summary or exposition
- Specific details (exact dates, real names, physical details) ground every scene
- End on a line or image that stays with the listener
- 13 to 16 lines total

Available characters for this scene:
${characterList}

Use the narrator sparingly — 2 or 3 lines maximum, only to set time and place.`,
    tools: [{
      name: 'write_radio_drama',
      description: 'Write the complete radio drama script',
      input_schema: {
        type: 'object',
        required: ['title', 'setting', 'lines'],
        properties: {
          title: { type: 'string', description: 'Dramatic title for this episode' },
          setting: { type: 'string', description: 'One vivid sentence describing the scene for the UI' },
          lines: {
            type: 'array',
            minItems: 13,
            maxItems: 16,
            items: {
              type: 'object',
              required: ['characterKey', 'text', 'pauseAfter'],
              properties: {
                characterKey: {
                  type: 'string',
                  enum: scene.characters
                },
                text: {
                  type: 'string',
                  description: '1-3 sentences of authentic period dialogue or narration'
                },
                pauseAfter: {
                  type: 'number',
                  description: 'Seconds to pause after this line (0.3 to 1.5). Use longer pauses after emotional beats.'
                }
              }
            }
          }
        }
      }
    }],
    tool_choice: { type: 'tool', name: 'write_radio_drama' },
    messages: [{
      role: 'user',
      content: `Write the radio drama for this scene:\n\n${scene.brief}`
    }]
  });

  const toolUse = response.content.find(c => c.type === 'tool_use');
  if (!toolUse) return res.status(500).json({ error: 'Script generation failed' });

  // Attach voice IDs to each line
  const script = {
    ...toolUse.input,
    lines: toolUse.input.lines.map(line => ({
      ...line,
      characterName: CHARACTERS[line.characterKey]?.name || line.characterKey,
      voiceId: CHARACTERS[line.characterKey]?.voiceId
    }))
  };

  res.setHeader('Content-Type', 'application/json');
  res.json(script);
}
