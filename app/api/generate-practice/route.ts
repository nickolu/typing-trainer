import { NextRequest, NextResponse } from 'next/server';
import { resolveLlmModel } from '@/lib/llm/models';
import { getProviderConfigError } from '@/lib/llm/provider';
import { generateTargetedPractice, generateMistakePractice, GenerateContentOptions } from '@/lib/llm/generate';

// Force this route to use Node.js runtime (not Edge)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sequences, words, options } = body as {
      sequences?: string[];
      words?: string[];
      options?: Omit<GenerateContentOptions, 'focusSequences'>;
    };

    // Check that the API key for the selected model's provider is configured server-side
    const configError = getProviderConfigError(resolveLlmModel(options?.model));
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 500 });
    }

    // Word-error-based practice mode
    if (words && words.length > 0) {
      if (words.length > 50) {
        return NextResponse.json(
          { error: 'Maximum 50 words allowed' },
          { status: 400 }
        );
      }

      const commonWords = words.map((w) => ({ target: w, typed: '', count: 1 }));
      const result = await generateMistakePractice([], { commonWords }, options || {});
      return NextResponse.json(result);
    }

    // Sequence-based practice mode (original behavior)
    if (!sequences || sequences.length === 0) {
      return NextResponse.json(
        { error: 'At least one sequence or word is required' },
        { status: 400 }
      );
    }

    if (sequences.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 sequences allowed' },
        { status: 400 }
      );
    }

    // Generate targeted practice content using server-side API key
    const result = await generateTargetedPractice(sequences, options || {});

    return NextResponse.json(result);
  } catch (error) {
    console.error('Practice content generation error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate practice content',
      },
      { status: 500 }
    );
  }
}
