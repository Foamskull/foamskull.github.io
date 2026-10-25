import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const outPath = join(root, 'data', 'trailers.json');
const LIMIT = 18;

const CHANNELS = [
  ['Sony Pictures', 'UCz97F7dMxBNOfGYu3rx8aCw', 1],
  ['Universal Pictures', 'UCq0OueAsdxH6b8nyAspwViw', 1],
  ['Paramount Pictures', 'UCF9imwPMSGz4Vq1NiTWCC7g', 1],
  ['Warner Bros.', 'UCjmJDM5pRKbUlVIzDYYWb6g', 1],
  ['Marvel', 'UCvC4D8onUfXzvjTOM-dBfEA', 1],
  ['A24', 'UCuPivVjnfNo4mb3Oog_frZg', 1],
  ['Lionsgate Movies', 'UCJ6nMHaJPZvsJ-HmUmj1SeA', 1],
  ['Searchlight Pictures', 'UCor9rW6PgxSQ9vUPWQdnaYQ', 1],
  ['Focus Features', 'UCU4SM3j_9TNWaSu8KdGV50g', 1],
  ['Pixar', 'UC_IRYSp4auq7hKLvziWVH6w', 1],
  ['Illumination', 'UCq7OHvWO6Z3u-LztFdrcU-g', 1],
  ['Amazon MGM Studios', 'UCf5CjDJvsFvtVIhkfmKAwAA', 1],
  ['IGN Movie Trailers', 'UCWJ5MfdQZ6jXbF5gYuSAf5Q', 2],
  ['Rotten Tomatoes Trailers', 'UCi8e0iOVk1fEOogdfu4YgfA', 3],
  ['Rotten Tomatoes Indie', 'UCLyYEq4ODlw3OD9qhGqwimw', 3]
];

const TRAILER = /\b(teaser|trailer)\b/i;
const DROP = /\b(review|reaction|breakdown|explained|easter eggs?|recap|commentary|interview|behind the scenes|full movie|clips?|featurette|soundtrack|lyrics?|music video|podcast|honest trailer|tv spots?|unboxing|ranking|theor(?:y|ies)|spoiler|gameplay|dlc|date announcement|full short|short film|animated short)\b/i;
const TV = /\b(seasons?|s\d{1,2}\s*e\d{1,2}|episodes?|mini-?series|limited series|tv shows?|tv series|web series|docu-?series|on disney\+|disney\s*\+|new episodes|mid-?season)\b/i;

function decode(value) {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, num) => String.fromCodePoint(Number(num)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function grab(chunk, tag) {
  const match = chunk.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i'));
  return match ? decode(match[1]) : '';
}

function entries(xml) {
  return xml.split(/<entry\b/i).slice(1).map(chunk => ({
    id: grab(chunk, 'yt:videoId'),
    title: grab(chunk, 'title'),
    published: grab(chunk, 'published')
  })).filter(item => item.id && item.title && item.published);
}

export function filmName(title) {
  let name = title.replace(/\s+/g, ' ').trim();
  name = name.replace(/\((?:19|20)\d{2}\)/g, '');
  name = name.replace(/\((?:hd|4k|ultra hd)\)/gi, '');
  const lead = name.match(/^(?:official\s+)?(?:new\s+|final\s+|exclusive\s+)?(?:teaser\s+trailer|trailer|teaser)\b[\s:|\-–—]*/i);
  if (lead) name = name.slice(lead[0].length);
  const cut = name.search(/\b(?:official\s+|new\s+|final\s+|exclusive\s+|us\s+|international\s+)?(?:teaser\s+trailer|official\s+trailer|trailer|teaser)\b/i);
  if (cut > 0) name = name.slice(0, cut);
  name = name.replace(/\s*(?:\||\u2013|\u2014|\s-\s)\s*official\b.*$/i, '');
  name = name.replace(/\b(?:exclusive|re-?release|redband|subtitled|dubbed)\b/gi, '');
  name = name.replace(/#\s*\d+\b/g, '');
  name = name.replace(/\s*(?:\||\u2013|\u2014|\s-\s)\s*$/u, '');
  name = name.replace(/\s{2,}/g, ' ').replace(/^[\s|\-–—:]+|[\s|\-–—:]+$/gu, '').trim();
  return name;
}

function usable(name) {
  const key = norm(name);
  if (key.length < 3) return false;
  return !/^(tomorrow|coming soon|new trailer|teaser|trailer|official|hd)$/.test(key);
}

function norm(name) {
  return name.toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/\b(19|20)\d{2}\b/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function keep(item) {
  const title = item.title;
  if (!TRAILER.test(title) || DROP.test(title) || TV.test(title)) return false;
  if (/\btrailers\b/i.test(title)) return false;
  return usable(filmName(title));
}

async function pull(channel, id, rank) {
  const url = `https://www.youtube.com/feeds/videos.xml?channel_id=${id}`;
  const response = await fetch(url, {
    headers: { 'user-agent': 'NowShowingTrailers/1.0' },
    signal: AbortSignal.timeout(20000)
  });
  if (!response.ok) throw new Error(`${response.status}`);
  const xml = await response.text();
  return entries(xml).map(item => ({ ...item, channel, rank }));
}

async function existing() {
  try {
    const parsed = JSON.parse(await readFile(outPath, 'utf8'));
    return Array.isArray(parsed.trailers) ? parsed.trailers : [];
  } catch {
    return [];
  }
}

const settled = await Promise.all(CHANNELS.map(async ([channel, id, rank]) => {
  try {
    const items = await pull(channel, id, rank);
    console.log(`${channel}: ${items.length} videos`);
    return items;
  } catch (error) {
    console.warn(`${channel}: skipped (${error.message})`);
    return [];
  }
}));

const found = settled.flat().filter(keep);
found.sort((a, b) => b.published.localeCompare(a.published) || a.rank - b.rank);

const seenIds = new Set();
const seenNames = new Set();
const trailers = [];
for (const item of found) {
  const name = filmName(item.title);
  const key = norm(name);
  if (!key || seenIds.has(item.id) || seenNames.has(key)) continue;
  seenIds.add(item.id);
  seenNames.add(key);
  trailers.push({
    id: item.id,
    title: item.title,
    name,
    published: item.published,
    channel: item.channel
  });
  if (trailers.length >= LIMIT) break;
}

const previous = await existing();
if (trailers.length < 8 && previous.length > trailers.length) {
  console.log(`Only ${trailers.length} trailers fetched. Keeping ${previous.length} existing items.`);
  process.exit(0);
}

await mkdir(dirname(outPath), { recursive: true });
const payload = {
  updated: new Date().toISOString(),
  source: 'YouTube RSS from film studios, IGN Movie Trailers, and Rotten Tomatoes Trailers',
  trailers
};
await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);
console.log(`Wrote ${trailers.length} trailers`);
for (const item of trailers) console.log(`- ${item.published.slice(0, 10)}  ${item.name}  [${item.channel}]  ${item.title}`);
