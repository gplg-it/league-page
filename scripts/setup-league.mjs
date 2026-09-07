#!/usr/bin/env node
/**
 * League Setup Script
 *
 * Fetches all league data from the Sleeper API and generates
 * a fully populated leagueInfo.js with manager profiles.
 *
 * Usage: node scripts/setup-league.mjs [leagueID]
 *
 * If no leagueID is provided, reads from src/lib/utils/leagueInfo.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const SLEEPER_API = 'https://api.sleeper.app/v1';

async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return res.json();
}

async function getLeagueChain(leagueID) {
    const seasons = [];
    let currentID = leagueID;
    while (currentID && currentID !== '0') {
        const league = await fetchJSON(`${SLEEPER_API}/league/${currentID}`);
        const users = await fetchJSON(`${SLEEPER_API}/league/${currentID}/users`);
        const rosters = await fetchJSON(`${SLEEPER_API}/league/${currentID}/rosters`);
        seasons.push({ league, users, rosters });
        currentID = league.previous_league_id;
    }
    return seasons;
}

function buildManagerProfiles(seasons) {
    const currentSeason = seasons[0];
    const { league, users, rosters } = currentSeason;

    const userMap = {};
    for (const u of users) {
        userMap[u.user_id] = u;
    }

    const allUserIDs = new Set();
    for (const season of seasons) {
        for (const u of season.users) {
            allUserIDs.add(u.user_id);
        }
    }

    const managers = [];
    for (const roster of rosters) {
        const user = userMap[roster.owner_id];
        if (!user) continue;

        const teamName = user.metadata?.team_name || user.display_name;
        const avatar = user.metadata?.avatar || (user.avatar ? `https://sleepercdn.com/avatars/thumbs/${user.avatar}` : null);

        managers.push({
            managerID: user.user_id,
            name: user.display_name,
            location: null,
            bio: `Manager of ${teamName} in the ${league.name || 'Grand Park League'}.`,
            photo: avatar ? avatar : '/managers/question.jpg',
            fantasyStart: null,
            favoriteTeam: null,
            mode: null,
            rival: null,
            favoritePlayer: null,
            valuePosition: null,
            rookieOrVets: null,
            philosophy: null,
            tradingScale: null,
            preferredContact: 'Sleeper',
        });
    }

    return managers;
}

function generateLeagueInfo(league, managers, isDynasty) {
    const managersJSON = JSON.stringify(managers, null, 4)
        .split('\n')
        .map((line, i) => i === 0 ? line : '    ' + line)
        .join('\n');

    const leagueName = league.name || 'Grand Park League';
    const totalTeams = league.total_rosters || managers.length;
    const scoringType = league.scoring_settings?.rec === 1 ? 'PPR' :
                        league.scoring_settings?.rec === 0.5 ? 'Half PPR' : 'Standard';

    const rosterSlots = league.roster_positions || [];
    const qbCount = rosterSlots.filter(p => p === 'QB').length;
    const rbCount = rosterSlots.filter(p => p === 'RB').length;
    const wrCount = rosterSlots.filter(p => p === 'WR').length;
    const teCount = rosterSlots.filter(p => p === 'TE').length;
    const flexCount = rosterSlots.filter(p => p === 'FLEX').length;
    const sfCount = rosterSlots.filter(p => p === 'SUPER_FLEX').length;
    const benchCount = rosterSlots.filter(p => p === 'BN').length;
    const irCount = rosterSlots.filter(p => p === 'IR').length;

    let formatDesc = isDynasty ? 'Dynasty' : 'Redraft';
    if (sfCount > 0) formatDesc += ' Superflex';

    return `/*   STEP 1   */
export const leagueID = "${league.league_id}";
export const leagueName = "${leagueName}";
export const dues = 100;
export const dynasty = ${isDynasty};
export const enableBlog = false;

/*   STEP 2   */
export const homepageText = \`
  <p>Welcome to the official home of <strong>${leagueName}</strong> — a ${totalTeams}-team ${formatDesc} ${scoringType} fantasy football league on Sleeper.</p>
  <p>Roster format: ${qbCount} QB, ${rbCount} RB, ${wrCount} WR, ${teCount} TE, ${flexCount} FLEX${sfCount ? `, ${sfCount} SF` : ''} — ${benchCount} bench, ${irCount} IR. ${isDynasty ? 'Dynasty rosters carry over each year with rookie drafts to restock.' : 'Full redraft each season.'}</p>
  <p>Use the navigation above to explore matchups, standings, records, analytics, and detailed manager profiles. The Analytics tab provides advanced statistical breakdowns including luck analysis, scoring trends, and season-over-season comparisons.</p>
\`;

/*   STEP 3   */
export const managers = ${managersJSON};
`;
}

async function main() {
    let leagueID = process.argv[2];

    if (!leagueID) {
        const infoPath = path.join(ROOT, 'src/lib/utils/leagueInfo.js');
        const content = fs.readFileSync(infoPath, 'utf-8');
        const match = content.match(/leagueID\s*=\s*["'](\d+)["']/);
        if (match) leagueID = match[1];
    }

    if (!leagueID) {
        console.error('Error: No league ID provided and could not read from leagueInfo.js');
        process.exit(1);
    }

    console.log(`Fetching data for league ${leagueID}...`);

    const seasons = await getLeagueChain(leagueID);
    const currentLeague = seasons[0].league;

    console.log(`League: ${currentLeague.name}`);
    console.log(`Season: ${currentLeague.season}`);
    console.log(`Teams: ${currentLeague.total_rosters}`);
    console.log(`Seasons found: ${seasons.length}`);
    console.log(`Status: ${currentLeague.status}`);

    const isDynasty = currentLeague.settings?.type === 2;
    const managers = buildManagerProfiles(seasons);

    console.log(`\nManagers found: ${managers.length}`);
    for (const m of managers) {
        console.log(`  - ${m.name} (${m.managerID})`);
    }

    const output = generateLeagueInfo(currentLeague, managers, isDynasty);
    const outPath = path.join(ROOT, 'src/lib/utils/leagueInfo.js');
    fs.writeFileSync(outPath, output, 'utf-8');
    console.log(`\nWrote ${outPath}`);

    // Also write raw league data for reference
    const dataDir = path.join(ROOT, 'scripts', 'league-data');
    fs.mkdirSync(dataDir, { recursive: true });

    fs.writeFileSync(
        path.join(dataDir, 'league.json'),
        JSON.stringify(currentLeague, null, 2)
    );
    fs.writeFileSync(
        path.join(dataDir, 'users.json'),
        JSON.stringify(seasons[0].users, null, 2)
    );
    fs.writeFileSync(
        path.join(dataDir, 'rosters.json'),
        JSON.stringify(seasons[0].rosters, null, 2)
    );
    fs.writeFileSync(
        path.join(dataDir, 'seasons.json'),
        JSON.stringify(seasons.map(s => ({
            league_id: s.league.league_id,
            season: s.league.season,
            name: s.league.name,
            status: s.league.status,
            total_rosters: s.league.total_rosters,
            users_count: s.users.length,
        })), null, 2)
    );
    console.log(`Wrote raw league data to ${dataDir}/`);
}

main().catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
});
