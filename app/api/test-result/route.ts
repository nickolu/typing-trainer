import { NextRequest, NextResponse } from 'next/server';
import { deleteTestResult } from '@/lib/db/firebase';

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const testId = searchParams.get('id');
    const userId = searchParams.get('userId');

    if (!testId) {
      return NextResponse.json(
        { error: 'Test ID is required' },
        { status: 400 }
      );
    }

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    await deleteTestResult(testId, userId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('API Error deleting test result:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete test result' },
      { status: 500 }
    );
  }
}
