// app/api/tasks/create/route.ts
import { NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID!;

export async function POST(req: Request) {
  const { name, date } = await req.json();
  try {
    // プロパティを構築
    const properties: any = {
      Name: {
        title: [{ text: { content: name || '新規タスク' } }],
      },
      State: {
        status: { name: 'INBOX' },
      },
      Cat: {
        multi_select: [{ name: 'Work' }],
      },
      SubCat: {
        multi_select: [{ name: 'Task' }],
      },
    };
    // 日付がある場合のみ追加
    if (date) {
      properties['Date'] = {
        date: { start: date },
      };
    }

    const response = await notion.pages.create({
      parent: { database_id: databaseId },
      properties: properties,
    });

    return NextResponse.json({ id: response.id });
  } catch (error: any) {
    console.error('Detailed Notion Error:', error);
    return NextResponse.json(
      {
        error: error.message,
        detail: error.body ? JSON.parse(error.body).message : 'No detail',
      },
      { status: 500 },
    );
  }
}
