import { NextRequest, NextResponse } from 'next/server';
import { generateTargetedPractice } from '@/lib/llm/openai';

export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const { sequences } = await request.json();

    if (!sequences || sequences.length === 0) {
      return NextResponse.json({ error: 'No sequences provided' }, { status: 400 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({ error: 'OpenAI API key not configured' }, { status: 500 });
    }

    const result = await generateTargetedPractice(
      sequences.slice(0, 15), // Max 15 sequences
      { minWords: 40 } // Short-medium passage
    );

    return NextResponse.json(result);
  } catch (error) {
    console.error('Weakness content generation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate content' },
      { status: 500 }
    );
  }
}
