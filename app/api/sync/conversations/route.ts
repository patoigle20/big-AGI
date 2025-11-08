// Next.js App Router route: POST /api/sync/conversations
// Permite autenticación por:
//  - Authorization: Bearer <SYNC_API_KEY>
//  - Authorization: Basic <base64> con credenciales HTTP_BASIC_AUTH_*
import { NextResponse } from 'next/server';
import prisma from '~/server/lib/prisma';

async function getAuthFromReq(req: Request) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return { type: 'bearer', token: auth.slice(7) };
  if (auth.startsWith('Basic ')) return { type: 'basic', token: auth.slice(6) };
  return null;
}

function checkBasic(base64token: string) {
  try {
    const decoded = Buffer.from(base64token, 'base64').toString('utf8'); // "username:password"
    const [user, pass] = decoded.split(':');
    return (
      user === process.env.HTTP_BASIC_AUTH_USERNAME &&
      pass === process.env.HTTP_BASIC_AUTH_PASSWORD
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  try {
    // Auth
    const auth = getAuthFromReq(req);
    let allowed = false;
    if (auth?.type === 'bearer') {
      allowed = auth.token === process.env.SYNC_API_KEY;
    } else if (auth?.type === 'basic') {
      allowed = checkBasic(auth.token);
    }
    if (!allowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const conversation = body.conversation;
    if (!conversation?.id) return NextResponse.json({ error: 'Missing conversation' }, { status: 400 });

    // Owner id: prioridad a env SYNC_OWNER_ID (útil si no hay usuarios implementados)
    const ownerId = process.env.SYNC_OWNER_ID || 'default-owner';

    // Upsert conversation metadata
    const now = new Date(conversation.updated || Date.now());
    await prisma.conversation.upsert({
      where: { id: conversation.id },
      update: {
        title: conversation.userTitle || conversation.autoTitle || null,
        systemPurposeId: conversation.systemPurposeId || 'default',
        updatedAt: now,
        version: conversation.version ?? 1,
        isIncognito: conversation._isIncognito ?? false,
        ownerId,
      },
      create: {
        id: conversation.id,
        ownerId,
        title: conversation.userTitle || conversation.autoTitle || null,
        systemPurposeId: conversation.systemPurposeId || 'default',
        createdAt: new Date(conversation.created || Date.now()),
        updatedAt: now,
        version: conversation.version ?? 1,
        isIncognito: conversation._isIncognito ?? false,
      },
    });

    // Insert messages existentes (si no existen). No hacemos update salvo mejora futura.
    if (Array.isArray(conversation.messages)) {
      for (const m of conversation.messages) {
        try {
          await prisma.message.create({
            data: {
              id: m.id,
              conversationId: conversation.id,
              role: m.role ?? 'user',
              text: m.text ?? null,
              fragmentsJson: m.fragments ? JSON.stringify(m.fragments) : null,
              createdAt: new Date(m.created || Date.now()),
              updatedAt: m.updated ? new Date(m.updated) : undefined,
              isDeleted: m.isDeleted ?? false,
              metaJson: m.meta ? JSON.stringify(m.meta) : null,
            },
          });
        } catch (e) {
          // ignore if already exists or error on insert; se puede mejorar con LWW update
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('sync error', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
