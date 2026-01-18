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
  const monthParam = searchParams.get('month'); // "2024-05"

  let startDate: string;
  let endDate: string;

  if (monthParam) {
    const now = new Date();
    startDate = format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd');
    const nextWeekend = endOfWeek(addDays(now, 7), { weekStartsOn: 1 });
    endDate = format(nextWeekend, 'yyyy-MM-dd');
  } else {
    // デフォルト: 当月1日 〜 今週末
    const now = new Date();
    startDate = format(startOfMonth(now), 'yyyy-MM-dd');
    const weekend = endOfWeek(now, { weekStartsOn: 1 });
    endDate = format(weekend, 'yyyy-MM-dd');
  }

  const filters: any[] = [
    { property: 'State', status: { does_not_equal: 'Canceled' } },
    { property: 'Date', date: { on_or_after: startDate } },
    { property: 'Date', date: { on_or_before: endDate } },
  ];

  const queryParams: QueryDatabaseParameters = {
    database_id: DATABASE_ID,
    filter: { and: filters } as any,
    sorts: [{ property: 'Date', direction: 'ascending' }],
  };

  try {
    const response = await notion.databases.query(queryParams);
    const tasks: Task[] = response.results.filter(isFullPage).map((page) => {
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

      return {
        id: page.id,
        name: getProp.title(page, 'Name'),
        date: getProp.date(page, 'Date'),
        state: getProp.status(page, 'State'),
        cat: cats[0] || '',
        subCats: getProp.multiSelect(page, 'SubCat'),
        theme: themeColor,
        summary: getProp.text(page, '要約'),
        url: page.url,
      };
    });

    return NextResponse.json(tasks);
  } catch (error) {
    console.error('Notion API Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 },
    );
  }
}
