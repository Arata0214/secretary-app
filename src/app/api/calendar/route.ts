import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { google } from 'googleapis';

// カレンダーからイベントを取得してDBにキャッシュし、返す
export async function GET(_req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: 'google' }
  });

  if (!account?.access_token) {
    // Googleアカウント未連携の場合、DBのキャッシュのみ返す
    const cachedEvents = await prisma.eventCache.findMany({
      where: { userId: session.user.id },
      orderBy: { startTime: 'asc' }
    });
    return NextResponse.json({ events: cachedEvents });
  }

  try {
    const authClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    authClient.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    });

    const calendar = google.calendar({ version: 'v3', auth: authClient });

    // 今日から3ヶ月分のイベントを取得
    const timeMin = new Date();
    timeMin.setHours(0, 0, 0, 0);
    const timeMax = new Date();
    timeMax.setMonth(timeMax.getMonth() + 3);

    const response = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 100,
    });

    const googleEvents = response.data.items || [];

    // DBのキャッシュを更新 (upsert)
    for (const event of googleEvents) {
      if (!event.id || !event.summary) continue;
      
      const isAllDay = !event.start?.dateTime;
      
      let startTime: Date;
      let endTime: Date;
      
      if (isAllDay) {
        // 終日イベント: date フィールド "2026-03-18" → ローカルタイムとして扱う
        const startParts = event.start!.date!.split('-');
        startTime = new Date(+startParts[0], +startParts[1] - 1, +startParts[2], 0, 0, 0);
        
        if (event.end?.date) {
          const endParts = event.end.date.split('-');
          // Google Calendar の終日イベントの end date は「翌日」なので1日引く
          endTime = new Date(+endParts[0], +endParts[1] - 1, +endParts[2] - 1, 23, 59, 59);
        } else {
          endTime = new Date(startTime);
          endTime.setHours(23, 59, 59);
        }
      } else {
        startTime = new Date(event.start!.dateTime!);
        endTime = event.end?.dateTime ? new Date(event.end.dateTime) : new Date(startTime.getTime() + 3600000);
      }
      
      await prisma.eventCache.upsert({
        where: { googleEventId: event.id },
        create: {
          googleEventId: event.id,
          title: event.summary,
          startTime,
          endTime,
          isAllDay,
          location: event.location || '',
          userId: session.user.id
        },
        update: {
          title: event.summary,
          startTime,
          endTime,
          isAllDay,
          location: event.location || '',
        }
      });
    }

    // キャッシュから返す
    const events = await prisma.eventCache.findMany({
      where: { userId: session.user.id },
      orderBy: { startTime: 'asc' }
    });

    return NextResponse.json({ events });
  } catch (error: any) {
    console.error("Calendar GET Error:", error);
    // エラー時もDBのキャッシュを返す
    const cachedEvents = await prisma.eventCache.findMany({
      where: { userId: session.user.id },
      orderBy: { startTime: 'asc' }
    });
    return NextResponse.json({ events: cachedEvents });
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: 'google' }
  });

  if (!account || !account.access_token) {
    return NextResponse.json({ error: 'Google Calendar access not granted' }, { status: 403 });
  }

  try {
    const { title, startTime, location, description } = await req.json();

    const authClient = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    authClient.setCredentials({
      access_token: account.access_token,
      refresh_token: account.refresh_token,
    });

    const calendar = google.calendar({ version: 'v3', auth: authClient });

    const start = new Date(startTime);
    const end = new Date(start.getTime() + 60 * 60 * 1000);

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: {
        summary: title,
        location: location || '',
        description: description || 'Added by Secretary AI',
        start: { dateTime: start.toISOString() },
        end: { dateTime: end.toISOString() },
      }
    });

    try {
      if (response.data.id) {
        await prisma.eventCache.upsert({
          where: { googleEventId: response.data.id },
          create: {
            googleEventId: response.data.id,
            title,
            startTime: start,
            endTime: end,
            location: location || '',
            userId: session.user.id
          },
          update: { title, startTime: start, endTime: end, location: location || '' }
        });
      }
    } catch (dbErr) {
      console.error("Failed to cache event:", dbErr);
    }

    return NextResponse.json({ eventUrl: response.data.htmlLink });
  } catch (error: any) {
    console.error("Calendar API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
