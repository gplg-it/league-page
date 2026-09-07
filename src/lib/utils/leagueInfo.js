/*   STEP 1   */
export const leagueID = "1399924711089033216";
export const leagueName = "Grand Park League";
export const dues = 100;
export const dynasty = true;
export const enableBlog = false;

/*   STEP 2   */
export const homepageText = `
  <p>Welcome to the official home of <strong>Grand Park League</strong> — a competitive dynasty fantasy football league on Sleeper.</p>
  <p>Explore matchups, standings, records, and our advanced analytics dashboard featuring luck analysis, scoring trends, and season-over-season comparisons. Use the navigation above to dive into the full league experience.</p>
  <p>Visit the <strong>Analytics</strong> tab for deep statistical breakdowns including manager performance metrics, all-play records, lineup efficiency ratings, and luck index measurements that reveal who the schedule has favored — and who it hasn't.</p>
`;

/*   STEP 3   */
/*
To populate manager profiles automatically from Sleeper API data,
run: node scripts/setup-league.mjs

This will fetch all users, rosters, and league history and generate
the managers array below with display names, avatars, and bios.
*/
export const managers = [];
