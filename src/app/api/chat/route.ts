import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const formData = await req.formData();
    const message = formData.get('message') as string;
    const image = formData.get('image') as File | null;
    const historyRaw = formData.get('history') as string;
    const history = historyRaw ? JSON.parse(historyRaw) : [];

    // ユーザーの既存タスク・予定を取得してコンテキストに
    const tasks = await prisma.task.findMany({
      where: { userId: session.user.id, status: { not: 'done' } },
      take: 10, orderBy: { dueDate: 'asc' }
    });
    const events = await prisma.eventCache.findMany({
      where: { userId: session.user.id, startTime: { gte: new Date() } },
      take: 10, orderBy: { startTime: 'asc' }
    });

    const tasksContext = tasks.map((t: any) => `- ${t.title}${t.dueDate ? ` (締切: ${t.dueDate.toLocaleDateString()})` : ''}`).join('\n');
    const eventsContext = events.map((e: any) => `- ${e.startTime.toLocaleString()} ${e.title}`).join('\n');

    const systemPrompt = `あなたは「Secretary」というタスク・予定管理アプリのAIアシスタントです。
ユーザーは主に高校生〜大学生で、予定やタスクの管理を手伝ってほしいと考えています。
あなたは以下のことができます：
1. スクリーンショットや画像から予定・タスク情報を抽出する
2. ユーザーとの対話を通じてタスクや予定の整理を助ける
3. タスクの追加を提案する

【重要なルール】
- 親しみやすく、簡潔に回答してください。
- タスクや予定の追加を提案する場合、以下のJSON形式のブロックを回答に含めてください（複数可）：
  [ADD_TASK:{"title":"タスク名","category":"deadline|project|self|misc","dueDate":"2026-03-20T23:59:00"}]
  [ADD_EVENT:{"title":"予定名","startTime":"2026-03-20T14:00:00","location":"場所"}]
- 画像が送られた場合は、その内容から日時・予定・タスクを読み取って提案してください。
- 今日は${new Date().toLocaleDateString('ja-JP')}です。

【ユーザーの現在のタスク】
${tasksContext || 'なし'}

【ユーザーの直近の予定】
${eventsContext || 'なし'}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const chatParts: any[] = [];

    // 会話履歴を組み立て
    const contents: any[] = [
      { role: 'user', parts: [{ text: systemPrompt }] },
      { role: 'model', parts: [{ text: 'はい、Secretaryアシスタントです！予定やタスクの管理をお手伝いしますね。何でも聞いてください 😊' }] },
    ];

    for (const msg of history) {
      contents.push({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }]
      });
    }

    // 今回のメッセージ
    const currentParts: any[] = [];
    if (message) currentParts.push({ text: message });

    if (image) {
      const bytes = await image.arrayBuffer();
      const buffer = Buffer.from(bytes);
      currentParts.push({
        inlineData: { data: buffer.toString('base64'), mimeType: image.type }
      });
      if (!message) currentParts.push({ text: 'この画像の内容を分析して、予定やタスクを提案してください。' });
    }

    contents.push({ role: 'user', parts: currentParts });

    const result = await model.generateContent({ contents });
    const responseText = result.response.text();

    return NextResponse.json({ reply: responseText });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
