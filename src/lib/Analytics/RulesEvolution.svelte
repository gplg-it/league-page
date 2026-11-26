<script>
    let {allSeasons} = $props();

    let sortedSeasons = $derived(
        (allSeasons || []).slice().sort((a, b) => a.year - b.year)
    );

    let expandedYear = $state(null);

    const scoringLabels = {
        pass_yd: "Pass Yd", pass_td: "Pass TD", pass_int: "INT Thrown", pass_2pt: "Pass 2PT",
        rush_yd: "Rush Yd", rush_td: "Rush TD", rush_2pt: "Rush 2PT",
        rec: "Reception", rec_yd: "Rec Yd", rec_td: "Rec TD", rec_2pt: "Rec 2PT", bonus_rec_te: "TE Premium",
        fum_lost: "Fumble Lost", fum: "Fumble",
        st_td: "ST TD", def_td: "Def TD", sack: "Sack", int: "Interception",
        ff: "Forced Fumble", fum_rec: "Fumble Recovery", safe: "Safety", blk_kick: "Blocked Kick",
        pts_allow_0: "Pts Allow 0", pts_allow_1_6: "Pts Allow 1-6", pts_allow_7_13: "Pts Allow 7-13",
        pts_allow_14_20: "Pts Allow 14-20", pts_allow_21_27: "Pts Allow 21-27",
        pts_allow_28_34: "Pts Allow 28-34", pts_allow_35p: "Pts Allow 35+",
        bonus_rush_yd_100: "100yd Rush Bonus", bonus_rec_yd_100: "100yd Rec Bonus", bonus_pass_yd_300: "300yd Pass Bonus",
    };

    const settingLabels = {
        playoff_week_start: 'Playoff Start Week',
        playoff_teams: 'Playoff Teams',
        num_teams: 'League Size',
        trade_deadline: 'Trade Deadline (Week)',
        waiver_type: 'Waiver Type',
        waiver_budget: 'FAAB Budget',
        max_keepers: 'Max Keepers',
        pick_trading: 'Pick Trading',
        taxi_slots: 'Taxi Slots',
        reserve_slots: 'IR Slots',
    };

    const trackedSettings = Object.keys(settingLabels);

    const formatScoringKey = (key) => scoringLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const summarizePositions = (positions) => {
        if(!positions || !positions.length) return 'N/A';
        const counts = {};
        for(const p of positions) {
            counts[p] = (counts[p] || 0) + 1;
        }
        return Object.entries(counts)
            .filter(([k]) => k !== 'BN')
            .map(([k, v]) => `${v}${k}`)
            .join(' / ');
    };

    const formatWaiverType = (type) => {
        if(type === 2) return 'FAAB';
        if(type === 1) return 'Rolling';
        return type === 0 ? 'Standard' : String(type);
    };

    let settingsDiffs = $derived.by(() => {
        const diffs = [];
        for(let i = 1; i < sortedSeasons.length; i++) {
            const prev = sortedSeasons[i - 1];
            const curr = sortedSeasons[i];
            const changes = [];

            for(const key of trackedSettings) {
                const from = prev.leagueSettings?.[key];
                const to = curr.leagueSettings?.[key];
                if(from !== to && (from !== undefined || to !== undefined)) {
                    changes.push({
                        key,
                        label: settingLabels[key],
                        from: from ?? 'N/A',
                        to: to ?? 'N/A',
                        type: 'setting',
                    });
                }
            }

            const prevPos = (prev.rosterPositions || []).slice().sort().join(',');
            const currPos = (curr.rosterPositions || []).slice().sort().join(',');
            if(prevPos !== currPos) {
                changes.push({
                    key: 'roster_positions',
                    label: 'Roster Slots',
                    from: summarizePositions(prev.rosterPositions),
                    to: summarizePositions(curr.rosterPositions),
                    type: 'setting',
                });
            }

            const allScoringKeys = new Set([
                ...Object.keys(prev.scoringSettings || {}),
                ...Object.keys(curr.scoringSettings || {}),
            ]);
            for(const key of allScoringKeys) {
                const from = prev.scoringSettings?.[key] ?? 0;
                const to = curr.scoringSettings?.[key] ?? 0;
                if(from !== to) {
                    changes.push({ key, label: formatScoringKey(key), from, to, type: 'scoring' });
                }
            }

            diffs.push({ year: curr.year, changes });
        }
        return diffs;
    });

    let totalChanges = $derived(
        settingsDiffs.reduce((sum, d) => sum + d.changes.length, 0)
    );

    const getDiffForYear = (year) => settingsDiffs.find(d => d.year === year);

    const toggleYear = (year) => {
        expandedYear = expandedYear === year ? null : year;
    };

    const keyScoringKeys = ['pass_td', 'rush_td', 'rec_td', 'rec', 'pass_yd', 'rush_yd', 'rec_yd', 'fum_lost'];
</script>

<style>
    .statsSection {
        margin: 2em auto;
        max-width: 1200px;
    }

    h2 {
        font-size: 1.5em;
        margin: 1.5em 0 0.5em;
        text-align: center;
    }

    .description {
        text-align: center;
        font-size: 0.85em;
        color: #888;
        margin: 0 0 1.5em;
        font-style: italic;
    }

    .summaryCards {
        display: flex;
        flex-wrap: wrap;
        gap: 1em;
        justify-content: center;
        margin: 1.5em 0 2em;
    }

    .summaryCard {
        background: var(--f3f3f3);
        border-radius: 8px;
        padding: 1em 1.5em;
        text-align: center;
        min-width: 130px;
    }

    .summaryCard .value {
        font-size: 1.8em;
        font-weight: 700;
        color: #920505;
    }

    .summaryCard .label {
        font-size: 0.8em;
        color: #888;
        margin-top: 4px;
    }

    .timeline {
        position: relative;
        margin: 2em 0;
        padding-left: 40px;
    }

    .timelineLine {
        position: absolute;
        left: 18px;
        top: 0;
        bottom: 0;
        width: 2px;
        background: var(--eee);
    }

    .timelineItem {
        position: relative;
        padding-bottom: 8px;
    }

    .timelineNode {
        position: absolute;
        left: -30px;
        top: 4px;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        border: 2px solid #ccc;
        background: var(--fff);
        cursor: pointer;
        transition: all 0.2s;
        z-index: 1;
    }

    .timelineNode.hasChanges {
        border-color: #920505;
        background: rgba(146, 5, 5, 0.1);
    }

    .timelineNode.inaugural {
        border-color: #920505;
        background: #920505;
    }

    .timelineNode.expanded {
        border-color: #920505;
        background: #920505;
        box-shadow: 0 0 0 4px rgba(146, 5, 5, 0.2);
    }

    .timelineHeader {
        display: flex;
        align-items: center;
        gap: 10px;
        cursor: pointer;
        padding: 4px 0;
    }

    .timelineHeader:hover .yearLabel {
        color: #920505;
    }

    .yearLabel {
        font-size: 1.1em;
        font-weight: 700;
        transition: color 0.2s;
    }

    .yearMeta {
        font-size: 0.8em;
        color: #888;
    }

    .changeBadge {
        display: inline-block;
        font-size: 0.7em;
        padding: 2px 8px;
        border-radius: 10px;
        background: rgba(146, 5, 5, 0.1);
        color: #920505;
        font-weight: 600;
    }

    .inauguralBadge {
        display: inline-block;
        font-size: 0.7em;
        padding: 2px 8px;
        border-radius: 10px;
        background: #920505;
        color: #fff;
        font-weight: 600;
    }

    .expandedContent {
        margin: 10px 0 20px;
    }

    .settingsGrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 8px;
        margin: 10px 0;
    }

    .settingChip {
        background: var(--f3f3f3);
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 0.8em;
    }

    .settingChip .chipLabel {
        color: #888;
        font-size: 0.85em;
    }

    .settingChip .chipValue {
        font-weight: 600;
        margin-top: 2px;
    }

    .changesBox {
        border: 1px solid var(--eee);
        background: var(--f3f3f3);
        border-radius: 8px;
        padding: 12px 16px;
        margin: 10px 0;
    }

    .changesTitle {
        font-size: 0.8em;
        font-weight: 700;
        color: #920505;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 8px;
    }

    .changeRow {
        display: flex;
        align-items: center;
        gap: 8px;
        margin: 4px 0;
        font-size: 0.85em;
    }

    .changeDot {
        width: 6px;
        height: 6px;
        border-radius: 50%;
        flex-shrink: 0;
    }

    .changeDot.setting { background: #920505; }
    .changeDot.scoring { background: #4a90d9; }

    .changeLabel {
        color: #888;
    }

    .changeFrom {
        text-decoration: line-through;
        color: #d94a4a;
        opacity: 0.7;
    }

    .changeArrow {
        color: #920505;
    }

    .changeTo {
        color: #5bb974;
        font-weight: 500;
    }

    .scoringSnapshot {
        margin: 10px 0;
    }

    .scoringSnapshotTitle {
        font-size: 0.8em;
        font-weight: 600;
        color: #888;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 6px;
    }

    .scoringChips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
    }

    .scoringChip {
        font-size: 0.75em;
        background: var(--f3f3f3);
        border: 1px solid var(--eee);
        padding: 4px 10px;
        border-radius: 4px;
        font-family: monospace;
    }

    .scoringChip .scoringVal {
        color: #920505;
        font-weight: 700;
    }

    @media (max-width: 540px) {
        .timeline {
            padding-left: 32px;
        }
        .timelineNode {
            left: -24px;
            width: 12px;
            height: 12px;
        }
        .settingsGrid {
            grid-template-columns: 1fr 1fr;
        }
    }
</style>

<div class="statsSection">
    <h2>Rules Evolution</h2>
    <p class="description">How the league's format, scoring, and settings have changed across seasons</p>

    {#if sortedSeasons.length > 0}
        <div class="summaryCards">
            <div class="summaryCard">
                <div class="value">{sortedSeasons.length}</div>
                <div class="label">Seasons</div>
            </div>
            <div class="summaryCard">
                <div class="value">{totalChanges}</div>
                <div class="label">Total Changes</div>
            </div>
            <div class="summaryCard">
                <div class="value">{sortedSeasons[0]?.year}–{sortedSeasons[sortedSeasons.length - 1]?.year}</div>
                <div class="label">Active Years</div>
            </div>
            <div class="summaryCard">
                <div class="value">{settingsDiffs.filter(d => d.changes.some(c => c.type === 'scoring')).length}</div>
                <div class="label">Scoring Changes</div>
            </div>
        </div>

        <div class="timeline">
            <div class="timelineLine"></div>
            {#each [...sortedSeasons].reverse() as season, i}
                {@const isFirst = i === sortedSeasons.length - 1}
                {@const diff = getDiffForYear(season.year)}
                {@const hasChanges = diff && diff.changes.length > 0}
                {@const isExpanded = expandedYear === season.year}
                <div class="timelineItem">
                    <div
                        class="timelineNode"
                        class:hasChanges
                        class:inaugural={isFirst}
                        class:expanded={isExpanded}
                        onclick={() => toggleYear(season.year)}
                    ></div>
                    <div class="timelineHeader" onclick={() => toggleYear(season.year)}>
                        <span class="yearLabel">{season.year}</span>
                        <span class="yearMeta">
                            {season.numRosters} teams · {season.status === 'complete' ? 'Complete' : season.status === 'in_season' ? 'In Season' : 'Pre-draft'}
                        </span>
                        {#if hasChanges && !isFirst}
                            <span class="changeBadge">
                                {diff.changes.length} change{diff.changes.length !== 1 ? 's' : ''}
                            </span>
                        {/if}
                        {#if isFirst}
                            <span class="inauguralBadge">INAUGURAL</span>
                        {/if}
                    </div>

                    {#if isExpanded}
                        <div class="expandedContent">
                            <div class="settingsGrid">
                                <div class="settingChip">
                                    <div class="chipLabel">Playoffs</div>
                                    <div class="chipValue">Week {season.leagueSettings?.playoff_week_start} · {season.leagueSettings?.playoff_teams} teams</div>
                                </div>
                                <div class="settingChip">
                                    <div class="chipLabel">Waiver</div>
                                    <div class="chipValue">{formatWaiverType(season.leagueSettings?.waiver_type)}</div>
                                </div>
                                <div class="settingChip">
                                    <div class="chipLabel">Roster</div>
                                    <div class="chipValue">{(season.rosterPositions || []).filter(p => p !== 'BN').length} starters</div>
                                </div>
                                <div class="settingChip">
                                    <div class="chipLabel">Trade Deadline</div>
                                    <div class="chipValue">Week {season.leagueSettings?.trade_deadline || 'None'}</div>
                                </div>
                            </div>

                            {#if hasChanges && !isFirst}
                                {@const prevSeason = sortedSeasons.find(s => s.year < season.year)}
                                <div class="changesBox">
                                    <div class="changesTitle">Changes from {prevSeason?.year || 'previous season'}</div>
                                    {#each diff.changes as change}
                                        <div class="changeRow">
                                            <div class="changeDot" class:setting={change.type === 'setting'} class:scoring={change.type === 'scoring'}></div>
                                            <span class="changeLabel">{change.label}:</span>
                                            <span class="changeFrom">{change.from}</span>
                                            <span class="changeArrow">→</span>
                                            <span class="changeTo">{change.to}</span>
                                        </div>
                                    {/each}
                                </div>
                            {/if}

                            <div class="scoringSnapshot">
                                <div class="scoringSnapshotTitle">Scoring Snapshot</div>
                                <div class="scoringChips">
                                    {#each keyScoringKeys as key}
                                        {#if season.scoringSettings?.[key] !== undefined}
                                            <span class="scoringChip">
                                                {formatScoringKey(key)}: <span class="scoringVal">{season.scoringSettings[key]}</span>
                                            </span>
                                        {/if}
                                    {/each}
                                </div>
                            </div>
                        </div>
                    {/if}
                </div>
            {/each}
        </div>
    {:else}
        <p style="text-align: center; color: #888;">No season data available.</p>
    {/if}
</div>
