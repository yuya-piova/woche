import { Client, isNotionClientError } from '@notionhq/client';
import {
  GetPageResponse,
  QueryDatabaseParameters,
  QueryDatabaseResponse,
} from '@notionhq/client/build/src/api-endpoints'; // v2.xの型パスを維持
import { NextResponse } from 'next/server';

// 【重要】型ガードを自前で定義し、エラーを回避
function isFullPage(response: any): response is GetPageResponse {
  return (
    'properties' in response &&
    'object' in response &&
    response.object === 'page'
  );
}

const notion = new Client({ auth: process.env.NOTION_API_KEY });

// フロントエンドで扱いやすいタスクの型
type CleanTask = {
  id: string;
  title: string;
  date: string | null;
  state: string;
  cat: string;
  subCats: string[];
  theme: string;
  url: string;
};

// Next.jsのAPI Routeハンドラー
export async function GET() {
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!databaseId) {
    return NextResponse.json(
      { error: 'NOTION_DATABASE_ID is missing in environment variables.' },
      { status: 500 }
    );
  }

  // データベースクエリのパラメーター (as any で型チェックをスキップ)
  const queryParams: QueryDatabaseParameters = {
    database_id: databaseId,
    filter: {
      property: 'State',
      status: {
        does_not_equal: 'Done',
      },
    } as any,
    sorts: [
      {
        property: 'Date',
        direction: 'ascending',
      },
    ],
  } as QueryDatabaseParameters; // ★ ここで型を確定

  try {
    const response: QueryDatabaseResponse = await notion.databases.query(
      queryParams
    );

    // データの整形処理
    // 1. isFullPageでフィルタリングし、型を GetPageResponse に絞り込む
    const fullPages = response.results.filter((page): page is GetPageResponse =>
      isFullPage(page)
    );

    // 2. フィルタリング後の配列に対して map を実行
    const tasks: CleanTask[] = fullPages.map((page) => {
      // ★ 修正箇所: フィルタリングで GetPageResponse に絞り込まれているが、
      //    TSが認識しないため、ここでは "any" を使用して型チェックを完全に回避する
      const fullPage: any = page;

      // properties へのアクセスは、pageオブジェクトを "any" と宣言したため、
      // ローカルの赤線は消えるはずです
      const props = fullPage.properties as any;

      // --------------------------------------------------------------------------------------------------
      // ★ エラーが起きている箇所への対処：isFullPageで絞り込んだ後なので、TypeScriptはエラーを出さなくなる
      const cats = props.Cat?.multi_select?.map((c: any) => c.name) || [];
      const isWork = cats.includes('Work');
      const isLife = cats.includes('Life');
      // --------------------------------------------------------------------------------------------------

      let themeColor = 'gray';
      if (isWork) themeColor = 'blue';
      if (isLife) themeColor = 'green';

      const stateName =
        props.State?.select?.name || props.State?.status?.name || 'Unknown';

      return {
        id: page.id,
        title: props.Name?.title[0]?.plain_text || 'No Title',
        date: props.Date?.date?.start || null,
        state: stateName,
        cat: cats[0] || '',
        subCats: props.SubCat?.multi_select?.map((c: any) => c.name) || [],
        theme: themeColor,
        url: fullPage.url,
      };
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Notion API Error:', error);

    if (isNotionClientError(error)) {
      return NextResponse.json(
        { error: `Notion Error: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unknown error occurred while fetching tasks.' },
      { status: 500 }
    );
  }
}
