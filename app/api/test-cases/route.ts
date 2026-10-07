import db from '@/lib/sqlite';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const experimentId = url.searchParams.get('experiment_id');
  if (!experimentId) return NextResponse.json([]);
  const testCases = db.prepare(
    'SELECT * FROM test_cases WHERE experiment_id = ? ORDER BY created_at DESC'
  ).all(experimentId);
  return NextResponse.json(testCases);
} 