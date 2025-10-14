import OpenAI from 'openai';

export interface GenerateContentOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  topic?: string;
  style?: 'quote' | 'prose' | 'technical' | 'common' | 'custom';
  customPrompt?: string;
  focusSequences?: string[];
  minWords?: number;
}

export interface GenerateContentResult {
  text: string;
  model: string;
  tokensUsed: number;
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
    case 'custom':
      prompt += topic ? `Write about: ${topic}. ` : '';
      break;
  }

  // Add topic if specified
  if (topic && style !== 'custom') {
    prompt += `The topic should be: ${topic}. `;
  }

  // Add focus sequences if specified
  if (focusSequences.length > 0) {
    prompt += `Include frequent use of these character sequences: ${focusSequences.join(', ')}. `;
  }

  // Add custom prompt if specified (additional instructions)
  if (customPrompt) {
    prompt += `${customPrompt} `;
  }

  // Final instructions
  prompt += `The text should be natural, coherent, and suitable for typing practice. Avoid special characters, code blocks, or formatting. Return only the passage text, nothing else.`;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates typing test content. Generate natural, flowing text suitable for typing practice.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const text = completion.choices[0]?.message?.content?.trim() || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    if (!text) {
      throw new Error('No content generated from OpenAI');
    }

    // Clean up the text - remove quotes if they wrap the entire text
    let cleanedText = text;
    if (
      (cleanedText.startsWith('"') && cleanedText.endsWith('"')) ||
      (cleanedText.startsWith("'") && cleanedText.endsWith("'"))
    ) {
      cleanedText = cleanedText.slice(1, -1);
    }

    return {
      text: cleanedText,
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
    style: 'custom',
    topic: `practice typing these character combinations: ${sequences.join(', ')}`,
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
  if (sequences.length === 0) {
    throw new Error('At least one sequence is required for mistake practice');
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

  // Add information about mistake sequences
  prompt += `The user frequently makes mistakes with these character sequences: ${sequences.join(', ')}. `;
  prompt += `Include these sequences frequently throughout the text in a natural way. `;

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
  prompt += `The text should be natural, coherent, and suitable for typing practice. Avoid special characters, code blocks, or formatting. Return only the passage text, nothing else.`;

  try {
    const completion = await openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a helpful assistant that generates typing test content focused on helping users correct their specific typing mistakes. Create natural, flowing text that strategically includes problematic sequences and characters.',
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      temperature,
      max_tokens: maxTokens,
    });

    const text = completion.choices[0]?.message?.content?.trim() || '';
    const tokensUsed = completion.usage?.total_tokens || 0;

    if (!text) {
      throw new Error('No content generated from OpenAI');
    }

    // Clean up the text
    let cleanedText = text;
    if (
      (cleanedText.startsWith('"') && cleanedText.endsWith('"')) ||
      (cleanedText.startsWith("'") && cleanedText.endsWith("'"))
    ) {
      cleanedText = cleanedText.slice(1, -1);
    }

    return {
      text: cleanedText,
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
