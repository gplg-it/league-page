import { getCached, setCached } from './cache';

const FEEDS = [
	{ sub: 'nfl', label: 'r/nfl' },
	{ sub: 'nottheonion', label: 'r/nottheonion' },
];
const TTL_MS = 2 * 60 * 60 * 1000;
const MAX_TITLE = 170;

// The jokes punch at lineups, never at real victims: skip tragedy and violence headlines.
const OFF_LIMITS = /\b(die[sd]?|dying|death|dead|deadly|kill(?:s|ed|er|ing)?|murder\w*|homicide|shoot\w*|shot|gun\w*|stab\w*|suicide|overdose\w*|cancer|funeral|victims?|massacre|abus\w*|rap(?:e|ed|es|ist)|sexual\w*|assault\w*|child(?:ren)?|kids?|toddler|infant|baby|minor|missing|terror\w*|genocide|hostages?|war|bomb\w*|explosi\w*|crash\w*|fatal\w*|hospitali[sz]ed|disease|pandemic|racis\w*|slurs?|hate)\b/i;

export const isRoastableHeadline = (title) =>
	!!title && title.length <= MAX_TITLE && !OFF_LIMITS.test(title);

const cleanTitle = (title) => title
	.replace(/^\s*\[[^\]]{1,40}\]\s*/, '')
	.replace(/\s+/g, ' ')
	.trim()
	.replace(/[.!?,;:]+$/, '');

const safeUrl = (url) => (typeof url === 'string' && url.startsWith('https://') ? url : null);

const fetchFeed = async ({ sub, label }) => {
	const res = await fetch(`https://www.reddit.com/r/${sub}/top.json?t=week&limit=50&raw_json=1`);
	if (!res.ok) throw new Error(`r/${sub} responded ${res.status}`);
	const json = await res.json();
	const out = [];
	for (const child of json?.data?.children || []) {
		const d = child.data || {};
		if (d.over_18 || d.stickied) continue;
		const title = cleanTitle(d.title || '');
		if (!isRoastableHeadline(title)) continue;
		const permalink = d.permalink ? `https://www.reddit.com${d.permalink}` : null;
		const external = safeUrl(d.url) && !d.url.includes('reddit.com') && !d.is_self ? d.url : null;
		const url = external || permalink;
		if (!url) continue;
		out.push({ title, url, source: label, ts: (d.created_utc || 0) * 1000 });
	}
	return out;
};

/** Top real headlines of the past week, alternating NFL news and absurd world news. */
export const loadRoastHeadlines = async () => {
	const cached = getCached('roastHeadlines_v1');
	if (cached) return cached;
	const results = await Promise.all(FEEDS.map(f => fetchFeed(f).catch(() => [])));
	const merged = [];
	const longest = Math.max(0, ...results.map(r => r.length));
	for (let i = 0; i < longest; i++) {
		for (const list of results) if (list[i]) merged.push(list[i]);
	}
	if (merged.length) setCached('roastHeadlines_v1', merged, TTL_MS);
	return merged;
};
