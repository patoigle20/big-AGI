import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function getOwner(req: NextRequest) {
  const h = req.headers.get("authorization") || "";
  try {
    const base64 = h.split(" ")[1] || "";
    const [user] = Buffer.from(base64, "base64").toString().split(":");
    return user || "default";
  } catch {
    return "default";
  }
}

export async function GET(req: NextRequest) {
  const owner = getOwner(req);
  const { rows } = await pool.query(
    `SELECT id, title, created_at, updated_at
     FROM chat_sessions
     WHERE owner=$1
     ORDER BY updated_at DESC`,
    [owner]
  );
  return NextResponse.json(rows);
}

export async function POST(req: NextRequest) {
  const owner = getOwner(req);
  const body = await req.json().catch(() => ({}));
  const title = (body?.title ?? "New chat").toString().slice(0, 80);
  const { rows } = await pool.query(
    `INSERT INTO chat_sessions (owner, title)
     VALUES ($1, $2)
     RETURNING id, title, created_at, updated_at`,
    [owner, title]
  );
  return NextResponse.json(rows[0], { status: 201 });
}
