import { yahooSeasonStandings } from './yahooHistoricalData';

export const FIRST_SEASON = 2011;

const CDN = 'https://sleepercdn.com';
const NON_STARTING = new Set(['BN', 'IR', 'TAXI']);
const ELIGIBLE = {
	QB: ['QB'], RB: ['RB'], WR: ['WR'], TE: ['TE'], K: ['K'], DEF: ['DEF'],
	FLEX: ['RB', 'WR', 'TE'], WRRB_FLEX: ['RB', 'WR'], REC_FLEX: ['WR', 'TE'],
	SUPER_FLEX: ['QB', 'RB', 'WR', 'TE'],
	DL: ['DL'], LB: ['LB'], DB: ['DB'], IDP_FLEX: ['DL', 'LB', 'DB'],
};
const SLOT_LABEL = { FLEX: 'FLEX', SUPER_FLEX: 'SUPERFLEX', WRRB_FLEX: 'W/R FLEX', REC_FLEX: 'W/T FLEX', DEF: 'defense', K: 'kicker' };

const round2 = (n) => Math.round((n || 0) * 100) / 100;
export const fmt = (n) => String(round2(n));
const ordinal = (n) => {
	const s = ['th', 'st', 'nd', 'rd'];
	const v = n % 100;
	return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

// Seeded RNG so a given week's write-up is stable across reloads but changes week to week.
const hashString = (str) => {
	let h = 2166136261;
	for (let i = 0; i < str.length; i++) {
		h ^= str.charCodeAt(i);
		h = Math.imul(h, 16777619);
	}
	return h >>> 0;
};
const makeRng = (seed) => {
	let a = hashString(seed);
	return () => {
		a = (a + 0x6D2B79F5) | 0;
		let t = Math.imul(a ^ (a >>> 15), 1 | a);
		t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};
const pick = (rng, arr) => arr[Math.floor(rng() * arr.length)];

const playerName = (players, pid) => {
	const p = players?.[pid];
	if (!p) return pid;
	if (p.pos === 'DEF') return `the ${p.fn} ${p.ln} defense`;
	return `${p.fn} ${p.ln}`;
};
const playerLabel = (players, pid) => {
	const p = players?.[pid];
	if (!p) return pid;
	return p.pos === 'DEF' ? `${p.ln} D/ST` : `${p.fn} ${p.ln}`;
};
const playerPos = (players, pid) => players?.[pid]?.pos || (/^[A-Z]{2,3}$/.test(pid) ? 'DEF' : '?');

const avatarUrls = (user, leagueManager) => {
	if (user?.custom_avatar) {
		return { avatar: user.custom_avatar, avatarFallback: user.avatar ? `${CDN}/avatars/thumbs/${user.avatar}` : null };
	}
	if (user?.avatar) {
		return { avatar: `${CDN}/avatars/${user.avatar}`, avatarFallback: `${CDN}/avatars/thumbs/${user.avatar}` };
	}
	if (leagueManager?.photo) {
		return { avatar: leagueManager.photo.replace('/avatars/thumbs/', '/avatars/'), avatarFallback: leagueManager.photo };
	}
	return { avatar: null, avatarFallback: null };
};

export const buildManagerMeta = (season, leagueManagers = []) => {
	const usersById = Object.fromEntries((season.users || []).map(u => [u.user_id, u]));
	const meta = {};
	for (const r of season.rosters || []) {
		const user = usersById[r.owner_id];
		const lm = leagueManagers.find(m => m.managerID === r.owner_id);
		meta[r.roster_id] = {
			rosterID: r.roster_id,
			managerID: r.owner_id,
			name: lm?.name || user?.display_name || `Team ${r.roster_id}`,
			teamName: user?.team_name || null,
			...avatarUrls(user, lm),
		};
	}
	return meta;
};

const optimalLineup = (slots, pool) => {
	const order = slots
		.map((s, i) => ({ s, i, n: (ELIGIBLE[s] || [s]).length }))
		.sort((a, b) => a.n - b.n || a.i - b.i);
	const used = new Set();
	let total = 0;
	for (const { s } of order) {
		const elig = ELIGIBLE[s] || [s];
		let best = null;
		for (const p of pool) {
			if (used.has(p.pid) || !elig.includes(p.pos)) continue;
			if (!best || p.pts > best.pts) best = p;
		}
		if (best) {
			used.add(best.pid);
			total += best.pts;
		}
	}
	return { total: round2(total), ids: used };
};

const pairOpponents = (matchups) => {
	const byMatchup = {};
	for (const m of matchups) {
		if (m.matchup_id == null) continue;
		(byMatchup[m.matchup_id] ||= []).push(m);
	}
	const opp = {};
	for (const group of Object.values(byMatchup)) {
		if (group.length !== 2) continue;
		opp[group[0].roster_id] = group[1];
		opp[group[1].roster_id] = group[0];
	}
	return opp;
};

const resultOf = (a, b) => (a > b ? 'W' : a < b ? 'L' : 'T');

const seasonStateThrough = (roastSeason, week) => {
	const state = {};
	const ensure = (rid) => (state[rid] ||= { w: 0, l: 0, t: 0, pf: 0, results: [], scores: {} });
	for (let w = 1; w <= week; w++) {
		const matchups = roastSeason.weeks[w] || [];
		const opp = pairOpponents(matchups);
		for (const m of matchups) {
			const s = ensure(m.roster_id);
			s.scores[w] = m.points;
			if (w >= roastSeason.playoffStart) continue;
			s.pf += m.points;
			const o = opp[m.roster_id];
			if (!o) continue;
			const res = resultOf(m.points, o.points);
			s.results.push(res);
			if (res === 'W') s.w++;
			else if (res === 'L') s.l++;
			else s.t++;
		}
	}
	const ranked = Object.entries(state).sort(([, a], [, b]) =>
		(b.w + b.t / 2) - (a.w + a.t / 2) || b.pf - a.pf);
	ranked.forEach(([rid], i) => { state[rid].standing = i + 1; });
	const pfRanked = Object.entries(state).sort(([, a], [, b]) => b.pf - a.pf);
	pfRanked.forEach(([rid], i) => { state[rid].pfRank = i + 1; });
	for (const s of Object.values(state)) {
		let count = 0;
		const last = s.results[s.results.length - 1];
		for (let i = s.results.length - 1; i >= 0 && s.results[i] === last; i--) count++;
		s.streak = last ? { type: last, count } : null;
	}
	return state;
};

const txForRoster = (roastSeason, weeks, rid, kind) => {
	const out = [];
	for (const w of weeks) {
		for (const t of roastSeason.transactions?.[w] || []) {
			const map = t[kind];
			if (!map) continue;
			for (const [pid, r] of Object.entries(map)) {
				if (r === rid) out.push({ pid, type: t.type, week: w, roster_ids: t.roster_ids });
			}
		}
	}
	return out;
};

const analyzeTeam = ({ m, opp, week, roastSeason, players, useProjections, seasonState, weekScores, meta, allMatchups }) => {
	const slots = roastSeason.rosterPositions.filter(p => !NON_STARTING.has(p));
	const proj = (pid) => {
		if (!useProjections) return undefined;
		const p = players?.[pid];
		if (!p?.wi) return undefined;
		return p.wi[week]?.p ?? 0;
	};
	const starters = (m.starters || []).map((pid, i) => ({
		pid,
		empty: !pid || pid === '0',
		slot: slots[i] || 'FLEX',
		pos: playerPos(players, pid),
		pts: round2(m.starters_points?.[i] ?? m.players_points?.[pid] ?? 0),
		proj: proj(pid),
		name: playerName(players, pid),
		label: playerLabel(players, pid),
	}));
	const starterIds = new Set(starters.map(s => s.pid));
	const bench = Object.entries(m.players_points || {})
		.filter(([pid]) => !starterIds.has(pid))
		.map(([pid, pts]) => ({ pid, pos: playerPos(players, pid), pts: round2(pts), proj: proj(pid), name: playerName(players, pid), label: playerLabel(players, pid) }))
		.sort((a, b) => b.pts - a.pts);

	const pool = [...starters.filter(s => !s.empty), ...bench];
	const optimal = optimalLineup(slots, pool);
	const actual = round2(m.points);
	const benchLeft = round2(Math.max(0, optimal.total - actual));
	const efficiency = optimal.total > 0 ? actual / optimal.total : 1;

	const s = seasonState[m.roster_id] || {};
	const priorWeeks = Object.keys(s.scores || {}).map(Number).filter(w => w < week && s.scores[w] > 0);
	const priorScores = priorWeeks.map(w => s.scores[w]);
	const priorAvg = priorScores.length ? priorScores.reduce((a, b) => a + b, 0) / priorScores.length : null;
	const last3 = [week - 2, week - 1, week].map(w => s.scores?.[w]).filter(v => v > 0);
	const allScores = Object.values(s.scores || {}).filter(v => v > 0);
	const seasonAvg = allScores.length ? allScores.reduce((a, b) => a + b, 0) / allScores.length : actual;

	const others = weekScores.filter(x => x.rid !== m.roster_id);
	const allPlayW = others.filter(x => actual > x.pts).length;
	const allPlayL = others.filter(x => actual < x.pts).length;
	const weekRank = weekScores.filter(x => x.pts > actual).length + 1;

	const result = opp ? resultOf(actual, opp.points) : null;
	const margin = opp ? round2(Math.abs(actual - opp.points)) : null;

	const signals = [];
	const add = (type, weight, data = {}) => signals.push({ type, weight, ...data });

	// Lineup decisions
	for (const st of starters) {
		if (st.empty) add('emptySlot', 14, { slot: st.slot });
	}
	const zeroes = starters.filter(st => !st.empty && st.pts <= 0);
	for (const z of zeroes) {
		if (z.proj !== undefined && z.proj <= 0.5) add('zeroProjZero', 13, { p: z });
		else add('zeroStarter', 9, { p: z });
	}

	const benchedInOptimal = bench.filter(b => optimal.ids.has(b.pid));
	const startersOut = starters.filter(st => !st.empty && !optimal.ids.has(st.pid));
	let worstSwap = null;
	for (const b of benchedInOptimal) {
		for (const st of startersOut) {
			if (!(ELIGIBLE[st.slot] || [st.slot]).includes(b.pos)) continue;
			const diff = round2(b.pts - st.pts);
			if (!worstSwap || diff > worstSwap.diff) worstSwap = { benched: b, started: st, diff };
		}
	}
	if (result === 'L' && benchLeft > margin) {
		add('lostWithWinOnBench', 15, { swap: worstSwap });
	} else if (worstSwap && worstSwap.diff >= 8) {
		add('benchBlunder', 4 + worstSwap.diff / 3, { swap: worstSwap });
	}
	if (benchLeft < 0.5 && actual > 0) add('perfectLineup', 6);

	if (useProjections) {
		let paid = null;
		let backfired = null;
		for (const st of starters) {
			if (st.empty || st.proj === undefined) continue;
			for (const b of bench) {
				if (b.proj === undefined || !(ELIGIBLE[st.slot] || [st.slot]).includes(b.pos)) continue;
				if (b.proj - st.proj < 4) continue;
				const edge = st.pts - b.pts;
				if (edge >= 5 && (!paid || edge > paid.edge)) paid = { started: st, benched: b, edge };
				if (edge <= -5 && (!backfired || edge < backfired.edge)) backfired = { started: st, benched: b, edge };
			}
		}
		if (paid) add('riskyPaid', 8 + paid.edge / 4, { call: paid });
		if (backfired) add('riskyBackfired', 9 + Math.abs(backfired.edge) / 4, { call: backfired });

		const duds = starters
			.filter(st => !st.empty && st.proj >= 10 && st.pts > 0 && st.pts <= st.proj * 0.45)
			.sort((a, b) => (a.pts - a.proj) - (b.pts - b.proj));
		if (duds[0]) add('dud', 6 + (duds[0].proj - duds[0].pts) / 4, { p: duds[0] });

		const booms = starters
			.filter(st => !st.empty && st.proj !== undefined && st.pts - st.proj >= 12)
			.sort((a, b) => (b.pts - b.proj) - (a.pts - a.proj));
		if (booms[0]) add('boom', 5 + (booms[0].pts - booms[0].proj) / 5, { p: booms[0] });
	} else {
		const top = starters.filter(st => !st.empty).sort((a, b) => b.pts - a.pts)[0];
		if (top && top.pts >= 28) add('boom', 7, { p: top });
	}

	// Riding a cold player
	for (const st of starters) {
		if (st.empty || ['K', 'DEF'].includes(st.pos) || st.pts >= 7) continue;
		const prev = [week - 1, week - 2].map(w => {
			const pm = (allMatchups[w] || []).find(x => x.roster_id === m.roster_id);
			if (!pm) return null;
			const idx = (pm.starters || []).indexOf(st.pid);
			return idx >= 0 ? pm.starters_points?.[idx] ?? null : null;
		});
		if (prev.every(v => v !== null && v < 7)) {
			add('coldIgnored', 10, { p: st, prev });
			break;
		}
	}

	// Front office activity
	const recentWeeks = [week - 1, week].filter(w => w >= 1);
	const adds = txForRoster(roastSeason, recentWeeks, m.roster_id, 'adds');
	const drops = txForRoster(roastSeason, recentWeeks, m.roster_id, 'drops');
	// Commissioner moves are league admin, not the manager's decisions.
	const MANAGER_MOVES = new Set(['waiver', 'free_agent']);
	const tradeAdds = adds.filter(a => a.type === 'trade' && a.week === week);
	const waiverAdds = adds.filter(a => MANAGER_MOVES.has(a.type));

	const waiverHero = starters
		.filter(st => !st.empty && waiverAdds.some(a => a.pid === st.pid) && st.pts >= 15)
		.sort((a, b) => b.pts - a.pts)[0];
	if (waiverHero) add('waiverHero', 7, { p: waiverHero });

	for (const d of drops) {
		if (!MANAGER_MOVES.has(d.type)) continue;
		const elsewhere = (allMatchups[week] || []).find(x => x.roster_id !== m.roster_id && (x.players_points?.[d.pid] ?? 0) >= 15);
		if (elsewhere) {
			add('droppedRegret', 11, {
				pid: d.pid,
				name: playerName(players, d.pid),
				pts: round2(elsewhere.players_points[d.pid]),
				other: meta[elsewhere.roster_id]?.name || 'a rival',
			});
			break;
		}
	}

	if (tradeAdds.length) {
		const acquired = tradeAdds.map(a => ({
			name: playerName(players, a.pid),
			pts: round2(m.players_points?.[a.pid] ?? 0),
			started: starterIds.has(a.pid),
		}));
		add('trade', 7, { acquired, total: round2(acquired.reduce((x, y) => x + y.pts, 0)) });
	}

	// Who carried the team
	const realStarters = starters.filter(st => !st.empty);
	const mvp = [...realStarters].sort((a, b) => b.pts - a.pts)[0];
	if (mvp && ['K', 'DEF'].includes(mvp.pos)) add('specialTeamsMVP', 9, { p: mvp });
	const qb = realStarters.find(st => st.slot === 'QB');
	if (qb && qb.pts > 0 && qb.pts < 10) add('qbStinker', 6, { p: qb });
	if (mvp) add('mvp', 1, { p: mvp });

	// Grade: weekly finish matters most, lineup efficiency matters some.
	const weekPct = others.length ? (allPlayW + 0.5 * (others.length - allPlayW - allPlayL)) / others.length : 0.5;
	const effScore = Math.min(1, Math.max(0, (efficiency - 0.75) / 0.25));
	const gradeScore = 0.7 * weekPct + 0.3 * effScore;
	const grade = gradeScore >= 0.92 ? 'A+' : gradeScore >= 0.82 ? 'A' : gradeScore >= 0.72 ? 'B+'
		: gradeScore >= 0.62 ? 'B' : gradeScore >= 0.52 ? 'C+' : gradeScore >= 0.42 ? 'C'
		: gradeScore >= 0.32 ? 'D+' : gradeScore >= 0.22 ? 'D' : gradeScore >= 0.1 ? 'F' : 'F-';
	const tier = gradeScore >= 0.82 ? 'elite' : gradeScore >= 0.62 ? 'good' : gradeScore >= 0.42 ? 'meh' : gradeScore >= 0.22 ? 'bad' : 'terrible';

	return {
		rosterID: m.roster_id,
		score: actual,
		opp: opp ? { rosterID: opp.roster_id, score: round2(opp.points), name: meta[opp.roster_id]?.name || 'their opponent' } : null,
		result,
		margin,
		weekRank,
		numTeams: weekScores.length,
		allPlayW,
		allPlayL,
		optimal: optimal.total,
		benchLeft,
		efficiency: Math.round(efficiency * 100),
		starters,
		bench,
		record: { w: s.w || 0, l: s.l || 0, t: s.t || 0 },
		standing: s.standing,
		pfRank: s.pfRank,
		streak: s.streak,
		priorAvg: priorAvg === null ? null : round2(priorAvg),
		seasonAvg: round2(seasonAvg),
		last3Avg: last3.length === 3 ? round2(last3.reduce((a, b) => a + b, 0) / 3) : null,
		seasonHigh: priorScores.length >= 1 && actual > Math.max(...priorScores),
		seasonLow: priorScores.length >= 2 && actual > 0 && actual < Math.min(...priorScores),
		isPlayoffs: week >= roastSeason.playoffStart,
		playoffTeams: roastSeason.playoffTeams || 6,
		signals: signals.sort((a, b) => b.weight - a.weight),
		grade,
		tier,
		gradeScore,
	};
};

// ---------- Narrative ----------

const opener = (rng, t, N, W) => {
	const S = fmt(t.score);
	if (!t.opp) {
		return pick(rng, [
			`${N} put up ${S} in Week ${W} in a game that counted for absolutely nothing, which is fitting, because neither does ${N}.`,
			`No opponent for ${N} this week, just ${S} points scored into the void, like a man yelling at a parking garage.`,
		]);
	}
	const O = t.opp.name;
	const OS = fmt(t.opp.score);
	const M = fmt(t.margin);
	if (t.result === 'T') {
		return `${N} and ${O} tied at ${S}. Two franchises staring at each other in a mirror and both losing the staring contest.`;
	}
	if (t.result === 'W' && t.margin >= 40) {
		return pick(rng, [
			`${N} hung ${S} on ${O} and won by ${M}. ${O} has been seen Googling "how to leave a group chat without anyone noticing."`,
			`${N} beat ${O} ${S}-${OS}. That isn't a win, that's a crime scene with a scoreboard.`,
			`${N} won by ${M}. ${O} should have forfeited at halftime and kept what little dignity was left.`,
			`${N} dropped ${S} on ${O}'s ${OS}. Somebody check on ${O}'s family; they saw the whole thing.`,
		]);
	}
	if (t.result === 'L' && t.margin >= 40) {
		return pick(rng, [
			`${N} lost to ${O} by ${M}, ${S}-${OS}. The box score reads like a ransom note written by someone who has given up on the ransom.`,
			`${N} posted ${S} and got buried by ${M}. Closed-casket performance. The family asks for privacy and a better waiver strategy.`,
			`${N} scored ${S}. ${O} scored ${OS}. Those aren't the numbers of a matchup; they're the numbers of an intervention.`,
			`${O} beat ${N} by ${M} and didn't even break a sweat. ${N} broke several things, mostly their own spirit.`,
		]);
	}
	if (t.result === 'W' && t.margin < 5) {
		return pick(rng, [
			`${N} escaped ${O} by ${M}. Won by less than an extra point and a prayer, and will absolutely call it "strategy."`,
			`${N} survived ${O}, ${S}-${OS}. The fantasy equivalent of getting acquitted on a technicality and walking out of court like you were innocent.`,
			`${N} edged ${O} by ${M}. Not so much a win as a clerical error in ${N}'s favor.`,
		]);
	}
	if (t.result === 'L' && t.margin < 5) {
		return pick(rng, [
			`${N} lost to ${O} by ${M}. One dropped pass, one correct start/sit call, one shred of competence away from a W.`,
			`${N} fell to ${O} by ${M}, ${S}-${OS}. Close losses build character, and ${N} is now the most well-adjusted loser in America.`,
			`${N} lost by ${M}. Somewhere a kicker hooked a 31-yarder and ${N} felt it in their bones.`,
		]);
	}
	if (t.result === 'W') {
		return pick(rng, [
			`${N} beat ${O} ${S}-${OS}. Competent. Unremarkable. A beige Camry with a W bumper sticker.`,
			`${N} took care of ${O}, ${S}-${OS}, and is already acting like they invented football.`,
			`${N} beat ${O} by ${M}. Expect a 40-minute monologue about "process" in the group chat.`,
		]);
	}
	return pick(rng, [
		`${N} lost to ${O}, ${S}-${OS}, in a performance best described as "present."`,
		`${N} dropped one to ${O}, ${S}-${OS}. Nobody was surprised, least of all ${N}.`,
		`${N} lost by ${M} to ${O}. Not a disaster, just the steady, comfortable failure of someone who has made peace with it.`,
	]);
};

const luckLine = (rng, t, N) => {
	const others = t.numTeams - 1;
	if (t.result === 'W' && t.allPlayW <= 2 && others >= 6) {
		return pick(rng, [
			`Only ${t.allPlayW} team${t.allPlayW === 1 ? '' : 's'} in the entire league scored less, and ${N} still won. The schedule maker deserves a cut of the prize money.`,
			`${N} had the ${ordinal(t.weekRank)}-highest score of ${t.numTeams} and somehow got a W out of it. That's not a win, that's a pickpocketing.`,
		]);
	}
	if (t.result === 'L' && t.allPlayL <= 2 && others >= 6) {
		return pick(rng, [
			`${N} outscored ${t.allPlayW} of ${others} teams and still lost. The fantasy gods don't just hate ${N}; they've put it in writing and had it notarized.`,
			`That was the ${ordinal(t.weekRank)}-best score in the league, and it lost. ${N} would have beaten almost anyone, and they drew the one person who mattered.`,
		]);
	}
	if (t.weekRank === 1) return `It was the highest score in the league this week. Screenshot it, ${N}; you'll need proof later.`;
	if (t.weekRank === t.numTeams) return pick(rng, [
		`It was the lowest score in the league. Dead last. The cellar. The crawlspace under the cellar.`,
		`Dead last out of ${t.numTeams}. Every other manager, including the ones who forgot to set lineups in spirit, did better.`,
	]);
	return null;
};

const seasonLine = (rng, t, N) => {
	if (t.isPlayoffs) {
		return `With the regular season over at ${t.record.w}-${t.record.l}${t.record.t ? `-${t.record.t}` : ''}, this one was about pride, and ${N} has been running a deficit on that for years.`;
	}
	const rec = `${t.record.w}-${t.record.l}${t.record.t ? `-${t.record.t}` : ''}`;
	const parts = [`That puts ${N} at ${rec}, ${ordinal(t.standing)} in the standings and ${ordinal(t.pfRank)} in points scored.`];
	if (t.seasonHigh) {
		parts.push(pick(rng, [
			`It was also their best score of the season, so enjoy it — statistically, it is all downhill from here.`,
			`It was a season high, which says less about this week and more about the previous ones.`,
		]));
	} else if (t.seasonLow) {
		parts.push(pick(rng, [
			`It was their lowest score of the season, a new floor in a year full of basements.`,
			`That's a new season low. Every week ${N} finds a fresh way to disappoint, and this week they found the bottom.`,
		]));
	} else if (t.priorAvg !== null && t.score < t.priorAvg - 15) {
		parts.push(`That's ${fmt(t.priorAvg - t.score)} below their season average, and the average wasn't exactly a high bar to begin with.`);
	} else if (t.priorAvg !== null && t.score > t.priorAvg + 15) {
		parts.push(`That's ${fmt(t.score - t.priorAvg)} above their season average. Even a broken clock gets a Sunday.`);
	}
	if (t.streak?.type === 'L' && t.streak.count >= 3) {
		parts.push(pick(rng, [
			`That's ${t.streak.count} straight losses. The streak now has its own fan club and a better roster than ${N}.`,
			`Loss number ${t.streak.count} in a row. At this point it's not a slump, it's a lifestyle.`,
		]));
	} else if (t.streak?.type === 'W' && t.streak.count >= 3) {
		parts.push(pick(rng, [
			`That's ${t.streak.count} wins in a row, and the ego growth is now visible from space.`,
			`${t.streak.count} straight wins. Somebody please beat ${N} before they start offering "advice."`,
		]));
	} else if (t.last3Avg !== null && t.last3Avg < t.seasonAvg - 10) {
		parts.push(`Over the last three weeks they've averaged ${fmt(t.last3Avg)}, a slide economists would call a "correction" and everyone else would call a collapse.`);
	}
	if (parts.length < 3) {
		if (t.standing === 1) {
			parts.push(pick(rng, [
				`First place, which says more about the league than it does about ${N}.`,
				`Sitting in first, so every word of trash talk from ${N} is now legally binding.`,
			]));
		} else if (t.standing >= t.numTeams - 1) {
			parts.push(pick(rng, [
				`The Toilet Bowl is no longer a threat; it's a destination.`,
				`Bottom two in the league. The only race left is for the last pick and the last shred of respect.`,
			]));
		} else if (t.standing === t.playoffTeams + 1) {
			parts.push(`First team out of the playoff picture, the most painful seat in the house.`);
		}
	}
	return parts.join(' ');
};

const signalLine = (rng, sig, t, N) => {
	switch (sig.type) {
		case 'emptySlot':
			return pick(rng, [
				`${N} left a starting ${SLOT_LABEL[sig.slot] || sig.slot} spot completely empty. Not a bad start — no start. They brought an empty chair to a football game and asked it to block.`,
				`There was an empty ${SLOT_LABEL[sig.slot] || sig.slot} slot in ${N}'s lineup. Zero effort, zero points, zero excuses. A forfeit with extra steps.`,
			]);
		case 'zeroProjZero':
			return pick(rng, [
				`${N} started ${sig.p.name}, whom Sleeper projected for ${fmt(sig.p.proj)} points. The projection said zero. The scoreboard said ${fmt(sig.p.pts)}. Every alarm in the building was going off and ${N} hit snooze.`,
				`The projections had ${sig.p.name} at ${fmt(sig.p.proj)}. ${N} started him anyway and got ${fmt(sig.p.pts)}. That's not a gamble, that's reading the warning label and drinking it.`,
			]);
		case 'zeroStarter':
			return pick(rng, [
				`${sig.p.name} put up ${fmt(sig.p.pts)} in ${N}'s starting lineup. Hurt, benched, or simply refusing to be associated with this franchise — the result is the same.`,
				`${N} got ${fmt(sig.p.pts)} from ${sig.p.name}. A cardboard cutout of ${sig.p.name} would have been cheaper and roughly as productive.`,
			]);
		case 'lostWithWinOnBench': {
			const swap = sig.swap;
			const detail = swap ? ` The worst of it: ${swap.benched.name} (${fmt(swap.benched.pts)}) sat on the bench while ${swap.started.name} (${fmt(swap.started.pts)}) started.` : '';
			return pick(rng, [
				`Here's what will haunt ${N}: they lost by ${fmt(t.margin)} with ${fmt(t.benchLeft)} points rotting on the bench. The winning lineup was already on the roster. They just didn't press the buttons.${detail}`,
				`${N} lost by ${fmt(t.margin)} and left ${fmt(t.benchLeft)} on the bench. That's not bad luck, that's self-sabotage with a Sleeper login.${detail}`,
			]);
		}
		case 'benchBlunder': {
			const { benched, started } = sig.swap;
			return pick(rng, [
				`Biggest blunder: starting ${started.name} (${fmt(started.pts)}) over ${benched.name} (${fmt(benched.pts)}), who watched from the bench like a disappointed parent at a piano recital.`,
				`${N} benched ${benched.name}, who scored ${fmt(benched.pts)}, to start ${started.name}, who scored ${fmt(started.pts)}. ${fmt(t.benchLeft)} points left on the pine in total — a monument to overthinking.`,
			]);
		}
		case 'perfectLineup':
			return pick(rng, [
				`Credit where it's due: ${N} set a perfect lineup. Every start was the right start. Mark the calendar; it may never happen again.`,
				`Somehow ${N} started the optimal lineup. Zero points left on the bench. Either growth or witchcraft, and nobody's betting on growth.`,
			]);
		case 'riskyPaid': {
			const { started, benched } = sig.call;
			return pick(rng, [
				`The galaxy-brain call: ${N} started ${started.name} (projected ${fmt(started.proj)}) over ${benched.name} (projected ${fmt(benched.proj)}). ${started.name} put up ${fmt(started.pts)}. Reckless? Yes. Correct? Also, infuriatingly, yes.`,
				`${N} ignored the projections, started ${started.name} over ${benched.name}, and got ${fmt(started.pts)} to ${fmt(benched.pts)}. Even a blind squirrel finds a nut, and this squirrel won't shut up about it.`,
			]);
		}
		case 'riskyBackfired': {
			const { started, benched } = sig.call;
			return pick(rng, [
				`${N} went against the projections and started ${started.name} (proj ${fmt(started.proj)}) over ${benched.name} (proj ${fmt(benched.proj)}). Result: ${fmt(started.pts)} to ${fmt(benched.pts)}. The numbers tried to help. ${N} said "I've got a feeling." The feeling was gas.`,
				`Sleeper had ${benched.name} ${fmt(benched.proj - started.proj)} points better than ${started.name}. ${N} started ${started.name} anyway, got ${fmt(started.pts)}, and watched ${benched.name} drop ${fmt(benched.pts)} on the bench. The signs were posted in neon.`,
			]);
		}
		case 'dud':
			return pick(rng, [
				`${sig.p.name} was projected for ${fmt(sig.p.proj)} and delivered ${fmt(sig.p.pts)}, an underperformance so complete it should void the contract.`,
				`${sig.p.name}: projected ${fmt(sig.p.proj)}, actual ${fmt(sig.p.pts)}. ${N} paid for a steak and got served the receipt.`,
			]);
		case 'boom':
			return pick(rng, [
				`${sig.p.name} went off for ${fmt(sig.p.pts)}${sig.p.proj !== undefined ? ` against a projection of ${fmt(sig.p.proj)}` : ''}, carrying ${N} like a pallbearer who refuses to put the casket down.`,
				`${sig.p.name} dropped ${fmt(sig.p.pts)}. ${N} will take credit for this. ${N} had nothing to do with this.`,
			]);
		case 'coldIgnored':
			return pick(rng, [
				`${N} kept starting ${sig.p.name} after back-to-back duds (${fmt(sig.prev[1])} and ${fmt(sig.prev[0])}) and got rewarded with ${fmt(sig.p.pts)}. Doing the same thing over and over and expecting a different result has a clinical name.`,
				`Three straight weeks of ${sig.p.name} under 7 points (${fmt(sig.prev[1])}, ${fmt(sig.prev[0])}, ${fmt(sig.p.pts)}), and three straight weeks of ${N} starting him. That's not loyalty, it's a hostage situation.`,
			]);
		case 'waiverHero':
			return pick(rng, [
				`Waiver pickup ${sig.p.name} went straight into the lineup and scored ${fmt(sig.p.pts)}. One good transaction. Let's not throw a parade.`,
				`${N} grabbed ${sig.p.name} off waivers and got ${fmt(sig.p.pts)} out of him immediately. Proof that even ${N} can find a twenty on the sidewalk.`,
			]);
		case 'droppedRegret':
			return pick(rng, [
				`${N} recently cut ${sig.name}, who promptly scored ${fmt(sig.pts)} for ${sig.other}. Revenge served hot, with a side of public humiliation.`,
				`Fresh off being dropped by ${N}, ${sig.name} put up ${fmt(sig.pts)} on ${sig.other}'s roster. That's an ex posting vacation pics with someone better.`,
			]);
		case 'trade': {
			const list = sig.acquired.map(a => `${a.name} (${fmt(a.pts)}${a.started ? '' : ', benched'})`).join(', ');
			return sig.total >= 20
				? `The trade-deadline maneuvering paid off immediately: new arrivals ${list} combined for ${fmt(sig.total)}. Somebody got fleeced, and for once it wasn't ${N}.`
				: `${N} made a trade this week and the new arrivals — ${list} — combined for ${fmt(sig.total)}. Buyer's remorse delivered same-day.`;
		}
		case 'specialTeamsMVP':
			return `${N}'s top scorer was ${sig.p.name} with ${fmt(sig.p.pts)}. When your ${sig.p.pos === 'K' ? 'kicker' : 'defense'} is the best player on the team, it's not a fantasy roster; it's a special-teams unit with delusions of grandeur.`;
		case 'qbStinker':
			return pick(rng, [
				`${sig.p.name} gave ${N} ${fmt(sig.p.pts)} at quarterback, a stat line that belongs on a leather-helmet trading card.`,
				`${fmt(sig.p.pts)} points from ${sig.p.name} at QB. Most backup quarterbacks hold a clipboard with more upside.`,
			]);
		case 'mvp':
			return pick(rng, [
				`MVP honors go to ${sig.p.name} with ${fmt(sig.p.pts)}, the only person in this organization who showed up to work.`,
				`${sig.p.name} led the way with ${fmt(sig.p.pts)}. He deserves a better manager. Most of them do.`,
			]);
		default:
			return null;
	}
};

const headlineFor = (rng, t, top) => {
	const map = {
		emptySlot: ['The Empty Chair Award', 'Forfeit With Extra Steps'],
		zeroProjZero: ['Ignored Every Warning Label', 'The Projections Tried'],
		lostWithWinOnBench: ['Left the Win on the Bench', 'The Winning Lineup Was Right There'],
		riskyBackfired: ['Trusted the Gut. The Gut Lied.', 'Went Rogue, Got Punished'],
		riskyPaid: ['Galaxy Brain, Somehow Correct', 'Reckless and Right'],
		droppedRegret: ['Revenge of the Waiver Wire', 'The Ex Is Thriving'],
		coldIgnored: ['Loyalty to a Corpse', 'Cold Streak Truther'],
		specialTeamsMVP: ['Carried by Special Teams', 'Kicker Supremacy'],
		zeroStarter: ['Started a Ghost', 'A Zero in the Lineup'],
		perfectLineup: ['Flawless Lineup, Allegedly Human'],
		dud: ['Paid for Steak, Got the Receipt', 'Busted by the Stars'],
		benchBlunder: ['Overthought It', 'The Bench Was Better'],
		qbStinker: ['Quarterback Malpractice'],
	};
	if (t.weekRank === t.numTeams) return pick(rng, ['Dead Last, Fully Earned', 'Rock Bottom Has a Basement']);
	if (t.result === 'W' && (t.margin >= 40 || t.weekRank === 1)) return pick(rng, ['Bulldozer Season', 'Felony on the Scoreboard']);
	if (top && map[top.type]) return pick(rng, map[top.type]);
	if (t.result === 'L' && t.margin >= 40) return pick(rng, ['Crime Scene', 'Closed-Casket Week']);
	if (t.result === 'W' && t.allPlayW <= 2) return 'Grand Larceny';
	if (t.result === 'L' && t.allPlayL <= 2) return 'Robbed in Broad Daylight';
	if (t.result === 'L' && t.margin < 5) return 'Heartbreak Hotel';
	if (t.result === 'W' && t.margin < 5) return 'Escaped on a Technicality';
	return t.result === 'W' ? 'A Win Nobody Will Remember' : 'Aggressively Mediocre';
};

const closerFor = (rng, t) => {
	if (t.tier === 'terrible' || t.tier === 'bad') {
		return pick(rng, [
			'Recommended next step: hand the phone to a family member on Sunday mornings.',
			"Next week can't be worse. That's not optimism; that's a dare.",
			'Thoughts and prayers. Mostly prayers.',
			'The league office has reviewed the tape and ruled it "deeply embarrassing."',
		]);
	}
	if (t.tier === 'elite') {
		return pick(rng, [
			'Enjoy it. Regression is coming, and it is bringing friends.',
			"Act like you've been here before. You haven't, but act like it.",
			'Expect the gloating to outlast the lead.',
		]);
	}
	return pick(rng, [
		'A performance that will be forgotten by Wednesday, which is generous.',
		'Not good enough to brag about, not bad enough to be interesting. The worst of both worlds.',
		'Somewhere between "fine" and "why bother." Mostly "why bother."',
	]);
};

const composeNarrative = (t, meta, week, season) => {
	const N = meta.name;
	const rng = makeRng(`${season}-${week}-${meta.managerID}`);
	const top = t.signals.find(s => s.type !== 'mvp' && s.type !== 'boom' && s.type !== 'perfectLineup') || t.signals[0];
	const headline = headlineFor(rng, t, top);

	const opening = [opener(rng, t, N, week), luckLine(rng, t, N)].filter(Boolean).join(' ');
	const season_ = seasonLine(rng, t, N);

	const used = new Set();
	const lines = [];
	for (const sig of t.signals) {
		if (lines.length >= 3) break;
		if (used.has(sig.type)) continue;
		if (sig.type === 'mvp' && lines.length >= 2) continue;
		if (sig.type === 'mvp' && t.signals.some(s => s.type === 'boom' || s.type === 'specialTeamsMVP')) continue;
		const line = signalLine(rng, sig, t, N);
		if (line) {
			lines.push(line);
			used.add(sig.type);
		}
	}

	const capitalize = (text) => text.replace(/(^|[.!?]\s+)the /g, '$1The ');
	return {
		headline,
		paragraphs: [opening, season_, lines.join(' '), closerFor(rng, t)].filter(Boolean).map(capitalize),
	};
};

// ---------- Public API ----------

export const availableWeeks = (data) =>
	Object.keys(data?.roastSeason?.weeks || {}).map(Number).sort((a, b) => a - b);

export const buildRoastWeek = (data, players, week, leagueManagers = []) => {
	const roastSeason = data.roastSeason;
	const matchups = roastSeason.weeks[week] || [];
	if (!matchups.length) return [];
	const season = data.seasons.find(s => s.year === roastSeason.year);
	const meta = buildManagerMeta(season, leagueManagers);
	const useProjections = String(data.nflState.league_season) === String(roastSeason.year);
	const seasonState = seasonStateThrough(roastSeason, week);
	const opp = pairOpponents(matchups);
	const weekScores = matchups.map(m => ({ rid: m.roster_id, pts: m.points }));

	return matchups
		.map(m => {
			const t = analyzeTeam({
				m, opp: opp[m.roster_id], week, roastSeason, players, useProjections,
				seasonState, weekScores, meta, allMatchups: roastSeason.weeks,
			});
			const mm = meta[m.roster_id] || { name: `Team ${m.roster_id}`, managerID: String(m.roster_id) };
			return { ...t, manager: mm, ...composeNarrative(t, mm, week, roastSeason.year) };
		})
		.sort((a, b) => a.gradeScore - b.gradeScore || a.score - b.score);
};

export const buildHistory = (data) => {
	const sleeperYears = data.seasons.map(s => s.year);
	const lastYear = Math.max(...sleeperYears, FIRST_SEASON);
	const years = [];
	for (let y = FIRST_SEASON; y <= lastYear; y++) years.push(y);

	const byManager = {};
	const ensure = (mid) => (byManager[mid] ||= {});

	for (const season of data.seasons) {
		const ranked = [...season.rosters].sort((a, b) =>
			(b.settings.wins + b.settings.ties / 2) - (a.settings.wins + a.settings.ties / 2) || b.settings.fpts - a.settings.fpts);
		ranked.forEach((r, i) => {
			if (!r.owner_id) return;
			const played = r.settings.wins + r.settings.losses + r.settings.ties;
			ensure(r.owner_id)[season.year] = {
				platform: 'sleeper',
				wins: r.settings.wins,
				losses: r.settings.losses,
				ties: r.settings.ties,
				fpts: round2(r.settings.fpts),
				rank: played > 0 ? i + 1 : null,
				champion: season.champion === r.roster_id,
				inProgress: season.status !== 'complete',
			};
		});
	}

	let yahooImported = 0;
	for (const [yearStr, standings] of Object.entries(yahooSeasonStandings || {})) {
		for (const st of standings || []) {
			yahooImported++;
			ensure(st.managerID)[parseInt(yearStr)] = {
				platform: 'yahoo',
				wins: st.wins ?? 0,
				losses: st.losses ?? 0,
				ties: st.ties ?? 0,
				fpts: round2(st.fpts ?? 0),
				rank: st.finish ?? null,
				champion: st.finish === 1,
				inProgress: false,
			};
		}
	}

	const careers = {};
	for (const [mid, seasons] of Object.entries(byManager)) {
		const c = { wins: 0, losses: 0, ties: 0, fpts: 0, titles: 0, seasons: 0 };
		for (const s of Object.values(seasons)) {
			c.wins += s.wins;
			c.losses += s.losses;
			c.ties += s.ties;
			c.fpts += s.fpts;
			c.titles += s.champion ? 1 : 0;
			c.seasons++;
		}
		c.fpts = round2(c.fpts);
		careers[mid] = c;
	}

	return {
		years,
		byManager,
		careers,
		sleeperRange: [Math.min(...sleeperYears), Math.max(...sleeperYears)],
		yahooImported: yahooImported > 0,
	};
};
