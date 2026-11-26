import { leagueID } from '$lib/utils/leagueInfo';
import { getCached, setCached } from './cache';

const API = 'https://api.sleeper.app/v1';
const TTL_MS = 2 * 60 * 60 * 1000;

const getJSON = async (url) => {
	const res = await fetch(url, { compress: true });
	if (!res.ok) throw new Error(`Sleeper request failed (${res.status}): ${url}`);
	return res.json();
};

const trimUser = (u) => ({
	user_id: u.user_id,
	display_name: u.display_name,
	avatar: u.avatar || null,
	team_name: u.metadata?.team_name || null,
	custom_avatar: u.metadata?.avatar || null,
});

const trimRoster = (r) => ({
	roster_id: r.roster_id,
	owner_id: r.owner_id,
	settings: {
		wins: r.settings?.wins || 0,
		losses: r.settings?.losses || 0,
		ties: r.settings?.ties || 0,
		fpts: (r.settings?.fpts || 0) + (r.settings?.fpts_decimal || 0) / 100,
	},
});

const trimMatchup = (m) => ({
	roster_id: m.roster_id,
	matchup_id: m.matchup_id,
	points: m.custom_points ?? m.points ?? 0,
	starters: m.starters || [],
	starters_points: m.starters_points || [],
	players_points: m.players_points || {},
});

const trimTransaction = (t) => ({
	type: t.type,
	roster_ids: t.roster_ids,
	adds: t.adds,
	drops: t.drops,
});

const fetchSeasonChain = async () => {
	const seasons = [];
	let id = leagueID;
	while (id && id !== '0') {
		const [league, rosters, users, bracket] = await Promise.all([
			getJSON(`${API}/league/${id}`),
			getJSON(`${API}/league/${id}/rosters`),
			getJSON(`${API}/league/${id}/users`),
			getJSON(`${API}/league/${id}/winners_bracket`).catch(() => null),
		]);
		const final = Array.isArray(bracket) ? bracket.find(m => m.p === 1) : null;
		seasons.push({
			year: parseInt(league.season),
			leagueID: id,
			status: league.status,
			league,
			champion: league.status === 'complete' ? final?.w ?? null : null,
			rosters: (rosters || []).map(trimRoster),
			users: (users || []).map(trimUser),
		});
		id = league.previous_league_id;
	}
	return seasons;
};

const fetchScoredWeeks = async (season, maxWeek) => {
	const weekNums = Array.from({ length: maxWeek }, (_, i) => i + 1);
	const [matchups, transactions] = await Promise.all([
		Promise.all(weekNums.map(w => getJSON(`${API}/league/${season.leagueID}/matchups/${w}`).catch(() => []))),
		Promise.all(weekNums.map(w => getJSON(`${API}/league/${season.leagueID}/transactions/${w}`).catch(() => []))),
	]);
	const weeks = {};
	const txByWeek = {};
	weekNums.forEach((w, i) => {
		const list = (matchups[i] || []).map(trimMatchup);
		if (list.some(m => m.points > 0)) weeks[w] = list;
		txByWeek[w] = (transactions[i] || []).filter(t => t.status === 'complete').map(trimTransaction);
	});
	return { weeks, transactions: txByWeek };
};

/**
 * Everything the weekly roast needs: the Sleeper season chain (for 2011-present history)
 * plus every completed week of the season being roasted.
 */
export const loadWeeklyRoastData = async () => {
	const nflState = await getJSON(`${API}/state/nfl`);
	const cacheKey = `weeklyRoast_v1_${nflState.league_season}_${nflState.week}_${nflState.season_type}`;
	const cached = getCached(cacheKey);
	if (cached) return cached;

	const seasons = await fetchSeasonChain();

	let roast = null;
	for (const season of seasons.slice(0, 2)) {
		const inSeason = String(nflState.league_season) === String(season.year)
			&& ['regular', 'post'].includes(nflState.season_type);
		// During the season the current week is still being played, so only earlier weeks are final.
		const maxWeek = inSeason ? Math.min(Math.max(0, nflState.week - 1), 18) : 18;
		if (maxWeek === 0 || ['pre_draft', 'drafting'].includes(season.status)) continue;
		const scored = await fetchScoredWeeks(season, maxWeek);
		if (Object.keys(scored.weeks).length) {
			roast = { season, ...scored };
			break;
		}
	}

	const data = {
		fetchedAt: Date.now(),
		nflState: {
			season: nflState.season,
			league_season: nflState.league_season,
			week: nflState.week,
			season_type: nflState.season_type,
		},
		roastSeason: roast ? {
			year: roast.season.year,
			leagueID: roast.season.leagueID,
			rosterPositions: roast.season.league.roster_positions || [],
			playoffStart: roast.season.league.settings?.playoff_week_start || 15,
			playoffTeams: roast.season.league.settings?.playoff_teams || 6,
			weeks: roast.weeks,
			transactions: roast.transactions,
		} : null,
		seasons: seasons.map(({ league, ...rest }) => rest),
	};

	setCached(cacheKey, data, TTL_MS);
	return data;
};
