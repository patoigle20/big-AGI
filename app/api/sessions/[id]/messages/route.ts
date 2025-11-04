import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const { rows } = await pool.query(
    `SELECT id, role, content, token_count, created_at
     FROM chat_messages
     WHERE session_id=$1
     ORDER BY created_at ASC`,
    [params.id]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}));
  const role = (body?.role ?? "user").toString();
  const content = (body?.content ?? "").toString();
  const token_count =
    body?.token_count === undefined || body?.token_count === null
      ? null
      : Number(body.token_count);

  if (!content) return NextResponse.json({ error: "content is required" }, { status: 400 });

  const { rows } = await pool.query(
    `INSERT INTO chat_messages (session_id, role, content, token_count)
     VALUES ($1, $2, $3, $4)
     RETURNING id, role, content, token_count, created_at`,
    [params.id, role, content, isNaN(token_count as any) ? null : token_count]
  );

  await pool.query(`UPDATE chat_sessions SET updated_at=now() WHERE id=$1`, [params.id]);

  return NextResponse.json(rows[0], { status: 201 });
}
