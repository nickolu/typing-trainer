import type { Metadata } from 'next';
import { ResultsPageClient } from './ResultsPageClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

async function fetchResultMetadata(id: string) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/testResults/${id}`;
    const res = await fetch(url, { next: { revalidate: 60 } });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.fields) return null;

    const fields = data.fields;

    // Helper to parse Firestore value types
    function parseField(field: Record<string, unknown>): unknown {
      if (!field) return undefined;
      if ('integerValue' in field) return Number(field.integerValue);
      if ('doubleValue' in field) return Number(field.doubleValue);
      if ('stringValue' in field) return field.stringValue;
      if ('booleanValue' in field) return field.booleanValue;
      return undefined;
    }

    const isPublic = parseField(fields.isPublic);
    if (!isPublic) return null;

    const wpm = parseField(fields.wpm) as number | undefined;
    const accuracy = parseField(fields.accuracy) as number | undefined;

    return { wpm, accuracy };
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const result = await fetchResultMetadata(id);

  if (!result || result.wpm == null || result.accuracy == null) {
    return {
      title: 'CunningType - Typing Test Results',
    };
  }

  const wpm = Math.round(result.wpm);
  const accuracy = Math.round(result.accuracy);
  const title = `${wpm} WPM | ${accuracy}% Accuracy on CunningType`;
  const description = `I typed ${wpm} WPM with ${accuracy}% accuracy. Can you beat me?`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ['/cunningtype-preview.jpg'],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: ['/cunningtype-preview.jpg'],
    },
  };
}

export default async function ResultsPage({ params }: PageProps) {
  const { id } = await params;
  return <ResultsPageClient id={id} />;
}
