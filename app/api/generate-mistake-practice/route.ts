import { NextRequest, NextResponse } from 'next/server';
import { generateMistakePractice } from '@/lib/llm/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sequences, mistakeData, options } = body;

    // Validate sequences
    if (!sequences || !Array.isArray(sequences) || sequences.length === 0) {
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

    // Validate mistakeData
    if (!mistakeData || typeof mistakeData !== 'object') {
      return NextResponse.json(
        { error: 'Mistake data is required' },
        { status: 400 }
      );
    }

    // Generate practice content
    const result = await generateMistakePractice(sequences, mistakeData, options || {});

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
