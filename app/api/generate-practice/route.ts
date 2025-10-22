import { NextRequest, NextResponse } from 'next/server';
import { generateTargetedPractice, GenerateContentOptions } from '@/lib/llm/openai';

// Force this route to use Node.js runtime (not Edge)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sequences, options } = body as {
      sequences: string[];
      options?: Omit<GenerateContentOptions, 'focusSequences'>;
    };

    // Validate sequences
    if (!sequences || sequences.length === 0) {
      return NextResponse.json(
        { error: 'At least one sequence is required' },
        { status: 400 }
      );
    }

    if (sequences.length > 20) {
      return NextResponse.json(
        { error: 'Maximum 20 sequences allowed' },
        { status: 400 }
      );
    }

    // Check if API key is configured server-side
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured on the server' },
        { status: 500 }
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
