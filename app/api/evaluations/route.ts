import db from '@/lib/sqlite';
import { NextResponse } from 'next/server';

export async function GET(req) {
  const url = new URL(req.url);
  const testCaseIds = url.searchParams.get('test_case_ids'); // comma-separated
  const ids = testCaseIds ? testCaseIds.split(',') : [];
  if (ids.length === 0) return NextResponse.json([]);
  const placeholders = ids.map(() => '?').join(',');
  const results = db.prepare(
    `SELECT * FROM llm_evaluations WHERE test_case_id IN (${placeholders})`
  ).all(...ids);
  return NextResponse.json(results);
}

export async function POST(req) {
  const body = await req.json();
  const stmt = db.prepare(
    `INSERT INTO llm_evaluations (test_case_id, llm_response, factuality, closer_to_expected, explanation, model_id, human_factuality, human_explanation)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  );
  const info = stmt.run(
    body.test_case_id,
    body.llm_response,
    body.factuality,
    body.closer_to_expected,
    body.explanation,
    body.model_id,
    body.human_factuality,
    body.human_explanation
  );
  return NextResponse.json({ id: info.lastInsertRowid });
}

export async function PATCH(req) {
  const body = await req.json();
  if (!body.id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  const stmt = db.prepare(
    `UPDATE llm_evaluations SET llm_response=?, factuality=?, closer_to_expected=?, explanation=?, model_id=?, human_factuality=?, human_explanation=? WHERE id=?`
  );
  stmt.run(
    body.llm_response,
    body.factuality,
    body.closer_to_expected,
    body.explanation,
    body.model_id,
    body.human_factuality,
    body.human_explanation,
    body.id
  );
  return NextResponse.json({ success: true });
} 