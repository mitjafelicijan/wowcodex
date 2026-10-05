const Watchlist = {
    get() {
        const data = localStorage.getItem('wow-codex-watchlist');
        return data ? JSON.parse(data) : { quests: [], gear: [], crafting: [] };
    },

    save(data) {
        localStorage.setItem('wow-codex-watchlist', JSON.stringify(data));
    },

    /**
     * Toggles an item in the watchlist.
     * @param {string} type - 'quests', 'gear', or 'crafting'
     * @param {string|number} id - Unique ID for the item
     * @param {object} itemData - Full object data for rendering
     * @param {string} source - Context/Source info (e.g. Dungeon name)
     */
    toggle(type, id, itemData, source) {
        const data = this.get();
        const index = data[type].findIndex(i => i.id === id);

        if (index === -1) {
            data[type].push({ id, data: itemData, source });
        } else {
            data[type].splice(index, 1);
        }

        this.save(data);
        return index === -1; // returns true if added, false if removed
    },

    isWatched(type, id) {
        const data = this.get();
        return data[type].some(i => i.id === id);
    }
};

// Global export
window.Watchlist = Watchlist;
