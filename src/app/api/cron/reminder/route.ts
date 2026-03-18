import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendEmail } from '@/lib/gmail';

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const now = new Date();
    const thirtyMinsLater = new Date(now.getTime() + 30 * 60000);
    const fortyFiveMinsLater = new Date(now.getTime() + 45 * 60000);

    const upcomingEvents = await prisma.eventCache.findMany({
      where: {
        startTime: {
          gte: thirtyMinsLater,
          lt: fortyFiveMinsLater
        }
      },
      include: {
        user: {
          include: { accounts: { where: { provider: 'google' } } }
        }
      }
    });

    let sentCount = 0;
    for (const event of upcomingEvents) {
      if (!event.user?.email) continue;
      const account = event.user.accounts[0];
      if (!account || !account.access_token) continue;
      
      const emailBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #1a1a1a;">
          <h2>まもなく予定開始です。</h2>
          <div style="background: rgba(244, 162, 97, 0.1); border-left: 4px solid #f4a261; padding: 1rem; margin-top: 1rem;">
            <p style="font-size: 1.25rem; font-weight: bold; margin: 0;">${event.title}</p>
            <p style="margin-top: 0.5rem;">${event.startTime.toLocaleTimeString()} ${event.location ? `(${event.location})` : ''}</p>

            <p style="color: #e63946; font-weight: bold; margin-top: 1.5rem;">⚠️ 本当にこの時刻ですか？元の情報を確認してください。</p>
            
            <a href="${process.env.NEXTAUTH_URL}/dashboard/schedule" style="background:#f4a261; color:#111; padding:10px 20px; text-decoration:none; border-radius:5px; font-weight: bold; display: inline-block; margin-top: 1rem;">元の情報を確認する</a>
          </div>
        </div>
      `;

      await sendEmail(
        account.access_token,
        account.refresh_token || '',
        event.user.email,
        `【30分前】まもなく予定です：${event.title}`,
        emailBody
      );
      sentCount++;
    }
    
    return NextResponse.json({ success: true, sentCount });
  } catch (error: any) {
    console.error('Reminder cron error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
