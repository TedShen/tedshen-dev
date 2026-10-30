// 內容集合：服務頁、技術筆記、作品。
// 一篇一個 Markdown 檔，放在 src/content/<集合>/<slug>.md；檔名就是網址的 slug。
// draft: true 的不會進 build、sitemap 和列表。
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const base = z.object({
  title: z.string(),
  /** 搜尋結果與分享的描述，約 80～120 字 */
  description: z.string(),
  /** 列表與 <title> 用的短標題；沒填就用 title */
  shortTitle: z.string().optional(),
  pubDate: z.coerce.date(),
  updated: z.coerce.date().optional(),
  tags: z.array(z.string()).default([]),
  draft: z.boolean().default(false),
  /** 列表排序，數字小的在前；沒填依日期新到舊 */
  order: z.number().optional(),
  /** 分享圖，相對路徑；沒填用全站 og.jpg */
  image: z.string().optional(),
});

/** 服務頁：一個問題一頁，寫清楚能解決什麼、怎麼做、怎麼開始 */
const services = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/services' }),
  schema: base,
});

/** 技術筆記：實作紀錄，搜這些字的人多半是潛在案主 */
const notes = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/notes' }),
  schema: base,
});

/** 作品：自有作品與可公開的案例；不寫客戶名稱 */
const works = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/works' }),
  schema: base.extend({
    /** 作品性質：自有作品、案例（已去識別化） */
    kind: z.enum(['自有作品', '案例']).default('自有作品'),
    /** 用到的技術 */
    stack: z.array(z.string()).default([]),
    /** 公開網址或原始碼位置 */
    link: z.string().optional(),
    linkLabel: z.string().optional(),
    /** 封面圖，放在 public/works/ */
    cover: z.string().optional(),
    coverAlt: z.string().optional(),
  }),
});

export const collections = { services, notes, works };
