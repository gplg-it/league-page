import { get } from 'svelte/store';
import {players} from '$lib/stores';
import { browser } from '$app/environment';
import { leagueID } from '$lib/utils/leagueInfo';
import { waitForAll } from './multiPromise';

const round = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

const calculateProjection = (projectedStats, scoreSettings) => {
    let score = 0;
    for(const stat in projectedStats) {
        const multiplier = scoreSettings[stat] ? scoreSettings[stat] : 0;
        score += projectedStats[stat] * multiplier;
    }
    return round(score);
}

const computePlayers = (playerData, weeklyData, scoringSettings) => {
    const computedPlayers = {};
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
    for(let week = 1; week <= weeklyData.length; week++) {
        for(const player of weeklyData[week - 1]) {
            const id = player.player_id;
            if(computedPlayers[id] == null || !computedPlayers[id].wi) continue;
            computedPlayers[id].wi[week] = {
                p: calculateProjection(player.stats, scoringSettings),
                o: player.opponent
            }
        }
    }
    computedPlayers["OAK"] = computedPlayers["LV"];
    return computedPlayers;
}

const fetchPlayersFromAPI = async () => {
    const [nflStateRes, leagueDataRes, playoffsRes] = await waitForAll(
        fetch(`https://api.sleeper.app/v1/state/nfl`),
        fetch(`https://api.sleeper.app/v1/league/${leagueID}`),
        fetch(`https://api.sleeper.app/v1/league/${leagueID}/winners_bracket`),
    );
    const [nflState, leagueData, playoffs] = await waitForAll(
        nflStateRes.json(),
        leagueDataRes.json(),
        playoffsRes.json(),
    );

    let year = nflState.league_season;
    const regularSeasonLength = leagueData.settings.playoff_week_start - 1;
    const playoffLength = playoffs.pop().r;
    const fullSeasonLength = regularSeasonLength + playoffLength;

    const resPromises = [
        fetch(`https://api.sleeper.app/v1/players/nfl`)
    ];
    for(let week = 1; week <= fullSeasonLength + 3; week++) {
        resPromises.push(
            fetch(`https://api.sleeper.app/projections/nfl/${year}/${week}?season_type=regular&position[]=DB&position[]=DEF&position[]=DL&position[]=FLEX&position[]=IDP_FLEX&position[]=K&position[]=LB&position[]=QB&position[]=RB&position[]=REC_FLEX&position[]=SUPER_FLEX&position[]=TE&position[]=WR&position[]=WRRB_FLEX&order_by=ppr`)
        );
    }

    const responses = await waitForAll(...resPromises);
    const resJSONs = [];
    for(const res of responses) {
        if(!res.ok) {
            throw new Error("Failed to fetch player data");
        }
        resJSONs.push(res.json());
    }

    const weeklyData = await waitForAll(...resJSONs);
    const playerData = weeklyData.shift();
    const scoringSettings = leagueData.scoring_settings;
    return computePlayers(playerData, weeklyData, scoringSettings);
}

export const loadPlayers = async (servFetch, refresh = false) => {
	if(get(players)[1426]) {
		return {
            players: get(players),
            stale: false
        };
	}

    const now = Math.round(new Date().getTime() / 1000);
    let playersInfo = null;
    let expiration = null;
    if(browser) {
        playersInfo = JSON.parse(localStorage.getItem("playersInfo"));
        expiration = parseInt(localStorage.getItem("expiration"));
    }

    if(playersInfo && playersInfo[1426] && expiration && now > expiration && !refresh) {
        return {
            players: playersInfo,
            stale: true
        }
    }

    if(!playersInfo || !expiration || now > expiration) {
        const data = await fetchPlayersFromAPI();

        if(browser) {
            localStorage.setItem("playersInfo", JSON.stringify(data))
            const ts = Math.round(new Date().getTime() / 1000);
            const newExpiration = ts + (24 * 3600);
            localStorage.setItem("expiration", newExpiration)
            players.update(() => data);
        }

        return {
            players: data,
            stale: false
        };
    }
    players.update(() => playersInfo);
    return {
        players: playersInfo,
        stale: false
    };
}