<script>
    let { datasets = [], labels = [], size = 300 } = $props();

    let hoveredIndex = $state(null);
    let hoveredDataset = $state(null);

    const padding = 40;
    const labelPadding = 24;
    const cx = size / 2;
    const cy = size / 2;
    const radius = (size / 2) - padding - labelPadding;

    const levels = [0.25, 0.5, 0.75, 1.0];
    const angleStep = $derived((2 * Math.PI) / (labels.length || 1));

    const getPoint = (index, valuePct, r) => {
        const angle = (index * angleStep) - Math.PI / 2;
        const dist = (valuePct ?? 0) * (r ?? radius);
        return {
            x: cx + dist * Math.cos(angle),
            y: cy + dist * Math.sin(angle),
        };
    };

    let gridRings = $derived(levels.map(level => {
        const pts = labels.map((_, i) => getPoint(i, level));
        return pts.map(p => `${p.x},${p.y}`).join(' ');
    }));

    let axisLines = $derived(labels.map((_, i) => {
        const outer = getPoint(i, 1);
        return { x1: cx, y1: cy, x2: outer.x, y2: outer.y };
    }));

    let labelPositions = $derived(labels.map((label, i) => {
        const pt = getPoint(i, 1, radius + labelPadding);
        const angle = (i * angleStep) - Math.PI / 2;
        let anchor = 'middle';
        if (Math.cos(angle) > 0.1) anchor = 'start';
        else if (Math.cos(angle) < -0.1) anchor = 'end';
        return { text: label, x: pt.x, y: pt.y, anchor };
    }));

    let polygons = $derived(datasets.map(ds => {
        const pts = ds.data.map((d, i) => {
            const pct = d.max > 0 ? Math.min(d.value / d.max, 1) : 0;
            return getPoint(i, pct);
        });
        return pts.map(p => `${p.x},${p.y}`).join(' ');
    }));

    const handleHover = (datasetIdx, pointIdx) => {
        hoveredDataset = datasetIdx;
        hoveredIndex = pointIdx;
    };

    const clearHover = () => {
        hoveredDataset = null;
        hoveredIndex = null;
    };

    let tooltipInfo = $derived.by(() => {
        if (hoveredDataset === null || hoveredIndex === null) return null;
        const ds = datasets[hoveredDataset];
        if (!ds) return null;
        const d = ds.data[hoveredIndex];
        if (!d) return null;
        const pct = d.max > 0 ? Math.min(d.value / d.max, 1) : 0;
        const pt = getPoint(hoveredIndex, pct);
        return {
            x: pt.x,
            y: pt.y - 12,
            text: `${labels[hoveredIndex]}: ${d.value}`,
            name: ds.label,
            color: ds.color,
        };
    });
</script>

<style>
    .radarContainer {
        width: 100%;
        max-width: 420px;
        margin: 0 auto;
    }

    svg {
        width: 100%;
        height: auto;
    }

    .gridRing {
        fill: none;
        stroke: var(--eee, #e0e0e0);
        stroke-width: 1;
    }

    .axisLine {
        stroke: var(--eee, #e0e0e0);
        stroke-width: 1;
    }

    .axisLabel {
        font-size: 10px;
        fill: var(--g333, #555);
    }

    .levelLabel {
        font-size: 8px;
        fill: #aaa;
    }

    .dataPolygon {
        stroke-width: 2;
        transition: opacity 0.2s;
    }

    .dataPoint {
        stroke: #fff;
        stroke-width: 2;
        cursor: pointer;
        transition: r 0.15s;
    }

    .dataPoint:hover {
        r: 6;
    }

    .tooltip {
        pointer-events: none;
    }

    .tooltipBg {
        fill: rgba(0,0,0,0.8);
        rx: 4;
        ry: 4;
    }

    .tooltipText {
        fill: #fff;
        font-size: 10px;
        font-weight: 600;
    }
</style>

<div class="radarContainer">
    <svg viewBox="0 0 {size} {size}">
        {#each gridRings as ring, i}
            <polygon points={ring} class="gridRing" />
            {@const lvlPt = getPoint(0, levels[i])}
            <text x={lvlPt.x + 3} y={lvlPt.y - 2} class="levelLabel">{Math.round(levels[i] * 100)}%</text>
        {/each}

        {#each axisLines as axis}
            <line x1={axis.x1} y1={axis.y1} x2={axis.x2} y2={axis.y2} class="axisLine" />
        {/each}

        {#each labelPositions as lbl}
            <text x={lbl.x} y={lbl.y} text-anchor={lbl.anchor} dominant-baseline="central" class="axisLabel">{lbl.text}</text>
        {/each}

        {#each datasets as ds, di}
            <polygon
                points={polygons[di]}
                class="dataPolygon"
                fill={ds.color}
                fill-opacity="0.2"
                stroke={ds.color}
                opacity={hoveredDataset !== null && hoveredDataset !== di ? 0.3 : 1}
            />
        {/each}

        {#each datasets as ds, di}
            {#each ds.data as d, pi}
                {@const pct = d.max > 0 ? Math.min(d.value / d.max, 1) : 0}
                {@const pt = getPoint(pi, pct)}
                <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="4"
                    fill={ds.color}
                    class="dataPoint"
                    onmouseenter={() => handleHover(di, pi)}
                    onmouseleave={clearHover}
                />
            {/each}
        {/each}

        {#if tooltipInfo}
            {@const textLen = tooltipInfo.text.length * 6 + 16}
            <g class="tooltip">
                <rect
                    class="tooltipBg"
                    x={tooltipInfo.x - textLen / 2}
                    y={tooltipInfo.y - 20}
                    width={textLen}
                    height="18"
                />
                <text
                    x={tooltipInfo.x}
                    y={tooltipInfo.y - 8}
                    text-anchor="middle"
                    class="tooltipText"
                >{tooltipInfo.text}</text>
            </g>
        {/if}
    </svg>
</div>
