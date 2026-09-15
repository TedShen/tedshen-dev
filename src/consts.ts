// dev.tedshen.link：軟體開發與技術顧問的接案站。
// 社群帳號與 Email 和 hub、grow 共用同一份值，改的時候每站都要改。

export const SITE_NAME = 'Ted ｜ 軟體開發';
export const SITE_URL = 'https://dev.tedshen.link';
export const SITE_DESCRIPTION =
  '沈裕德 Ted，軟體工程師。接網站與前端開發、自動化與資料處理、技術顧問。先把需求講清楚，再談怎麼做、要多久、要多少。';

// 其他站
export const HUB_URL = 'https://tedshen.link';
export const GROW_URL = 'https://grow.tedshen.link';

// 官方聯絡管道
// 軟體線只開 LINE 官方帳號，不開 Threads / IG。LINE 開好後把連結填進來，OfficialChannels 和 CTA 會自動顯示。
export const LINE_URL = '';
export const EMAIL = 'ted@tedshen.link';

// 站主（Person 正本在 tedshen.link/#person，這裡只放顯示用的欄位）
export const PERSON = {
  name: '沈裕德',
  alternateName: 'Ted Shen',
  jobTitle: '軟體工程師',
  image: '/avatar.jpg',
  sameAs: [HUB_URL, GROW_URL, ...(LINE_URL ? [LINE_URL] : [])],
};
