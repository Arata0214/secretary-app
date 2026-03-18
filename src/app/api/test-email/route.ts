import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/gmail';

export async function POST(_req: Request) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: 'google' }
  });

  if (!account?.access_token) {
    return NextResponse.json({ error: 'Gmail access not granted. Make sure you have granted Gmail permissions.' }, { status: 403 });
  }

  const dummyDate = new Date().toLocaleDateString('ja-JP', { year:'numeric', month:'long', day:'numeric', weekday:'short' });

  const emailBody = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
      <div style="background: linear-gradient(135deg, #457b9d, #2a9d8f); padding: 2rem; border-radius: 12px 12px 0 0; color: white; text-align: center;">
        <h1 style="margin: 0; font-size: 1.5rem;">🌅 おはようございます！</h1>
        <p style="margin: 0.5rem 0 0; opacity: 0.9;">${dummyDate} の予定とタスクです</p>
      </div>
      <div style="padding: 1.5rem; background: #fdfdfd; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 12px 12px;">
        
        <h2 style="color: #457b9d; border-bottom: 2px solid #457b9d; padding-bottom: 0.5rem;">⏰ 今日の予定</h2>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: #f0f8ff; border-left: 4px solid #457b9d; border-radius: 4px;">
            <strong>10:00</strong> ダミー会議（Zoom）
          </li>
          <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: #fff4e6; border-left: 4px solid #f4a261; border-radius: 4px;">
            <strong style="color: #e63946;">⚠️ 14:50</strong> 授業 ← <em>時刻を確認してください</em>
          </li>
          <li style="padding: 0.75rem; background: #f0f8ff; border-left: 4px solid #457b9d; border-radius: 4px;">
            <strong>18:00</strong> ダミーミーティング
          </li>
        </ul>

        <h2 style="color: #2a9d8f; border-bottom: 2px solid #2a9d8f; padding-bottom: 0.5rem; margin-top: 1.5rem;">✅ 今日やるタスク</h2>
        <ul style="list-style: none; padding: 0;">
          <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: #fff5f5; border-left: 4px solid #e63946; border-radius: 4px;">
            🔴 <strong>【締切】ダミーレポート提出</strong> <span style="color: #e63946; font-size: 0.85rem;">23:59まで</span>
          </li>
          <li style="padding: 0.75rem; margin-bottom: 0.5rem; background: #fffbeb; border-left: 4px solid #f59e0b; border-radius: 4px;">
            🟡 ダミー資料作成
          </li>
          <li style="padding: 0.75rem; background: #f0fdf4; border-left: 4px solid #2a9d8f; border-radius: 4px;">
            🟢 研究メモの整理
          </li>
        </ul>

        <div style="text-align: center; margin-top: 2rem; padding-top: 1rem; border-top: 1px solid #e5e5e5;">
          <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" style="background: linear-gradient(135deg, #457b9d, #2a9d8f); color: white; padding: 0.75rem 2rem; text-decoration: none; border-radius: 999px; font-weight: bold; display: inline-block;">
            ダッシュボードを開く
          </a>
        </div>

        <p style="text-align: center; font-size: 0.8rem; color: #999; margin-top: 1rem;">
          このメールは Secretary テスト送信機能からお送りしました
        </p>
      </div>
    </div>
  `;

  try {
    await sendEmail(
      account.access_token,
      account.refresh_token || '',
      session.user.email,
      `【テスト送信】${dummyDate}の日程とタスク`,
      emailBody
    );
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Test email error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
