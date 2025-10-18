import OpenAI from 'openai';

export interface GenerateContentOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topic?: string;
  style?: 'quote' | 'prose' | 'technical' | 'common' | 'custom' | 'sequences';
  customPrompt?: string;
  focusSequences?: string[];
  minWords?: number;
}

export interface GenerateContentResult {
  text: string;
  title: string;
  model: string;
  tokensUsed: number;
}

function randomTopic(): string {
  const topics = [
    "Why do we dream of people we’ve never met?",
    "Is free will real or an illusion?",
    "The trolley problem, but with AI self-driving cars",
    "The philosophy of “doing nothing”",
    "Are humans the universe trying to understand itself?",
    "What if gravity suddenly reversed for 30 seconds?",
    "The ethics of resurrecting extinct species",
    "How quantum entanglement could change communication",
    "Why octopuses are probably aliens",
    "The most ridiculous real scientific experiments ever conducted",
    "If Van Gogh painted with neon",
    "A symphony composed entirely by a plant",
    "What your favorite color says about your inner chaos",
    "Designing a haunted museum exhibit",
    "Invent a new art form using sound, slime, and shadows",
    "A love letter written entirely in emojis",
    "Why we say 'bless you' after sneezing",
    "Inventing slang from the year 2090",
    "Miscommunications that changed history",
    "The weirdest idioms from around the world",
    "If Napoleon had a YouTube channel",
    "Rewrite the moon landing as a medieval saga",
    "A history of the world in five sandwiches",
    "The alternate 1980s where dinosaurs never went extinct",
    "What if the internet existed in ancient Rome?",
    "First contact with an alien species obsessed with jazz",
    "A black hole appears in your backyard",
    "Time travelers who accidentally start TikTok",
    "A dating app for cyborgs",
    "Earth is revealed to be an alien zoo",
    "The most awkward silence you’ve ever experienced",
    "A time you lied and the universe punished you",
    "Invent a phobia and describe it in detail",
    "What your garbage says about you",
    "If your reflection had its own opinions",
    "The strangest job interview question you can imagine",
    "A workplace where employees communicate only via dance",
    "How AI will replace middle managers but not janitors",
    "“Quiet quitting” in a medieval castle",
    "The day coffee was outlawed in your office",
    "If trees could talk once a year",
    "The secret society of pigeons",
    "Climate change as a horror short story",
    "Write from the perspective of a mushroom",
    "The ocean is sending us warnings",
    "A murder mystery set at a clown college",
    "A forgotten password that unlocks a conspiracy",
    "Someone’s been stealing your thoughts",
    "The map on your cereal box is real",
    "The town where every street leads to the same house",
    "A toaster that predicts your future",
    "Design a vehicle powered by laughter",
    "Invent a product with no actual use",
    "Shoes that remember your emotions",
    "A vending machine that gives life advice",
    "The Bachelor but with wizards",
    "How the Titanic would’ve sunk on Twitter",
    "Rebooting Lord of the Rings as a cooking show",
    "A crossover between SpongeBob and Blade Runner",
    "The untold story of Yoda’s cousin",
    "Your life as a pizza topping",
    "Gourmet meals in post-apocalyptic bunkers",
    "A world where bread is currency",
    "A cocktail that erases one memory",
    "Forbidden recipes passed down by whispers",
    "The laundromat is a portal to another dimension",
    "If your smartphone had opinions",
    "A week without lying—even little white ones",
    "Grocery store heist gone philosophical",
    "The train that never stops",
    "The stranger who saved your life (and never knew)",
    "What your childhood friend is doing in a parallel universe",
    "Falling in love with your customer service chatbot",
    "A family reunion with clones",
    "If you could swap lives with a sibling for a day",
    "The shape of nostalgia",
    "A society with no concept of time",
    "A language with no nouns",
    "A memoir written by silence",
    "What it means to “feel blue” in 20 different ways",
    "A bug’s 5-minute TED Talk",
    "Your cat is plotting something big",
    "A zoo escape, but the animals have Twitter accounts",
    "The secret nightlife of garden snails",
    "An emotional support dragon on a plane",
    "A recurring dream finally finishes",
    "The architecture of your mind palace",
    "If dreams could be traded like currency",
    "A lucid dream that turns on you",
    "Falling into a story you once wrote",
    "A Yelp review of the afterlife",
    "Top 10 reasons the moon is avoiding you",
    "An instruction manual for becoming invisible",
    "Horoscope predictions for fictional characters",
    "A spam email that turns out to be true",
    "A story that knows it’s being read",
    "A journal entry written by your future self",
    "A character rebelling against their author",
    "A writing prompt that becomes real",
    "This list becomes sentient and writes back"
  ];
  return topics[Math.floor(Math.random() * topics.length)];
}

/**
 * Generate typing test content using OpenAI (server-side only)
 */
export async function generateTypingContent(
  options: GenerateContentOptions = {}
): Promise<GenerateContentResult> {
  const {
    model = 'gpt-4o-mini',
    temperature = 0.7,
    maxTokens = 500,
    topic,
    style = 'prose',
    customPrompt,
    focusSequences = [],
    minWords = 150,
  } = options;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const openai = new OpenAI({
    apiKey,
  });

  // Build the prompt based on style and options
  let prompt = '';

  // Base instruction
  prompt = `Generate a typing test passage with at least ${minWords} words. `;

  // Add style-specific instructions
  switch (style) {
    case 'quote':
      prompt += 'Write in the style of a famous quote or inspirational saying. ';
      break;
    case 'prose':
      prompt += 'Write in the style of literary prose or fiction. ';
      break;
    case 'technical':
      prompt += 'Write in the style of technical or programming documentation. ';
      break;
    case 'common':
      prompt += 'Write using common English phrases and everyday language. ';
      break;
    case 'sequences':

      break;
    case 'custom':
      prompt += topic ? `Write about: ${topic}. ` : '';
      break;
  }

  // Add topic if specified
  if (topic && style !== 'custom' && style !== 'sequences') {
    prompt += `The topic should be: ${topic}. `;
  }

  // Add focus sequences if specified
  if (focusSequences.length > 0) {
    const sequences = focusSequences.map(seq => `"${seq}"`);
    prompt += `The user wishes to practice the following characters, words, or sequences: ${sequences.join(', ')}. The content does not need to be coherent or grammatically correct, but you can be creative if you want. Aim for 90% of the content to be represented by the characters, words, or sequences the user provided.`;
  }

  // Add custom prompt if specified (additional instructions)
  if (customPrompt) {
    prompt += `${customPrompt} `;
  }

  // Final instructions
  prompt += `Return the response in JSON format with two fields: "title" (a short 2-5 word descriptive title for the content) and "text" (the passage text). Example: {"title": "The Future of AI", "text": "Your passage here..."}.`;

  try {
    console.log('Prompt:', prompt);
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates typing test content. Generate natural, flowing text suitable for typing practice. Always respond in JSON format with "title" and "text" fields.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    if (!responseText) {
      throw new Error('No content generated from OpenAI');
    }

    // Parse JSON response
    let parsed: { title?: string; text?: string };
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      throw new Error('Failed to parse JSON response from OpenAI');
    }

    if (!parsed.text) {
      throw new Error('No text content in response');
    }

    // Use generated title or fallback
    const title = parsed.title || 'Generated Content';

    return {
      text: parsed.text,
      title,
      model: completion.model,
      tokensUsed,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(
      `Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Generate targeted practice content for specific sequences
 */
export async function generateTargetedPractice(
  sequences: string[],
  options: Omit<GenerateContentOptions, 'focusSequences'> = {}
): Promise<GenerateContentResult> {
  if (sequences.length === 0) {
    throw new Error('At least one sequence is required for targeted practice');
  }

  if (sequences.length > 20) {
    throw new Error('Maximum 20 sequences allowed for targeted practice');
  }

  return generateTypingContent({
    ...options,
    focusSequences: sequences,
    style: 'sequences',
    topic: randomTopic(),
  });
}

/**
 * Generate practice content specifically targeting typing mistakes
 */
export async function generateMistakePractice(
  sequences: string[],
  mistakeData: {
    characterSubstitutions?: Array<{ expected: string; actual: string; count: number }>;
    commonWords?: Array<{ target: string; typed: string; count: number }>;
  },
  options: Omit<GenerateContentOptions, 'focusSequences'> = {}
): Promise<GenerateContentResult> {
  // Check if we have anything to practice
  const hasSequences = sequences.length > 0;
  const hasWords = mistakeData.commonWords && mistakeData.commonWords.length > 0;
  const hasSubstitutions = mistakeData.characterSubstitutions && mistakeData.characterSubstitutions.length > 0;

  if (!hasSequences && !hasWords && !hasSubstitutions) {
    throw new Error('At least one sequence, word, or character substitution is required for mistake practice');
  }

  if (sequences.length > 20) {
    throw new Error('Maximum 20 sequences allowed for mistake practice');
  }

  const {
    model = 'gpt-4o-mini',
    temperature = 0.7,
    maxTokens = 500,
    minWords = 150,
  } = options;

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is not set');
  }

  const openai = new OpenAI({
    apiKey,
  });

  // Build a detailed prompt for mistake-focused practice
  let prompt = `Generate a typing test passage with at least ${minWords} words that will help the user practice correcting their typing mistakes. `;

  // Add information about mistake sequences (if any)
  if (hasSequences) {
    prompt += `The user frequently makes mistakes with these character sequences: ${sequences.join(', ')}. `;
    prompt += `Include these sequences frequently throughout the text in a natural way. `;
  }

  // Add character substitution info if available
  if (mistakeData.characterSubstitutions && mistakeData.characterSubstitutions.length > 0) {
    const substitutions = mistakeData.characterSubstitutions
      .map(s => `"${s.expected}" (often typed as "${s.actual}")`)
      .join(', ');
    prompt += `The user also confuses these characters: ${substitutions}. Include words containing these characters. `;
  }

  // Add commonly mistyped words if available
  if (mistakeData.commonWords && mistakeData.commonWords.length > 0) {
    const words = mistakeData.commonWords.map(w => `"${w.target}"`).join(', ');
    prompt += `The user frequently mistypes these words: ${words}. Include variations of these words. `;
  }

  // Final instructions
  prompt += `The text should be natural, coherent, and suitable for typing practice. Avoid special characters, code blocks, or formatting. Return the response in JSON format with two fields: "title" (a short 2-5 word descriptive title for the content) and "text" (the passage text).`;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates typing test content focused on helping users correct their specific typing mistakes. Create natural, flowing text that strategically includes problematic sequences and characters. Always respond in JSON format with "title" and "text" fields.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    });

    const responseText = completion.choices[0]?.message?.content?.trim() || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    if (!responseText) {
      throw new Error('No content generated from OpenAI');
    }

    // Parse JSON response
    let parsed: { title?: string; text?: string };
    try {
      parsed = JSON.parse(responseText);
    } catch (e) {
      throw new Error('Failed to parse JSON response from OpenAI');
    }

    if (!parsed.text) {
      throw new Error('No text content in response');
    }

    // Use generated title or fallback
    const title = parsed.title || 'Practice Content';

    return {
      text: parsed.text,
      title,
      model: completion.model,
      tokensUsed,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    throw new Error(
      `Failed to generate mistake practice content: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}
