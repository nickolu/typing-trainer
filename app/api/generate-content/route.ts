import { NextRequest, NextResponse } from 'next/server';
import { generateTypingContent, GenerateContentOptions } from '@/lib/llm/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { options } = body as {
      options: GenerateContentOptions;
    };

    // Check if API key is configured server-side
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: 'OpenAI API key is not configured on the server' },
        { status: 500 }
      );
    }

    // Generate content using server-side API key
    const result = await generateTypingContent(options);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Content generation error:', error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to generate content',
      },
      { status: 500 }
    );
  }
}
