import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const tasks = await prisma.task.findMany({
    where: { userId: session.user.id },
    orderBy: [
      { status: 'asc' },
      { dueDate: 'asc' }, 
      { priority: 'desc' }
    ]
  });
  return NextResponse.json({ tasks });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const task = await prisma.task.create({
      data: {
        title: data.title,
        description: data.description,
        category: data.category || 'misc',
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        priority: parseInt(data.priority) || 0,
        userId: session.user.id
      }
    });
    return NextResponse.json({ task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = await req.json();
    const { id, ...updateData } = data;
    
    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }
    if (updateData.priority !== undefined && typeof updateData.priority === 'string') {
        updateData.priority = parseInt(updateData.priority);
    }

    const task = await prisma.task.update({
      where: { id },
      data: updateData
    });
    return NextResponse.json({ task });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const existing = await prisma.task.findUnique({ where: { id } });
    if (!existing || existing.userId !== session.user.id) {
      return NextResponse.json({ error: 'Not found or unauthorized' }, { status: 404 });
    }

    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
