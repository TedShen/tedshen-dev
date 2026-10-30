// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readdirSync, readFileSync, existsSync } from 'node:fs';

const SITE = 'https://dev.tedshen.link';

// sitemap 的 lastmod：每篇取 frontmatter 的 updated，沒有就取 pubDate；
// 區塊列表頁取該區最新一篇，首頁取全站最新。讓 Google 知道哪些頁面有更新。
function contentDates() {
  const dates = new Map();
  const root = new URL('./src/content/', import.meta.url);
  if (!existsSync(root)) return dates;
  let newest = '';
  for (const section of readdirSync(root)) {
    const dir = new URL(`${section}/`, root);
    let sectionNewest = '';
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.md'))) {
      const text = readFileSync(new URL(file, dir), 'utf8');
      if (/^draft:\s*true/m.test(text)) continue;
      const d = (text.match(/^updated:\s*(\S+)/m) || text.match(/^pubDate:\s*(\S+)/m) || [])[1];
      if (!d) continue;
      dates.set(`${SITE}/${section}/${file.replace(/\.md$/, '')}/`, d);
      if (d > sectionNewest) sectionNewest = d;
    }
    if (sectionNewest) dates.set(`${SITE}/${section}/`, sectionNewest);
    if (sectionNewest > newest) newest = sectionNewest;
  }
  if (newest) dates.set(`${SITE}/`, newest);
  return dates;
}
const LASTMOD = contentDates();

// https://astro.build/config
export default defineConfig({
  site: SITE,
  integrations: [
    sitemap({
      serialize(item) {
        const d = LASTMOD.get(item.url);
        if (d) item.lastmod = new Date(d).toISOString();
        return item;
      },
    }),
  ],
  // GitHub Pages 實際服務的是 /path/，統一尾斜線讓 canonical、sitemap、站內連結一致
  trailingSlash: 'always',
});
