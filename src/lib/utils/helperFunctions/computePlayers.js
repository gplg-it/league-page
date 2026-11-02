import { round } from "./universalFunctions";

const SLEEPER = 'https://api.sleeper.app';
const PROJECTION_QUERY = 'season_type=regular&position[]=DB&position[]=DEF&position[]=DL&position[]=FLEX&position[]=IDP_FLEX&position[]=K&position[]=LB&position[]=QB&position[]=RB&position[]=REC_FLEX&position[]=SUPER_FLEX&position[]=TE&position[]=WR&position[]=WRRB_FLEX&order_by=ppr';

/**
 * Fetch a URL and read the JSON body immediately. Reading the body as soon as
 * the response arrives matters on Cloudflare Workers, which allow only six
 * concurrent outbound connections and cancel stalled responses.
 */
export const fetchJSON = async (url, fetchFn = fetch) => {
    const res = await fetchFn(url, {compress: true});
    if(!res.ok) {
        await res.body?.cancel?.();
        throw new Error(`Sleeper request failed (${res.status}): ${url}`);
    }
    return res.json();
};

/**
 * Pull everything needed to build the players map straight from Sleeper and
 * compute it. Runs anywhere `fetch` exists (worker or browser).
 */
export const buildPlayersInfo = async (leagueID, fetchFn = fetch) => {
    const [nflState, leagueData, playoffs] = await Promise.all([
        fetchJSON(`${SLEEPER}/v1/state/nfl`, fetchFn),
        fetchJSON(`${SLEEPER}/v1/league/${leagueID}`, fetchFn),
        fetchJSON(`${SLEEPER}/v1/league/${leagueID}/winners_bracket`, fetchFn),
    ]);

    const year = nflState.league_season;
    const regularSeasonLength = leagueData.settings.playoff_week_start - 1;
    const playoffLength = playoffs.pop().r;
    const fullSeasonLength = regularSeasonLength + playoffLength;

    const promises = [fetchJSON(`${SLEEPER}/v1/players/nfl`, fetchFn)];
    for(let week = 1; week <= fullSeasonLength + 3; week++) {
        promises.push(fetchJSON(`${SLEEPER}/projections/nfl/${year}/${week}?${PROJECTION_QUERY}`, fetchFn));
    }

    const weeklyData = await Promise.all(promises);
    const playerData = weeklyData.shift(); // first item is all player data, remaining items are weekly projections

    return computePlayers(playerData, weeklyData, leagueData.scoring_settings);
};

export const computePlayers = (playerData, weeklyData, scoringSettings) => {
    const computedPlayers = {};

    // create non weekly dependent player info
    for(const id in playerData) {
        const projPlayer = playerData[id];
        const player = {
            fn: projPlayer.first_name,
            ln: projPlayer.last_name,
            pos: projPlayer.position,
        };
        if(projPlayer.team) {
            player.t = projPlayer.team;
            player.wi = {};
        }
        if(projPlayer.team && projPlayer.injury_status) {
            player.is = projPlayer.injury_status;
        }

        computedPlayers[id] = player;
    }

    // add weekly projections
    for(let week = 1; week <= weeklyData.length; week++) {
        for(const player of weeklyData[week - 1]) {
            const id = player.player_id;

            // check if the player is active in the NFL
            if(computedPlayers[id] == null || !computedPlayers[id].wi) continue;

            computedPlayers[id].wi[week] = {
                p: calculateProjection(player.stats, scoringSettings),
                o: player.opponent
            }
        }
    }

    computedPlayers["OAK"] = computedPlayers["LV"];
    return computedPlayers;
};

const calculateProjection = (projectedStats, scoreSettings) => {
    let score = 0;
    for(const stat in projectedStats) {
        const multiplier = scoreSettings[stat] ? scoreSettings[stat] : 0;
        score += projectedStats[stat] * multiplier;
    }
    return round(score);
};
