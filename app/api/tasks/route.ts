import { Client, isNotionClientError } from '@notionhq/client';
import {
  GetPageResponse,
  QueryDatabaseParameters,
} from '@notionhq/client/build/src/api-endpoints';
import { NextResponse } from 'next/server';
import {
  startOfMonth,
  endOfMonth,
  endOfWeek,
  parseISO,
  format,
  subMonths,
  addDays,
} from 'date-fns';

const notion = new Client({ auth: process.env.NOTION_API_KEY });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

type PageObjectResponse = Extract<GetPageResponse, { properties: any }>;

export type Task = {
  id: string;
  name: string;
  date: string | null;
  state: string;
  cat: string;
  subCats: string[];
  catTag: string[];
  theme: string;
  summary: string;
  url: string;
};

function isFullPage(response: unknown): response is PageObjectResponse {
  return (
    typeof response === 'object' &&
    response !== null &&
    'properties' in response &&
    (response as any).object === 'page'
  );
}

const getProp = {
  title: (page: PageObjectResponse, propName: string): string => {
    const prop = (page.properties as any)[propName];
    return prop?.type === 'title' && prop.title.length > 0
      ? prop.title[0].plain_text
      : 'No Title';
  },
  text: (page: PageObjectResponse, propName: string): string => {
    const prop = (page.properties as any)[propName];
    return prop?.type === 'rich_text' && prop.rich_text.length > 0
      ? prop.rich_text[0].plain_text
      : '';
  },
  date: (page: PageObjectResponse, propName: string): string | null => {
    const prop = (page.properties as any)[propName];
    return prop?.type === 'date' ? (prop.date?.start ?? null) : null;
  },
  status: (page: PageObjectResponse, propName: string): string => {
    const prop = (page.properties as any)[propName];
    if (prop?.type === 'status') return prop.status?.name ?? 'Unknown';
    if (prop?.type === 'select') return prop.select?.name ?? 'Unknown';
    return 'Unknown';
  },
  multiSelect: (page: PageObjectResponse, propName: string): string[] => {
    const prop = (page.properties as any)[propName];
    return prop?.type === 'multi_select'
      ? prop.multi_select.map((item: any) => item.name)
      : [];
  },
  select: (page: PageObjectResponse, propName: string): string => {
    const prop = (page.properties as any)[propName];
    return prop?.type === 'select' ? (prop.select?.name ?? '') : '';
  },
};

export async function GET(req: Request) {
  if (!DATABASE_ID)
    return NextResponse.json({ error: 'Database ID missing' }, { status: 500 });

  const { searchParams } = new URL(req.url);
  const monthParam = searchParams.get('month');
  const fiscalYearParam = searchParams.get('fiscalYear');
  const catTagParam = searchParams.get('catTag'); // 追加: タグ指定パラメータ

  let baseFilter: any;
  const now = new Date();

  // 1. ベースとなる期間/状態フィルターの構築
  if (fiscalYearParam) {
    const fy = parseInt(fiscalYearParam, 10);
    const startDate = `${fy}-04-01`;
    const endDate = `${fy + 1}-03-31`;

    baseFilter = {
      or: [
        {
          and: [
            { property: 'State', status: { does_not_equal: 'Done' } },
            { property: 'State', status: { does_not_equal: 'Canceled' } },
          ],
        },
        {
          and: [
            { property: 'Date', date: { on_or_after: startDate } },
            { property: 'Date', date: { on_or_before: endDate } },
          ],
        },
      ],
    };
  } else {
    let startDate: string;
    let endDate: string;
    if (monthParam) {
      const baseDate = parseISO(`${monthParam}-01`);
      startDate = format(startOfMonth(baseDate), 'yyyy-MM-dd');
      endDate = format(endOfMonth(baseDate), 'yyyy-MM-dd');
    } else {
      startDate = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
      const nextWeekend = endOfWeek(addDays(now, 7), { weekStartsOn: 1 });
      endDate = format(nextWeekend, 'yyyy-MM-dd');
    }
    baseFilter = {
      and: [
        { property: 'State', status: { does_not_equal: 'Canceled' } },
        { property: 'Date', date: { on_or_after: startDate } },
        { property: 'Date', date: { on_or_before: endDate } },
      ],
    };
  }

  // 2. タグフィルターの結合 (AND条件)
  let finalFilter = baseFilter;

  if (catTagParam) {
    finalFilter = {
      and: [
        baseFilter,
        {
          property: 'CatTag',
          multi_select: { contains: catTagParam }, // "PRJ"を含むものを抽出
        },
      ],
    };
  }

  // 3. 全件取得ループ処理 (100件超え対策)
  let allResults: any[] = [];
  let hasMore = true;
  let cursor: string | undefined = undefined;

  try {
    while (hasMore) {
      const queryParams: QueryDatabaseParameters = {
        database_id: DATABASE_ID,
        filter: finalFilter,
        sorts: [{ property: 'Date', direction: 'ascending' }],
        start_cursor: cursor,
        page_size: 100,
      };

      const response = await notion.databases.query(queryParams);
      allResults = [...allResults, ...response.results];
      hasMore = response.has_more;
      cursor = response.next_cursor ?? undefined;
    }

    const tasks: Task[] = allResults.filter(isFullPage).map((page) => {
      // マッピング処理（変更なし）
      const cats = getProp.multiSelect(page, 'Cat');
      if (cats.length === 0) {
        const sCat = getProp.select(page, 'Cat');
        if (sCat) cats.push(sCat);
      }
      const themeColor = cats.includes('Work')
        ? 'blue'
        : cats.includes('Life')
          ? 'green'
          : 'gray';

      let catTags = getProp.multiSelect(page, 'CatTag');
      if (catTags.length === 0) {
        const sTag = getProp.select(page, 'CatTag');
        if (sTag) catTags.push(sTag);
      }

      return {
        id: page.id,
        name: getProp.title(page, 'Name'),
        date: getProp.date(page, 'Date'),
        state: getProp.status(page, 'State'),
        cat: cats[0] || '',
        subCats: getProp.multiSelect(page, 'SubCat'),
        catTag: catTags,
        theme: themeColor,
        summary: getProp.text(page, '要約'),
        url: page.url,
      };
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Notion API Error:', error);
    if (isNotionClientError(error)) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
