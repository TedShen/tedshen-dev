// dev.tedshen.link：軟體開發與技術顧問的接案站。
// Email 和 LINE 是這條線的聯絡方式；社群帳號和 Email 的正本在 tedshen-hub 的 consts.ts。

export const SITE_NAME = 'Ted ｜ 軟體開發';
export const SITE_URL = 'https://dev.tedshen.link';
export const SITE_DESCRIPTION =
  '沈裕德 Ted，十年以上軟體工程師，機器視覺、工業自動化與資安軟體出身。接自動化設備軟體、系統串接（POS、LINE 官方帳號、SharePoint）、網站開發與技術顧問。';

// 其他站與作品
export const HUB_URL = 'https://tedshen.link';
export const GROW_URL = 'https://grow.tedshen.link';
export const RESUME_URL = 'https://tedshen.github.io/';
export const KINDMAP_URL = 'https://kindmap.link/';

// 官方聯絡管道
// 軟體線只開 LINE 官方帳號，不開 Threads / IG。
export const LINE_URL = 'https://lin.ee/XB3OxbQ';
export const EMAIL = 'ted@tedshen.link';

// 站主（Person 正本在 tedshen.link/#person，這裡只放顯示用的欄位）
export const PERSON = {
  name: '沈裕德',
  alternateName: 'Ted Shen',
  jobTitle: '軟體工程師',
  image: '/avatar.jpg',
  sameAs: [HUB_URL, GROW_URL, RESUME_URL, ...(LINE_URL ? [LINE_URL] : [])],
};
