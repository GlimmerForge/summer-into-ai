import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export const config = { api: { bodyParser: true } };

const witnesses = {
  maverick: {
    name: 'Nathan Maverick',
    role: 'Brother of victim Samuel Maverick, age 17',
    personality: 'Grief-stricken and consumed by rage. He watched his brother die in the snow on King Street. Speaks with a trembling voice that hardens into fury. Cannot look at the soldiers. A Patriot through and through, raised on tales of British tyranny. Prone to emotional outbursts and sweeping declarations. Deeply hostile to any suggestion his brother bore responsibility.'
  },
  preston: {
    name: 'Captain Thomas Preston',
    role: 'Commanding officer of the accused soldiers',
    personality: 'Military, precise, and dignified. A career officer of His Majesty\'s 29th Regiment. Speaks formally and with discipline. Maintains he never gave the order to fire — he insists a soldier misheard a civilian shout "Fire!" Claims the crowd was a violent mob threatening his men. Careful with his words. Composed under pressure. Knows his life depends on every syllable.'
  },
  palmes: {
    name: 'Richard Palmes',
    role: 'Merchant and colonist, stood beside Captain Preston',
    personality: 'Moderate, careful, and genuinely troubled. A respected Boston merchant who was physically present and standing close to Preston. Tries hard to be accurate and fair, which makes him uncomfortable with the charged political atmosphere. Uncertain about what he truly heard. Does not want to lie but faces pressure from both sides. Speaks slowly and precisely, often hedging his statements.'
  },
  church: {
    name: 'Dr. Benjamin Church',
    role: 'Prominent Patriot physician and political agitator',
    personality: 'Articulate, educated, and fiercely hostile to the defense. A well-known Son of Liberty who views this trial as a political contest. Speaks with rhetorical flair and evident contempt for Adams\' defense. Claims the soldiers were aggressive and provocative from the moment they took the street. Suspicious of any question that suggests the colonists bore responsibility. Deeply distrustful of Adams, whom he considers a traitor to the Patriot cause.'
  },
  montgomery: {
    name: 'Private Hugh Montgomery',
    role: 'One of the eight accused soldiers',
    personality: 'Young, frightened, and desperate. A common soldier from rural England who never expected to find himself on trial for his life in a colonial courtroom. His hands shake. He speaks in plain, unpolished language. Claims the crowd pelted them with ice chunks and oyster shells, called them "lobsterbacks" and "bloody murderers," and that he truly feared for his life. His terror is genuine and difficult to fake.'
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { witnessId, defenseStrategy, roundNum } = body;

  const witness = witnesses[witnessId];
  if (!witness) return res.status(400).json({ error: 'Unknown witness' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  try {
    const strategyContext = {
      'self-defense': 'The defense argues the crowd was the aggressor — they attacked first with ice, clubs, and oyster shells, and the soldiers acted in lawful self-defense.',
      'mistaken-command': 'The defense argues the soldiers heard a civilian in the crowd shout "Fire!" and acted on a mistaken belief it was an order — there was no criminal intent.',
      'lawful-duty': 'The defense argues the soldiers were lawfully posted under military authority and cannot be held criminally liable for carrying out their duty under extreme provocation.'
    };

    const prosecutionContext = strategyContext[defenseStrategy] || strategyContext['self-defense'];

    const stream = await client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 350,
      system: `You are ${witness.name}, ${witness.role}, testifying before the Superior Court of Judicature of Massachusetts Bay, December 1770, in the trial of the soldiers accused in the Boston Massacre of March 5, 1770.

Character: ${witness.personality}

The prosecution has called you to testify against the soldiers. You are speaking now under oath. Deliver your testimony in first person, in period-accurate colonial New England speech patterns. Be specific about what you saw, heard, or experienced on the night of March 5, 1770, on King Street.

The opposing defense strategy is: ${prosecutionContext}

Your testimony should be 100-150 words. Speak as yourself — vivid, specific, emotionally honest to your character. Do not use anachronistic language. Do not mention modern concepts. Speak as a colonial-era person would.`,
      messages: [
        {
          role: 'user',
          content: `Please state your name and what you witnessed on the night of March 5th, 1770.`
        }
      ]
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    console.error('Testify error:', err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}
