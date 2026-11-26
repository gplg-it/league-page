import { getLeagueData } from './leagueData';
import { leagueID } from '$lib/utils/leagueInfo';
import { getNflState } from './nflState';
import { getCached, setCached } from './cache';

const NFL_SEASON_STARTS = {
	2020: new Date('September 10, 2020'),
	2021: new Date('September 9, 2021'),
	2022: new Date('September 8, 2022'),
	2023: new Date('September 7, 2023'),
	2024: new Date('September 5, 2024'),
	2025: new Date('September 4, 2025'),
	2026: new Date('September 10, 2026'),
};

function parseTradeDate(dateStr) {
	const datePart = dateStr.split(',')[0];
	return new Date(datePart);
}

function getTradeWeek(dateStr, season) {
	const tradeDate = parseTradeDate(dateStr);
	const seasonStart = NFL_SEASON_STARTS[season];
	if (!seasonStart || tradeDate < seasonStart) return 0;
	const daysSinceStart = Math.floor((tradeDate - seasonStart) / (1000 * 60 * 60 * 24));
	return Math.min(Math.floor(daysSinceStart / 7) + 1, 18);
}

async function getSeasonLeagueMap() {
	const cached = getCached('seasonLeagueMap');
	if (cached) return cached;

	let currentLeagueID = leagueID;
	const seasonMap = {};

	while (currentLeagueID && currentLeagueID != 0) {
		const leagueData = await getLeagueData(currentLeagueID);
		seasonMap[leagueData.season] = {
			leagueID: currentLeagueID,
			playoffWeekStart: leagueData.settings.playoff_week_start,
			season: leagueData.season,
		};
		currentLeagueID = leagueData.previous_league_id;
	}

	setCached('seasonLeagueMap', seasonMap);
	return seasonMap;
}

async function fetchSeasonMatchups(seasonLeagueID, maxWeek) {
	const cacheKey = `tradeMatchups_${seasonLeagueID}`;
	const cached = getCached(cacheKey);
	if (cached) return cached;

	const matchupsByWeek = {};
	const promises = [];

	for (let week = 1; week <= maxWeek; week++) {
		promises.push(
			fetch(`https://api.sleeper.app/v1/league/${seasonLeagueID}/matchups/${week}`, {compress: true})
				.then(r => r.json())
				.then(data => ({ week, data }))
				.catch(() => ({ week, data: [] }))
		);
	}

	const results = await Promise.all(promises);

	for (const { week, data } of results) {
		if (!data || !Array.isArray(data)) continue;
		matchupsByWeek[week] = {};
		for (const match of data) {
			matchupsByWeek[week][match.roster_id] = {
				starters: match.starters || [],
				startersPoints: match.starters_points || [],
				playersPoints: match.players_points || {},
				points: match.points || 0,
			};
		}
	}

	setCached(cacheKey, matchupsByWeek);
	return matchupsByWeek;
}

export function extractTradeAssets(trade) {
	return trade.rosters.map((rosterID, idx) => {
		const assets = {
			rosterID,
			playersReceived: [],
			picksReceived: [],
			faabReceived: 0,
		};

		for (const move of trade.moves) {
			const slot = move[idx];
			if (slot && slot !== "origin") {
				if (slot.player) {
					assets.playersReceived.push(slot.player);
				} else if (slot.pick) {
					assets.picksReceived.push(slot.pick);
				} else if (slot.budget) {
					assets.faabReceived += slot.budget.amount;
				}
			}
		}

		return assets;
	});
}

function evaluateTrade(trade, matchupsByWeek, playersInfo) {
	const sides = extractTradeAssets(trade);
	const tradeWeek = getTradeWeek(trade.date, trade.season);
	const maxWeek = Math.max(...Object.keys(matchupsByWeek).map(Number));
	const weeksRemaining = Math.max(maxWeek - tradeWeek, 0);

	const evaluation = {
		trade,
		tradeWeek,
		weeksRemaining,
		sides: sides.map(side => {
			const playerScores = {};
			let totalPoints = 0;
			let gamesPlayed = 0;

			for (const playerID of side.playersReceived) {
				const pInfo = playersInfo?.[playerID];
				playerScores[playerID] = {
					weekly: {},
					total: 0,
					gamesScored: 0,
					name: pInfo?.fn && pInfo?.ln ? `${pInfo.fn} ${pInfo.ln}` : playerID,
					position: pInfo?.pos || '?',
					team: pInfo?.t || '',
				};

				for (let week = tradeWeek + 1; week <= maxWeek; week++) {
					const weekData = matchupsByWeek[week];
					if (!weekData || !weekData[side.rosterID]) continue;

					const rosterData = weekData[side.rosterID];
					let pts = null;

					if (rosterData.playersPoints && rosterData.playersPoints[playerID] !== undefined) {
						pts = rosterData.playersPoints[playerID] || 0;
					} else {
						const starterIdx = rosterData.starters.indexOf(playerID);
						if (starterIdx >= 0) {
							pts = rosterData.startersPoints[starterIdx] || 0;
						}
					}

					if (pts !== null) {
						playerScores[playerID].weekly[week] = pts;
						playerScores[playerID].total += pts;
						playerScores[playerID].gamesScored++;
						totalPoints += pts;
						gamesPlayed++;
					}
				}

				playerScores[playerID].total = Math.round(playerScores[playerID].total * 100) / 100;
			}

			return {
				rosterID: side.rosterID,
				playersReceived: side.playersReceived,
				picksReceived: side.picksReceived,
				faabReceived: side.faabReceived,
				playerScores,
				totalPoints: Math.round(totalPoints * 100) / 100,
				avgPPG: gamesPlayed > 0 ? Math.round(totalPoints / gamesPlayed * 100) / 100 : 0,
			};
		}),
	};

	const diff = evaluation.sides[0].totalPoints - evaluation.sides[1].totalPoints;
	evaluation.pointDiff = Math.round(Math.abs(diff) * 100) / 100;
	evaluation.winnerIdx = diff > 2 ? 0 : diff < -2 ? 1 : -1;
	evaluation.grade = getTradeGrade(diff, weeksRemaining);

	return evaluation;
}

function getTradeGrade(pointDiff, weeksRemaining) {
	if (weeksRemaining === 0) return { letter: '?', label: 'No Data', color: '#888' };

	const absDiff = Math.abs(pointDiff);
	const ppgDiff = absDiff / Math.max(weeksRemaining, 1);

	if (ppgDiff < 1) return { letter: 'C', label: 'Even', color: '#f0ad4e' };
	if (ppgDiff < 3) return { letter: 'B-', label: 'Slight Edge', color: '#8bc34a' };
	if (ppgDiff < 5) return { letter: 'B', label: 'Clear Winner', color: '#4caf50' };
	if (ppgDiff < 8) return { letter: 'B+', label: 'Decisive', color: '#2e7d32' };
	if (ppgDiff < 12) return { letter: 'A-', label: 'Dominant', color: '#1565c0' };
	if (ppgDiff < 18) return { letter: 'A', label: 'Robbery', color: '#6a1b9a' };
	return { letter: 'A+', label: 'Heist', color: '#920505' };
}

export async function evaluateAllTrades(transactions, playersInfo) {
	const trades = transactions.filter(t => t.type === 'trade');
	if (trades.length === 0) return [];

	const seasonLeagueMap = await getSeasonLeagueMap();

	const tradesBySeason = {};
	for (const trade of trades) {
		if (!tradesBySeason[trade.season]) tradesBySeason[trade.season] = [];
		tradesBySeason[trade.season].push(trade);
	}

	const evaluations = [];

	for (const [season, seasonTrades] of Object.entries(tradesBySeason)) {
		const seasonInfo = seasonLeagueMap[season];
		if (!seasonInfo) continue;

		const maxWeek = seasonInfo.playoffWeekStart - 1;
		const matchupsByWeek = await fetchSeasonMatchups(seasonInfo.leagueID, maxWeek);

		for (const trade of seasonTrades) {
			evaluations.push(evaluateTrade(trade, matchupsByWeek, playersInfo));
		}
	}

	return evaluations;
}

export async function evaluateHypotheticalTrade({ sideA, sideB, playersInfo }) {
	const nflState = await getNflState();
	const season = nflState.season;
	const currentWeek = nflState.season_type === 'regular' ? nflState.week : 18;

	const seasonLeagueMap = await getSeasonLeagueMap();
	const seasonInfo = seasonLeagueMap[season];
	if (!seasonInfo) return null;

	const maxWeek = seasonInfo.playoffWeekStart - 1;
	const matchupsByWeek = await fetchSeasonMatchups(seasonInfo.leagueID, maxWeek);

	function getPlayerValue(playerID, fromRosterID) {
		const pInfo = playersInfo?.[playerID];
		const result = {
			playerID,
			name: pInfo?.fn && pInfo?.ln ? `${pInfo.fn} ${pInfo.ln}` : playerID,
			position: pInfo?.pos || '?',
			team: pInfo?.t || '',
			weeklyActual: {},
			totalActual: 0,
			weeklyProjected: {},
			totalProjected: 0,
		};

		for (let week = 1; week <= Math.min(currentWeek, maxWeek); week++) {
			const weekData = matchupsByWeek[week];
			if (!weekData || !weekData[fromRosterID]) continue;
			const rosterData = weekData[fromRosterID];

			let pts = null;
			if (rosterData.playersPoints && rosterData.playersPoints[playerID] !== undefined) {
				pts = rosterData.playersPoints[playerID] || 0;
			} else {
				const starterIdx = rosterData.starters.indexOf(playerID);
				if (starterIdx >= 0) pts = rosterData.startersPoints[starterIdx] || 0;
			}

			if (pts !== null) {
				result.weeklyActual[week] = pts;
				result.totalActual += pts;
			}
		}

		if (pInfo?.wi) {
			for (let week = currentWeek + 1; week <= maxWeek; week++) {
				const weekInfo = pInfo.wi[week];
				if (weekInfo && weekInfo.p !== undefined) {
					result.weeklyProjected[week] = weekInfo.p;
					result.totalProjected += weekInfo.p;
				}
			}
		}

		result.totalActual = Math.round(result.totalActual * 100) / 100;
		result.totalProjected = Math.round(result.totalProjected * 100) / 100;
		result.totalValue = Math.round((result.totalActual + result.totalProjected) * 100) / 100;

		return result;
	}

	const sideAValues = sideA.playerIDs.map(id => getPlayerValue(id, sideA.rosterID));
	const sideBValues = sideB.playerIDs.map(id => getPlayerValue(id, sideB.rosterID));

	const sideATotal = sideAValues.reduce((sum, p) => sum + p.totalValue, 0);
	const sideBTotal = sideBValues.reduce((sum, p) => sum + p.totalValue, 0);

	return {
		sideA: { rosterID: sideA.rosterID, players: sideAValues, totalValue: Math.round(sideATotal * 100) / 100 },
		sideB: { rosterID: sideB.rosterID, players: sideBValues, totalValue: Math.round(sideBTotal * 100) / 100 },
		diff: Math.round(Math.abs(sideATotal - sideBTotal) * 100) / 100,
		favoredSide: sideATotal > sideBTotal + 2 ? 'A' : sideBTotal > sideATotal + 2 ? 'B' : 'even',
		currentWeek,
		maxWeek,
	};
}
