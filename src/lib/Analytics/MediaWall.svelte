<script>
    import { browser } from '$app/environment';

    let memories = $state([]);
    let showForm = $state(false);
    let newTitle = $state('');
    let newDescription = $state('');
    let newUrl = $state('');
    let newType = $state('photo');
    let newSeason = $state('');

    const STORAGE_KEY = 'league-media-wall';

    $effect(() => {
        if(browser) {
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if(stored) memories = JSON.parse(stored);
            } catch(e) { /* ignore */ }
        }
    });

    const saveMemories = () => {
        if(browser) {
            try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memories)); } catch(e) { /* ignore */ }
        }
    };

    const addMemory = () => {
        if(!newTitle.trim() || !newUrl.trim()) return;
        const memory = {
            id: Date.now(),
            title: newTitle.trim(),
            description: newDescription.trim(),
            url: newUrl.trim(),
            type: newType,
            season: newSeason.trim(),
            addedAt: new Date().toISOString(),
        };
        memories = [memory, ...memories];
        saveMemories();
        newTitle = '';
        newDescription = '';
        newUrl = '';
        newType = 'photo';
        newSeason = '';
        showForm = false;
    };

    const removeMemory = (id) => {
        memories = memories.filter(m => m.id !== id);
        saveMemories();
    };

    const isVideo = (url) => {
        return url.includes('youtube.com') || url.includes('youtu.be') || url.includes('vimeo.com') || url.match(/\.(mp4|webm|mov)$/i);
    };

    const getYoutubeEmbed = (url) => {
        const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([\w-]+)/);
        return match ? `https://www.youtube.com/embed/${match[1]}` : null;
    };
</script>

<style>
    .mediaWrapper {
        margin: 2em 0;
    }

    h2 {
        text-align: center;
        margin: 0 0 0.5em;
    }

    .description {
        text-align: center;
        color: #888;
        font-size: 0.85em;
        margin: 0 0 1em;
    }

    .addBtn {
        display: block;
        margin: 0 auto 1.5em;
        padding: 8px 24px;
        background: #920505;
        color: #fff;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9em;
    }

    .addBtn:hover { background: #b00606; }

    .formOverlay {
        border: 1px solid #ddd;
        border-radius: 8px;
        padding: 1.5em;
        margin: 0 0 2em;
        max-width: 600px;
        margin-left: auto;
        margin-right: auto;
    }

    .formOverlay h3 {
        margin: 0 0 1em;
        text-align: center;
    }

    .formGroup {
        margin: 0 0 0.75em;
    }

    .formGroup label {
        display: block;
        font-size: 0.85em;
        font-weight: 600;
        margin: 0 0 0.25em;
    }

    .formGroup input, .formGroup select, .formGroup textarea {
        width: 100%;
        padding: 8px 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 0.9em;
        background: var(--fff);
        color: var(--g333);
        box-sizing: border-box;
    }

    .formGroup textarea {
        resize: vertical;
        min-height: 60px;
    }

    .formActions {
        display: flex;
        gap: 0.5em;
        justify-content: flex-end;
        margin-top: 1em;
    }

    .formActions button {
        padding: 6px 16px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 0.85em;
    }

    .btnSave {
        background: #920505;
        color: #fff;
        border: none;
    }

    .btnCancel {
        background: transparent;
        border: 1px solid #ccc;
        color: var(--g333);
    }

    .mediaGrid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1.25em;
    }

    .memoryCard {
        border: 1px solid #ddd;
        border-radius: 8px;
        overflow: hidden;
    }

    .memoryMedia {
        width: 100%;
        aspect-ratio: 16 / 9;
        object-fit: cover;
        display: block;
        background: #111;
    }

    .memoryMedia iframe {
        width: 100%;
        height: 100%;
        border: none;
    }

    .memoryInfo {
        padding: 0.75em 1em;
    }

    .memoryInfo .title {
        font-weight: 600;
        margin: 0 0 0.25em;
    }

    .memoryInfo .desc {
        font-size: 0.8em;
        color: #888;
    }

    .memoryInfo .meta {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 0.5em;
        font-size: 0.75em;
        color: #999;
    }

    .removeBtn {
        background: none;
        border: none;
        color: #F44336;
        cursor: pointer;
        font-size: 0.8em;
        padding: 2px 6px;
    }

    .emptyState {
        text-align: center;
        color: #888;
        margin: 3em 0;
    }

    .emptyState p {
        margin: 0.5em 0;
    }

    .note {
        text-align: center;
        font-size: 0.75em;
        color: #999;
        margin-top: 2em;
    }
</style>

<div class="mediaWrapper">
    <h2>League Memory Wall</h2>
    <p class="description">Share photos, videos, and highlights with fellow league members</p>

    <button class="addBtn" onclick={() => showForm = !showForm}>
        {showForm ? 'Cancel' : '+ Add Memory'}
    </button>

    {#if showForm}
        <div class="formOverlay">
            <h3>Add a Memory</h3>
            <div class="formGroup">
                <label for="memTitle">Title</label>
                <input id="memTitle" type="text" bind:value={newTitle} placeholder="Draft Night 2024" />
            </div>
            <div class="formGroup">
                <label for="memType">Type</label>
                <select id="memType" bind:value={newType}>
                    <option value="photo">Photo</option>
                    <option value="video">Video (YouTube/Vimeo)</option>
                </select>
            </div>
            <div class="formGroup">
                <label for="memUrl">URL</label>
                <input id="memUrl" type="url" bind:value={newUrl} placeholder={newType === 'video' ? 'https://youtube.com/watch?v=...' : 'https://i.imgur.com/...'} />
            </div>
            <div class="formGroup">
                <label for="memSeason">Season (optional)</label>
                <input id="memSeason" type="text" bind:value={newSeason} placeholder="2024" />
            </div>
            <div class="formGroup">
                <label for="memDesc">Caption (optional)</label>
                <textarea id="memDesc" bind:value={newDescription} placeholder="What happened here..."></textarea>
            </div>
            <div class="formActions">
                <button class="btnCancel" onclick={() => showForm = false}>Cancel</button>
                <button class="btnSave" onclick={addMemory}>Save</button>
            </div>
        </div>
    {/if}

    {#if memories.length > 0}
        <div class="mediaGrid">
            {#each memories as memory}
                <div class="memoryCard">
                    {#if memory.type === 'video' && getYoutubeEmbed(memory.url)}
                        <div class="memoryMedia">
                            <iframe src={getYoutubeEmbed(memory.url)} title={memory.title} allowfullscreen></iframe>
                        </div>
                    {:else if memory.type === 'video'}
                        <div class="memoryMedia">
                            <video src={memory.url} controls preload="metadata" style="width:100%;height:100%;object-fit:cover;"></video>
                        </div>
                    {:else}
                        <img class="memoryMedia" src={memory.url} alt={memory.title} loading="lazy" />
                    {/if}
                    <div class="memoryInfo">
                        <div class="title">{memory.title}</div>
                        {#if memory.description}
                            <div class="desc">{memory.description}</div>
                        {/if}
                        <div class="meta">
                            <span>{memory.season ? `Season ${memory.season}` : ''}</span>
                            <button class="removeBtn" onclick={() => removeMemory(memory.id)}>Remove</button>
                        </div>
                    </div>
                </div>
            {/each}
        </div>
    {:else}
        <div class="emptyState">
            <p>No memories shared yet.</p>
            <p>Add photos from draft nights, trophy ceremonies, or league events.</p>
            <p>Share YouTube links of memorable plays or league highlights.</p>
        </div>
    {/if}

    <p class="note">Memories are stored in your browser. Share links to images hosted on Imgur, Google Photos, or similar services.</p>
</div>
