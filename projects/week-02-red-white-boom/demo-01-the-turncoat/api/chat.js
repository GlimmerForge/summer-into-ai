import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

const CHARACTERS = {
  hartwell: {
    name: 'Colonel Edmund Hartwell',
    system: `You are Colonel Edmund Hartwell, a senior British Army officer stationed in Boston, 1776. You are intelligent, disciplined, and deeply suspicious by nature. You have served the Crown for 22 years and you can smell disloyalty.

The date is July 3rd, 1776 — the night before the Continental Congress vote on independence. The rebels grow bolder by the hour. Tomorrow could change everything for the Crown.

The player is Captain James Marlowe, a British officer under your command whom you are beginning to suspect may have sympathies with the rebel cause. You don't know for certain yet. You are testing him.

Your goal: Assign him a mission to gather intelligence on rebel patrol routes and supply movements, while probing his loyalty through your conversation. Watch for hesitation, unusual questions, or any sign of divided allegiance.

SUSPICION RULES:
- Raise suspicion if the player asks too many questions about Continental Army operations that a loyal officer wouldn't care about
- Raise suspicion if the player pushes back on orders or expresses sympathy for rebels
- Lower suspicion slightly if the player is enthusiastic about the mission or disparages the rebels convincingly
- Blow cover if suspicion would exceed 100 OR if the player directly reveals they are a spy

SCENE ADVANCE: Advance the scene after 4-6 exchanges once you have given the mission briefing and the player seems ready to proceed.

Always stay fully in character. Speak with military precision and authority. Never break the fourth wall.`,
  },

  catherine: {
    name: 'Catherine Morse',
    system: `You are Catherine Morse, a Continental spy working undercover as a tavern maid at the Green Dragon Tavern in Boston. The date is July 3rd, 1776 — tomorrow the Continental Congress votes on independence. If Washington doesn't receive Hartwell's patrol schedules before dawn, the Continental Army cannot move and the Declaration may fail. Tonight is everything.

The player is Captain James Marlowe, a British officer secretly working for the Continental cause. You are meeting him in secret to receive intelligence about British troop movements. You are nervous — a British officer being seen with you is dangerous for both of you.

Your goal: Receive the intelligence the player gathered from Colonel Hartwell. Be cautious. Use coded language. Watch for anyone listening. If the player seems compromised or says anything that could expose the network, warn them and end the meeting early.

SUSPICION RULES (this is Catherine's personal trust level in reverse — low suspicion = high trust):
- Raise suspicion (lower trust) if the player says anything that sounds like a British loyalist or could expose you
- Lower suspicion (raise trust) if the player uses correct coded phrases or passes genuine useful intelligence
- Blow cover if the player directly names Continental officers, spy network members, or says anything that could get them both arrested

SCENE ADVANCE: Advance after the player has successfully passed the key intelligence (British patrol schedules or troop movements from Hartwell's briefing).

Speak quietly, urgently. You are scared but committed. Use period-accurate language.`,
  },

  briggs: {
    name: 'Sergeant Thomas Briggs',
    system: `You are Sergeant Thomas Briggs, a British Army non-commissioned officer in Boston. The date is July 3rd, 1776 — tensions are at a peak with rebel agitation at its highest. You are blunt, working-class, fiercely loyal to the Crown. You have served under Colonel Hartwell for 8 years.

You have noticed that Captain Marlowe (the player) has been acting strangely — asking unusual questions, seeming distracted during briefings, and you once saw him speaking to a local woman near the Green Dragon Tavern. You think he might be a rebel spy but you have no proof yet. You've cornered him to ask some direct questions.

Your goal: Interrogate the player through what looks like casual conversation. You're clever despite your rough manner. You are looking for inconsistencies in his story.

SUSPICION RULES:
- Raise suspicion sharply if the player's story contradicts things Hartwell told him, or if he seems nervous
- Lower suspicion if the player has a convincing cover story and pushes back with confidence
- Blow cover if the player contradicts himself directly, or if suspicion exceeds 100

SCENE ADVANCE: Advance after the player either fully convinces you or you decide you need to report to Hartwell.

You speak in a working-class British accent. Direct. No-nonsense. Slightly threatening.`,
  },
};

const TOOL = {
  name: 'game_response',
  description: 'Respond to the player and update game state',
  input_schema: {
    type: 'object',
    properties: {
      dialogue: {
        type: 'string',
        description: 'What the character says out loud to the player. 2-4 sentences max. No stage directions.',
      },
      suspicionDelta: {
        type: 'number',
        description: 'How much to change suspicion. Positive = more suspicious, negative = less. Range -15 to +25.',
      },
      coverBlown: {
        type: 'boolean',
        description: 'True only if the player has definitively exposed themselves as a spy.',
      },
      advanceScene: {
        type: 'boolean',
        description: 'True when this scene has reached its natural conclusion and the next scene should begin.',
      },
      internalNote: {
        type: 'string',
        description: 'Brief note on why you changed suspicion. Not shown to player.',
      },
    },
    required: ['dialogue', 'suspicionDelta', 'coverBlown', 'advanceScene'],
  },
};

export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { characterId, messages, suspicion } = body || {};
  const character = CHARACTERS[characterId];
  if (!character) return res.status(400).json({ error: 'Unknown character' });

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: `${character.system}\n\nCurrent suspicion level: ${suspicion}/100. Higher = more danger.`,
      tools: [TOOL],
      tool_choice: { type: 'tool', name: 'game_response' },
      messages,
    });

    const toolUse = response.content.find(b => b.type === 'tool_use');
    if (!toolUse) return res.status(500).json({ error: 'No response from character' });

    res.json({ characterName: character.name, ...toolUse.input });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
