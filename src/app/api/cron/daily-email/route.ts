import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/gmail';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const users = await prisma.user.findMany({
      include: {
        accounts: { where: { provider: 'google' } },
        tasks: {
          where: {
            status: { not: 'done' },
            dueDate: {
              gte: new Date(new Date().setHours(0,0,0,0)),
              lt: new Date(new Date().setHours(23,59,59,999))
            }
          }
        }
      }
    });

    for (const user of users) {
      const account = user.accounts[0];
      if (!account || !account.access_token || !user.email) continue;
      
      const emailBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2>おはようございます。今日のスケジュールです。</h2>
          
          <h3 style="border-bottom: 2px solid #2a9d8f; padding-bottom: 0.5rem; color: #1d3557;">✅ 今日やるタスク</h3>
          <ul style="list-style: none; padding: 0;">
            ${user.tasks.map((t: any) => `
              <li style="margin-bottom: 0.5rem; padding: 0.5rem; background: #fdfdfd; border: 1px solid #ddd; border-radius: 4px;">
                <strong>${t.title}</strong>
                ${t.dueDate ? `<span style="color: #e63946; font-size: 0.8rem; margin-left: 0.5rem;">(締切: ${t.dueDate.toLocaleTimeString()})</span>` : ''}
              </li>
            `).join('')}
            ${user.tasks.length === 0 ? '<li>今日のタスクはありません。</li>' : ''}
          </ul>
          
          <div style="margin-top: 2rem; text-align: center;">
            <a href="${process.env.NEXTAUTH_URL}/dashboard" style="background:#457b9d; color:white; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight: bold; display: inline-block;">ダッシュボードを開く</a>
          </div>
        </div>
      `;

      await sendEmail(
        account.access_token,
        account.refresh_token || '',
        user.email,
        `【今日やること】${new Date().toLocaleDateString('ja-JP')}の予定とタスク`,
        emailBody
      );
    }
    return NextResponse.json({ success: true, sentCount: users.length });
  } catch (error: any) {
    console.error('Cron email error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
