// 三個內容區的共用設定：名稱、網址、列表頁說明，以及排序與篩選。
import { getCollection, type CollectionEntry } from 'astro:content';

export type SectionKey = 'services' | 'works' | 'notes';

export const SECTIONS: Record<SectionKey, { name: string; path: string; label: string; title: string; intro: string }> = {
  services: {
    name: '服務',
    path: '/services/',
    label: 'SERVICES ｜ 服務',
    title: '能幫你做的事',
    intro: '一個問題一頁：能解決什麼、怎麼做、大概要多久、怎麼開始。沒看到你的情況也沒關係，直接問。',
  },
  works: {
    name: '作品',
    path: '/works/',
    label: 'WORKS ｜ 作品',
    title: '作品與 Demo',
    intro: '自己做、自己在用的東西，以及用常見需求做的示範。客戶案子多半有保密約定，所以這裡不放客戶名稱。',
  },
  notes: {
    name: '技術筆記',
    path: '/notes/',
    label: 'NOTES ｜ 技術筆記',
    title: '實作與技術筆記',
    intro: '實作時遇到的問題和解法。每篇會註明是實機驗證，還是只用模擬測試驗證過。',
  },
};

type AnyEntry = CollectionEntry<'services'> | CollectionEntry<'works'> | CollectionEntry<'notes'>;

/** 只拿非草稿，依 order（小在前）再依日期（新在前）排序 */
export async function getPublished<K extends SectionKey>(key: K): Promise<CollectionEntry<K>[]> {
  const items = (await getCollection(key, ({ data }: AnyEntry) => !data.draft)) as CollectionEntry<K>[];
  return items.sort((a, b) => {
    const ao = a.data.order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.data.order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    return b.data.pubDate.valueOf() - a.data.pubDate.valueOf();
  });
}

export const entryPath = (key: SectionKey, id: string) => `${SECTIONS[key].path}${id}/`;

export const formatDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
