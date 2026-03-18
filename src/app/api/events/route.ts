import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const events = await prisma.eventCache.findMany({
    where: { userId: session.user.id },
    orderBy: { startTime: 'asc' }
  });
  
  return NextResponse.json({ events });
}
