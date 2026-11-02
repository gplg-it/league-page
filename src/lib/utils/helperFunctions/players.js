import { get } from 'svelte/store';
import {players} from '$lib/stores';
import { browser } from '$app/environment';
import { leagueID } from '$lib/utils/leagueInfo';
import { buildPlayersInfo } from './computePlayers';

// Fetch the computed players map from our API route. If the worker fails (for
// example it exceeded its CPU budget), rebuild the map in the browser straight
// from Sleeper, which allows cross-origin requests.
const fetchPlayersInfo = async (smartFetch) => {
    try {
        const res = await smartFetch(`/api/fetch_players_info`, {compress: true});
        if(res.ok) {
            return await res.json();
        }
        console.warn(`/api/fetch_players_info responded ${res.status}; building players info client-side`);
    } catch(err) {
        console.warn(`/api/fetch_players_info failed (${err?.message}); building players info client-side`);
    }
    return buildPlayersInfo(leagueID, smartFetch);
};

// Several components on one page can request players at the same time (the
// homepage does). Share a single in-flight request between them.
let inFlight = null;
const fetchPlayersInfoOnce = (smartFetch) => {
    if(!inFlight) {
        inFlight = fetchPlayersInfo(smartFetch).finally(() => { inFlight = null; });
    }
    return inFlight;
};

export const loadPlayers = async (servFetch, refresh = false) => {     
	if(get(players)[1426]) {
		return {
            players: get(players),
            stale: false
        };
	}

    // Universal load functions also run on the server during SSR, but every
    // consumer awaits this promise in the browser, so skip the expensive work
    // there. The browser re-runs the load and fetches the real data.
    if(!browser) {
        return {
            players: {},
            stale: false
        };
    }

    const smartFetch = servFetch ?? fetch;
    
    const now = Math.round(new Date().getTime() / 1000);
    let playersInfo = null;
    let expiration = null;
    try {
        playersInfo = JSON.parse(localStorage.getItem("playersInfo"));
        expiration = parseInt(localStorage.getItem("expiration"));
    } catch(err) {
        console.warn(`Could not read cached players info: ${err?.message}`);
    }

    if(playersInfo && playersInfo[1426] && expiration && now > expiration && !refresh) {
        return {
            players: playersInfo,
            stale: true
        }
    }
    
    if(!playersInfo || !expiration || now > expiration) {
        const data = await fetchPlayersInfoOnce(smartFetch);

        try {
            localStorage.setItem("playersInfo", JSON.stringify(data))

            const ts = Math.round(new Date().getTime() / 1000);
            const newExpiration = ts + (24 * 3600);

            localStorage.setItem("expiration", newExpiration)  
        } catch(err) {
            console.warn(`Could not cache players info: ${err?.message}`);
        }

        players.update(() => data);

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
