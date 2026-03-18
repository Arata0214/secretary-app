import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60000);

    const upcomingEvents = await prisma.eventCache.findMany({
      where: { userId: session.user.id, startTime: { gte: today, lt: nextWeek } },
      orderBy: { startTime: 'asc' },
      take: 10
    });

    const activeTasks = await prisma.task.findMany({
      where: { userId: session.user.id, status: { not: 'done' } },
      orderBy: { dueDate: 'asc' },
      take: 10
    });

    const eventsText = upcomingEvents.map((e: any) => `- ${e.startTime.toLocaleString()} ${e.title}`).join("\n");
    const tasksText = activeTasks.map((t: any) => `- ${t.title} ${t.dueDate ? `(${t.dueDate.toLocaleDateString()}締切)` : ''}`).join("\n");

    const prompt = `あなたはタスク管理アシスタントです。ユーザーの直近の予定とタスク履歴から、今追加すべきタスクを提案してください。

【最近の予定】
${eventsText || "特になし"}

【既存のタスク】
${tasksText || "特になし"}

以下の3つのカテゴリーから提案を生成してください。
1. 「予定から」: 予定の準備に必要なタスク
2. 「締切から」: 締切から逆算した作業分解
3. 「過去のパターンから」: 今回は過去履歴が少ない場合、一般的な観点から推測してください

必ず以下のJSON形式のみで回答してください。Markdown記法(\`\`\`jsonなど)は絶対に含めず、純粋なJSONテキストのみを返してください。
{
  "suggestions": [
    {
      "category": "予定から",
      "items": [
        { "title": "必要書類の確認", "dueDate": "2026-03-19", "reason": "明日10:00「入学ガイダンス」があります" }
      ]
    }
  ]
}`;

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return NextResponse.json(JSON.parse(cleanJson));
  } catch (error: any) {
    console.error("AI Suggest Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
