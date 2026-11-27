import { NextRequest, NextResponse } from 'next/server';
import { resolveLlmModel } from '@/lib/llm/models';
import { getProviderConfigError } from '@/lib/llm/provider';
import { generateMistakePractice } from '@/lib/llm/generate';

// Force this route to use Node.js runtime (not Edge)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sequences, mistakeData, options } = body;

    // Validate that we have at least something to practice
    const hasSequences = sequences && Array.isArray(sequences) && sequences.length > 0;
    const hasWords = mistakeData?.commonWords && mistakeData.commonWords.length > 0;
    const hasSubstitutions = mistakeData?.characterSubstitutions && mistakeData.characterSubstitutions.length > 0;

    if (!hasSequences && !hasWords && !hasSubstitutions) {
      return NextResponse.json(
        { error: 'At least one sequence, word, or character substitution is required' },
        { status: 400 }
      );
    }

    if (sequences && sequences.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 sequences allowed' },
        { status: 400 }
      );
    }

    // Check that the API key for the selected model's provider is configured server-side
    const configError = getProviderConfigError(resolveLlmModel(options?.model));
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 500 });
    }

    // Generate practice content
    const result = await generateMistakePractice(sequences || [], mistakeData, options || {});

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error generating mistake practice content:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate mistake practice content',
      },
      { status: 500 }
    );
  }
}
