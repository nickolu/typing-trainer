import { NextRequest, NextResponse } from 'next/server';
import { resolveLlmModel } from '@/lib/llm/models';
import { getProviderConfigError } from '@/lib/llm/provider';
import { generateTypingContent, GenerateContentOptions } from '@/lib/llm/generate';

// Force this route to use Node.js runtime (not Edge)
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { options } = body as {
      options: GenerateContentOptions;
    };

    // Check that the API key for the selected model's provider is configured server-side
    const configError = getProviderConfigError(resolveLlmModel(options?.model));
    if (configError) {
      return NextResponse.json({ error: configError }, { status: 500 });
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
