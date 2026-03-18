import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { auth } from '@/lib/auth';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const bytes = await image.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    
    const prompt = `
画像から予定に関する情報を抽出し、必ず以下のJSONフォーマットのみで出力してください。
Markdownのバッククォートでの囲み(\`\`\`jsonなど)は不要です。純粋なJSONテキストのみを返してください。
{
  "title": "予定のタイトル",
  "startTime": "2026-03-18T14:50:00+09:00", // ISO 8601形式。画像に日付がない場合は、時間がわかる場合は本日の日付を使用
  "location": "場所（あれば）"
}`;

    const imageParts = [
      {
        inlineData: {
          data: buffer.toString("base64"),
          mimeType: image.type,
        },
      },
    ];

    const result = await model.generateContent([prompt, ...imageParts]);
    const responseText = result.response.text().trim();
    
    const cleanJson = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanJson);

    return NextResponse.json({ data: parsed });
  } catch (error: any) {
    console.error("Gemini Error:", error);
    return NextResponse.json({ error: error.message || 'Failed to extract schedule' }, { status: 500 });
  }
}
