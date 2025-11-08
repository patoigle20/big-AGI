// Next.js App Router route (route.ts) — POST upsert conversation (usa SYNC_API_KEY)
import { NextResponse } from 'next/server';
import prisma from '~/lib/prisma';

async function getApiKeyFromReq(req: Request) {
  const auth = req.headers.get('authorization') || '';
  if (auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

export async function POST(req: Request) {
  const apiKey = await getApiKeyFromReq(req);
  if (!apiKey || apiKey !== process.env.SYNC_API_KEY) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const conversation = body.conversation;
  if (!conversation?.id) return NextResponse.json({ error: 'Missing conversation' }, { status: 400 });

  // Por simplicidad, usamos ownerId = process.env.SYNC_OWNER_ID (útil si no tienes usuarios)
  const ownerId = process.env.SYNC_OWNER_ID || 'default-owner';

  // Upsert conversation meta
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

  // Upsert messages: insert si no existe, si existe se puede actualizar opcionalmente (aquí solo insertamos los nuevos)
  if (Array.isArray(conversation.messages)) {
    for (const m of conversation.messages) {
      try {
        await prisma.message.create({
          data: {
            id: m.id,
            conversationId: conversation.id,
            role: m.role,
            text: m.text ?? null,
            fragmentsJson: m.fragments ? JSON.stringify(m.fragments) : null,
            createdAt: new Date(m.created || Date.now()),
            updatedAt: m.updated ? new Date(m.updated) : undefined,
            isDeleted: m.isDeleted ?? false,
            metaJson: m.meta ? JSON.stringify(m.meta) : null,
          },
        });
      } catch (e) {
        // si ya existe, ignoramos; para un producto más completo podrías hacer update con LWW
      }
    }
  }

  return NextResponse.json({ ok: true });
}
