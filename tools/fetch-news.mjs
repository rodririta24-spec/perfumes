// Junta titulares de lanzamientos de perfumes desde Google News (RSS) y escribe news.json.
// Lo corre una vez por día la GitHub Action .github/workflows/news.yml.
import { writeFileSync } from 'node:fs';

const EN = 'hl=en-US&gl=US&ceid=US:en';
const ES = 'hl=es-419&gl=AR&ceid=AR:es-419';
const QUERIES = [
  { q: '"new fragrance" OR "fragrance launch" OR "launches fragrance" when:7d', loc: EN },
  { q: "men's fragrance launch OR new cologne when:14d", loc: EN },
  { q: 'Lattafa OR Armaf OR "French Avenue" OR Afnan OR "Maison Alhambra" OR Rasasi OR "Al Haramain" new fragrance when:30d', loc: EN },
  { q: 'niche fragrance new release OR new perfume launch when:14d', loc: EN },
  { q: 'nuevo perfume lanzamiento OR nueva fragancia when:14d', loc: ES },
];
const MAX_ITEMS = 80;

// Solo lanzamientos: el título tiene que hablar de lanzar/presentar algo nuevo y no ser oferta, ranking ni nota de dupes.
const LAUNCH = /\b(launch(es|ed|ing)?|unveil(s|ed)?|debut(s|ed)?|introduc(es|ed|ing)|releas(es|ed)|reveals?|drops|new (fragrance|scent|perfume|cologne|eau de)|lanza(miento|ron|rá|)?|lanzó|presenta(ron)?|estrena|nuevo perfume|nueva fragancia|nueva colonia)\b/i;
const NOISE = /\b(deal|deals|sale|discount|half price|cheap|dupes?|bargain|offer|black friday|amazon|boots|superdrug|best|favou?rites?|top \d+|\d+ (best|favorite)|ranking|oferta|descuento|rebaja|barat[oa]s?|los mejores|las mejores|que (dura|huele)|clon(es)?)\b|[£€$]\s?\d/i;
const isLaunch = (title) => LAUNCH.test(title) && !NOISE.test(title);

const decode = (s) => s
  .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
  .replace(/&amp;/g, '&')
  .trim();
const tag = (xml, name) => decode(xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`))?.[1] ?? '');

async function fetchQuery({ q, loc }) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&${loc}`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 perfumes-news' } });
  if (!res.ok) throw new Error(`${res.status} en ${q}`);
  const xml = await res.text();
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map(([, item]) => {
    const source = tag(item, 'source');
    let title = tag(item, 'title');
    if (source && title.endsWith(` - ${source}`)) title = title.slice(0, -(source.length + 3));
    return { title, link: tag(item, 'link'), source, date: new Date(tag(item, 'pubDate')).toISOString(), lang: loc === ES ? 'es' : 'en' };
  });
}

const all = [];
for (const query of QUERIES) {
  try {
    all.push(...await fetchQuery(query));
  } catch (e) {
    console.error('Falló una búsqueda:', e.message);
  }
}
if (!all.length) {
  console.error('No se obtuvo ningún titular; no se toca news.json.');
  process.exit(1);
}

const seen = new Set();
const items = all
  .filter((x) => x.title && x.link && isLaunch(x.title))
  .sort((a, b) => b.date.localeCompare(a.date))
  .filter((x) => {
    const k = x.title.toLowerCase().replace(/[^a-z0-9áéíóúñ]+/g, ' ').trim();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  })
  .slice(0, MAX_ITEMS);

writeFileSync('news.json', JSON.stringify({ updatedAt: new Date().toISOString(), items }, null, 2) + '\n');
console.log(`${items.length} titulares → news.json`);
