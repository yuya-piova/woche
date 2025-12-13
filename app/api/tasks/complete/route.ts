import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

// Notionクライアントの初期化 (環境変数を使用)
const notion = new Client({ auth: process.env.NOTION_API_KEY });
const databaseId = process.env.NOTION_DATABASE_ID;

// Notionのステータスプロパティ名 (データベースの設定に合わせる)
const STATUS_PROPERTY_NAME = 'State';
const DONE_STATUS_VALUE = 'Done'; // または Notion側で設定している「完了」のステータス名

// POSTリクエストハンドラー
export async function POST(request: Request) {
  if (!databaseId) {
    return NextResponse.json({ error: 'Database ID not set' }, { status: 500 });
  }

  try {
    const { id } = await request.json(); // フロントからタスクIDを受け取る

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 }
      );
    }

    // Notion APIを使ってページを更新する
    await notion.pages.update({
      page_id: id,
      properties: {
        [STATUS_PROPERTY_NAME]: {
          // Statusプロパティは 'status' オブジェクトで更新する
          status: {
            name: DONE_STATUS_VALUE,
          },
        },
      } as any,
    });

    return NextResponse.json({ message: 'Task completed successfully' });
  } catch (error) {
    console.error('Error completing task:', error);
    return NextResponse.json(
      { error: 'Failed to complete task on Notion' },
      { status: 500 }
    );
  }
}
