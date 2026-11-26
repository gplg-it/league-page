import { leagueID } from "$lib/utils/leagueInfo"
import { buildPlayersInfo } from "$lib/utils/helperFunctions/computePlayers"
import { json, error } from '@sveltejs/kit';

// Building the players map parses several MB of Sleeper JSON, which is close to
// the CPU budget of a Cloudflare Worker on the free plan. The Cache-Control
// header lets the adapter's worker keep a successful result in the edge cache so
// repeat requests skip the work entirely. If the worker still fails, the client
// (see helperFunctions/players.js) rebuilds the map directly from Sleeper.
const CACHE_SECONDS = 3600;

export async function GET() {
    let players;
    try {
        players = await buildPlayersInfo(leagueID, fetch);
    } catch(e) {
        console.error(e);
        throw error(500, "No luck");
    }

    return json(players, {
        headers: {
            'Cache-Control': `public, max-age=${CACHE_SECONDS}`
        }
    });
}
