import { Client } from '@notionhq/client';
import { NextResponse } from 'next/server';

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// POSTリクエストハンドラー
export async function POST(request: Request) {
  try {
    const { id, name, status, date } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: 'Task ID is required' },
        { status: 400 },
      );
    }

    const properties: any = {};

    // 1. タイトル（名前）更新の処理
    if (name !== undefined) {
      properties['Name'] = {
        title: [
          {
            text: {
              content: name,
            },
          },
        ],
      };
    }

    // 2. ステータス変更の処理
    if (status) {
      properties['State'] = {
        status: {
          name: status,
        },
      };
    }

    // 3. 日付変更の処理
    if (date !== undefined) {
      if (date === 'null' || date === null || date === '') {
        // 日付をクリアする場合
        properties['Date'] = { date: null };
      } else {
        properties['Date'] = {
          date: {
            start: date, // 期待される形式: YYYY-MM-DD
          },
        };
      }
    }

    // 4. Notionのページを更新
    if (Object.keys(properties).length > 0) {
      await notion.pages.update({
        page_id: id,
        properties: properties,
      });
    }

    return NextResponse.json({ message: 'Task updated successfully' });
  } catch (error: any) {
    console.error('Error updating task:', error);
    // 詳細なエラー内容を返却するように変更
    return NextResponse.json(
      { error: error.message || 'Failed to update task on Notion' },
      { status: 500 },
    );
  }
}
